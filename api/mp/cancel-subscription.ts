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
    // Buscar mp_preapproval_id no profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('mp_preapproval_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.mp_preapproval_id) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada ou usuário não é PRO via cartão" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    const preapprovalId = profile.mp_preapproval_id;

    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessTokenMP}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: "cancelled"
      })
    });

    const mpData = await safeReadJson(mpResponse);

    if (!mpResponse.ok) {
      console.error("Erro ao cancelar no Mercado Pago:", mpData);
      return new Response(JSON.stringify({ error: "Falha ao cancelar assinatura no Mercado Pago", details: mpData }), {
        status: mpResponse.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    // Atualizar profile para status 'canceled'
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ plan_status: 'canceled', plan_source: 'card' })
      .eq('id', user.id);

    if (updateError) {
      console.error("Erro ao atualizar profile após cancelamento:", updateError);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (error: any) {
    console.error("Erro no cancelamento da assinatura:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro interno" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
}
