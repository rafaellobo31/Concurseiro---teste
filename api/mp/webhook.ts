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

function mapStatusToPlan(status: string): { plan: 'pro' | 'free'; plan_status: 'active' | 'past_due' | 'canceled' | 'inactive' } {
  const s = (status || '').toLowerCase();

  if (s === 'authorized') return { plan: 'pro', plan_status: 'active' };
  if (s === 'paused') return { plan: 'free', plan_status: 'past_due' };
  if (s === 'cancelled') return { plan: 'free', plan_status: 'canceled' };

  // pending / others: não promove, não remove, apenas mantém free/inactive
  return { plan: 'free', plan_status: 'inactive' };
}

export default async function handler(req: Request) {
  // Sempre responder JSON e sem cache
  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  if (req.method !== 'POST') return json({ ok: false, error: 'Método não permitido' }, 405);

  const accessTokenMP = process.env.MP_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessTokenMP) return json({ ok: false, error: 'MP_ACCESS_TOKEN ausente' }, 500);
  if (!supabaseUrl || !supabaseServiceKey) return json({ ok: false, error: 'Supabase Admin env ausente' }, 500);

  // Body do webhook (MP costuma enviar { type, data: { id } } )
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    // Se vier sem JSON, apenas ACK para evitar retry infinito
    return json({ ok: true, ignored: 'non_json_body' }, 200);
  }

  const type = payload?.type || payload?.action || '';
  const dataId = payload?.data?.id || payload?.id || null;

  if (!dataId) {
    // nada para processar, mas ACK
    return json({ ok: true, ignored: 'missing_data_id' }, 200);
  }

  // Consultar a assinatura real no MP (fonte da verdade)
  const mpUrl = `https://api.mercadopago.com/preapproval/${encodeURIComponent(String(dataId))}`;

  const mpRes = await fetch(mpUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessTokenMP}`,
      'Content-Type': 'application/json',
    },
  });

  const mpData = await safeReadJson(mpRes);

  if (!mpRes.ok) {
    console.error('[MP Webhook] Falha ao buscar preapproval:', mpRes.status, mpData);
    // ACK mesmo assim para evitar avalanche, mas registra erro
    return json({ ok: true, ignored: 'mp_fetch_failed', status: mpRes.status }, 200);
  }

  const preapprovalId = (mpData as any).id;
  const status = (mpData as any).status;
  const payerEmail = (mpData as any).payer_email || (mpData as any)?.payer?.email || null;
  const externalRef = (mpData as any).external_reference;

  const amount =
    (mpData as any)?.auto_recurring?.transaction_amount ??
    (mpData as any)?.auto_recurring?.transaction_amount ??
    19.99;

  const currency =
    (mpData as any)?.auto_recurring?.currency_id ??
    (mpData as any)?.auto_recurring?.currency_id ??
    'BRL';

  // external_reference precisa ser o UUID do usuário (user.id)
  if (!externalRef || typeof externalRef !== 'string') {
    console.error('[MP Webhook] external_reference ausente:', mpData);
    return json({ ok: true, ignored: 'missing_external_reference' }, 200);
  }

  const { plan, plan_status } = mapStatusToPlan(String(status || ''));

  // IMPORTANTÍSSIMO: Só atualiza plano quando status é um dos conhecidos.
  // Para pending/unknown: mantém free/inactive (mas ainda registra evento).
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: rpcError } = await supabaseAdmin.rpc('set_user_plan_from_mp', {
      p_user_id: externalRef,
      p_plan: plan,
      p_plan_status: plan_status,
      p_mp_preapproval_id: preapprovalId || String(dataId),
      p_payer_email: payerEmail,
      p_amount: Number(amount ?? 19.99),
      p_currency_id: String(currency ?? 'BRL'),
      p_status: String(status ?? ''),
      p_external_reference: externalRef,
      p_event_type: String(type ?? 'preapproval'),
      p_event_id: String(dataId),
    });

    if (rpcError) {
      console.error('[MP Webhook] RPC erro:', rpcError);
      // ACK para evitar retry infinito, mas loga
      return json({ ok: true, ignored: 'rpc_failed' }, 200);
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    console.error('[MP Webhook] Erro inesperado:', e);
    return json({ ok: true, ignored: 'unexpected_error' }, 200);
  }
}
