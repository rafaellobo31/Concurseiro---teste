import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    const text = await response.text();
    return { _non_json: true, raw: text };
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const accessTokenMP = process.env.MP_ACCESS_TOKEN;
  if (!accessTokenMP) {
    return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN ausente" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: "Não autorizado: Token ausente" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const supabaseToken = authHeader.split(' ')[1];
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Configuração do Supabase Admin ausente" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(supabaseToken);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Sessão inválida ou expirada" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  try {
    const amount = Number(process.env.MP_PLAN_PRICE ?? 19.99);
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      return new Response(JSON.stringify({ error: "APP_URL não configurada" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessTokenMP}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${user.id}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: "Concurseiro PRO – 1 mês (PIX)",
        payment_method_id: "pix",
        payer: {
          email: user.email,
          first_name: user.user_metadata?.nickname || "Usuario",
          last_name: "Concurseiro"
        },
        external_reference: user.id,
        notification_url: `${appUrl}/api/mp/webhook`
      })
    });

    const mpData = await safeReadJson(mpResponse);

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago PIX:", mpData);
      return new Response(JSON.stringify({ error: "Falha ao criar pagamento PIX", details: mpData }), {
        status: mpResponse.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    const pointOfInteraction = mpData.point_of_interaction?.transaction_data;

    return new Response(JSON.stringify({
      payment_id: mpData.id,
      qr_code: pointOfInteraction?.qr_code,
      qr_code_base64: pointOfInteraction?.qr_code_base64,
      ticket_url: pointOfInteraction?.ticket_url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (error: any) {
    console.error("Erro no processamento do PIX:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro interno" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
}
