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

  if (!user.email) {
    return new Response(JSON.stringify({ error: "Usuário sem email. Não é possível criar assinatura." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  try {
    const amount = Number(process.env.MP_PLAN_PRICE ?? 0.10);
    const currency = process.env.MP_CURRENCY ?? "BRL";
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      return new Response(JSON.stringify({ error: "APP_URL não configurada" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessTokenMP}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: "Concurseiro PRO – Assinatura Mensal",
        external_reference: user.id,
        payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: currency
        },
        back_url: `${appUrl}/assinatura/retorno`,
        notification_url: `${appUrl}/api/mp/webhook`,
        status: "pending"
      })
    });

    const mpData = await safeReadJson(mpResponse);

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", mpData);
      return new Response(JSON.stringify({ error: "Falha ao criar assinatura no Mercado Pago", details: mpData }), {
        status: mpResponse.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    return new Response(JSON.stringify({
      init_point: (mpData as any).init_point,
      preapproval_id: (mpData as any).id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (error: any) {
    console.error("Erro no processamento da assinatura:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro interno" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
}
