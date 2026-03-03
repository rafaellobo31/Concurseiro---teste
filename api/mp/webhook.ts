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
    return json({ ok: true, ignored: 'missing_data_id' }, 200);
  }

  let mpData: any = null;
  let plan: 'pro' | 'free' = 'free';
  let plan_status: 'active' | 'past_due' | 'canceled' | 'inactive' = 'inactive';
  let plan_source: 'card' | 'pix' = 'card';
  let preapprovalId: string | null = null;
  let lastPaymentId: string | null = null;
  let externalRef: string | null = null;
  let payerEmail: string | null = null;
  let amount: number = 19.99;
  let currency: string = 'BRL';
  let status: string = '';

  // Se for pagamento (PIX ou cartão avulso)
  if (type === 'payment' || payload?.resource?.includes('payments')) {
    const mpUrl = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(dataId))}`;
    const mpRes = await fetch(mpUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessTokenMP}` },
    });
    mpData = await safeReadJson(mpRes);
    if (!mpRes.ok) return json({ ok: true, ignored: 'mp_payment_fetch_failed' }, 200);

    status = mpData.status;
    externalRef = mpData.external_reference;
    payerEmail = mpData.payer?.email;
    amount = mpData.transaction_amount;
    currency = mpData.currency_id;
    lastPaymentId = String(mpData.id);
    plan_source = 'pix'; // Assumimos PIX para pagamentos diretos neste contexto

    if (status === 'approved') {
      plan = 'pro';
      plan_status = 'active';
    }
  } 
  // Se for assinatura (preapproval)
  else {
    const mpUrl = `https://api.mercadopago.com/preapproval/${encodeURIComponent(String(dataId))}`;
    const mpRes = await fetch(mpUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessTokenMP}` },
    });
    mpData = await safeReadJson(mpRes);
    if (!mpRes.ok) return json({ ok: true, ignored: 'mp_preapproval_fetch_failed' }, 200);

    status = mpData.status;
    externalRef = mpData.external_reference;
    payerEmail = mpData.payer_email || mpData?.payer?.email;
    amount = mpData?.auto_recurring?.transaction_amount ?? 19.99;
    currency = mpData?.auto_recurring?.currency_id ?? 'BRL';
    preapprovalId = String(mpData.id);
    plan_source = 'card';

    const mapped = mapStatusToPlan(String(status || ''));
    plan = mapped.plan;
    plan_status = mapped.plan_status;
  }

  if (!externalRef || typeof externalRef !== 'string') {
    console.error('[MP Webhook] external_reference ausente:', dataId);
    return json({ ok: true, ignored: 'missing_external_reference' }, 200);
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: rpcError } = await supabaseAdmin.rpc('set_user_plan_from_mp', {
      p_user_id: externalRef,
      p_plan: plan,
      p_plan_status: plan_status,
      p_plan_source: plan_source,
      p_mp_preapproval_id: preapprovalId,
      p_mp_last_payment_id: lastPaymentId,
      p_payer_email: payerEmail,
      p_amount: Number(amount),
      p_currency_id: String(currency),
      p_status: String(status ?? ''),
      p_external_reference: externalRef,
      p_event_type: String(type ?? 'webhook'),
      p_event_id: String(dataId),
    });

    if (rpcError) {
      console.error('[MP Webhook] RPC erro ao atualizar plano:', rpcError.message);
      // ACK para evitar retry infinito, mas loga
      return json({ ok: true, ignored: 'rpc_failed' }, 200);
    }

    console.log(`[MP Webhook] Plano atualizado: user=${externalRef}, status=${status}, plan=${plan}`);
    return json({ ok: true }, 200);
  } catch (e: any) {
    console.error('[MP Webhook] Erro inesperado no processamento:', e.message || e);
    return json({ ok: true, ignored: 'unexpected_error' }, 200);
  }
}
