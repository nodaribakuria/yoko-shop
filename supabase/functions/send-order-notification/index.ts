import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
  if (!supabaseUrl || !serviceKey || !resendKey || !fromEmail) {
    return json(503, { error: 'Email notification is not configured' });
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Authentication required' });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: 'Invalid session' });

  let orderId: unknown;
  try {
    orderId = (await request.json()).orderId;
  } catch {
    return json(400, { error: 'Invalid request body' });
  }
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return json(400, { error: 'Invalid order ID' });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id,customer_name,customer_phone,customer_email,shipping_address,items,shipping_fee,total,payment_method,created_at')
    .eq('id', orderId)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (orderError || !order) return json(404, { error: 'Order not found' });

  const { data: admins, error: adminsError } = await supabase.from('store_admins').select('user_id');
  if (adminsError || !admins?.length) return json(503, { error: 'Store notification recipient is not configured' });

  const recipients: string[] = [];
  for (const admin of admins) {
    const { data } = await supabase.auth.admin.getUserById(admin.user_id);
    if (data.user?.email) recipients.push(data.user.email);
  }
  const uniqueRecipients = [...new Set(recipients)];
  if (!uniqueRecipients.length) return json(503, { error: 'Store notification recipient is not configured' });

  const items = Array.isArray(order.items) ? order.items : [];
  const itemLines = items.map((item: Record<string, unknown>) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return `${String(item.name ?? 'პროდუქტი')} × ${quantity} — ${(price * quantity).toFixed(2)} ₾`;
  });
  const htmlItems = items.map((item: Record<string, unknown>) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return `<li>${escapeHtml(item.name)} × ${quantity} — ${(price * quantity).toFixed(2)} ₾</li>`;
  }).join('');
  const total = `${Number(order.total).toFixed(2)} ₾`;
  const text = [
    `ახალი შეკვეთა #${order.id}`,
    `სახელი: ${order.customer_name}`,
    `ტელეფონი: ${order.customer_phone}`,
    `ელფოსტა: ${order.customer_email || 'მითითებული არ არის'}`,
    `მისამართი: ${order.shipping_address}`,
    'ნივთები:', ...itemLines,
    `მიწოდება: ${Number(order.shipping_fee) ? `${Number(order.shipping_fee).toFixed(2)} ₾` : 'უფასო'}`,
    `ჯამი: ${total}`,
  ].join('\n');
  const html = `<h2>ახალი შეკვეთა</h2><p><strong>შეკვეთის ნომერი:</strong> ${escapeHtml(order.id)}</p><p><strong>სახელი:</strong> ${escapeHtml(order.customer_name)}<br><strong>ტელეფონი:</strong> ${escapeHtml(order.customer_phone)}<br><strong>ელფოსტა:</strong> ${escapeHtml(order.customer_email || 'მითითებული არ არის')}<br><strong>მისამართი:</strong> ${escapeHtml(order.shipping_address)}</p><h3>ნივთები</h3><ul>${htmlItems}</ul><p>მიწოდება: ${Number(order.shipping_fee) ? `${Number(order.shipping_fee).toFixed(2)} ₾` : 'უფასო'}<br><strong>ჯამი: ${total}</strong></p>`;

  const mailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: uniqueRecipients,
      subject: `Yoko Shop — ახალი შეკვეთა ${String(order.id).slice(0, 8)}`,
      text,
      html,
    }),
  });
  if (!mailResponse.ok) {
    console.error('Resend rejected order notification:', mailResponse.status);
    return json(502, { error: 'Email provider rejected the notification' });
  }

  return json(200, { sent: true });
});
