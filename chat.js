const supabaseClient = window.yokoSupabase;
const params = new URLSearchParams(location.search);
const orderId = params.get('order') || '';
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
let currentUser = null;
let isStoreAdmin = false;
let refreshing = false;

function showNotice(message, isError = false) {
  const notice = $('#chat-notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
}

async function loadMessages() {
  if (!supabaseClient || refreshing) return;
  refreshing = true;
  const { data, error } = await supabaseClient.from('chat_messages')
    .select('id,sender_id,sender_role,body,created_at')
    .eq('order_id', orderId).order('created_at', { ascending: true }).limit(300);
  refreshing = false;
  if (error) { showNotice('შეტყობინებები ვერ ჩაიტვირთა. განაახლე გვერდი ან გადაამოწმე ჩატის SQL.', true); return; }
  const thread = $('#chat-thread');
  const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
  thread.innerHTML = data.length ? data.map((message) => {
    const mine = message.sender_id === currentUser.id;
    const sender = message.sender_role === 'admin' ? 'მაღაზია' : 'მყიდველი';
    return `<article class="chat-message ${mine ? 'mine' : ''}"><p>${escapeHtml(message.body)}</p><time><span class="chat-sender">${sender}</span> · ${escapeHtml(new Date(message.created_at).toLocaleString('ka-GE'))}</time></article>`;
  }).join('') : '<p class="chat-empty">ჯერ შეტყობინებები არ არის. შეგიძლია მოგვწერო.</p>';
  if (nearBottom) thread.scrollTop = thread.scrollHeight;
  showNotice('შეტყობინებები ახლდება ავტომატურად.');
}

async function initializeChat() {
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) { showNotice('შეკვეთის ბმული არასწორია.', true); return; }
  if (!supabaseClient) { showNotice('საიტის მონაცემთა ბაზასთან კავშირი ვერ შედგა.', true); return; }
  const { data: sessionData } = await supabaseClient.auth.getSession();
  currentUser = sessionData.session?.user || null;
  if (!currentUser) {
    showNotice('ჩათის სანახავად შედი იმ ანგარიშში, რომლითაც შეკვეთა გააკეთე.');
    $('#chat-login a').href = `index.html?view=login&next=chat&order=${encodeURIComponent(orderId)}`;
    $('#chat-login').hidden = false;
    return;
  }
  const [{ data: order, error: orderError }, { data: admin }] = await Promise.all([
    supabaseClient.from('orders').select('id,user_id,customer_name,items,total').eq('id', orderId).maybeSingle(),
    supabaseClient.from('store_admins').select('user_id').eq('user_id', currentUser.id).maybeSingle(),
  ]);
  if (orderError || !order || (order.user_id !== currentUser.id && !admin)) {
    showNotice('ამ შეკვეთის ჩათზე წვდომა არ გაქვს. შედი მყიდველის ან მაღაზიის მფლობელის ანგარიშით.', true);
    return;
  }
  isStoreAdmin = Boolean(admin);
  $('#chat-order').textContent = `შეკვეთა ${order.id.slice(0, 8)} · ${order.customer_name} · ${Number(order.total).toFixed(2)} ₾`;
  $('#chat-compose').hidden = false;
  $('#chat-message').placeholder = isStoreAdmin ? 'მყიდველს უპასუხე…' : 'დაწერე შეტყობინება…';
  await loadMessages();
  window.setInterval(() => { if (!document.hidden) loadMessages(); }, 5000);
}

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-message');
  const body = input.value.trim();
  if (!body || body.length > 2000) return;
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  const { error } = await supabaseClient.from('chat_messages').insert({
    order_id: orderId,
    sender_id: currentUser.id,
    sender_role: isStoreAdmin ? 'admin' : 'customer',
    body,
  });
  button.disabled = false;
  if (error) { showNotice('შეტყობინება ვერ გაიგზავნა. სცადე თავიდან.', true); return; }
  input.value = '';
  await loadMessages();
});

initializeChat();
