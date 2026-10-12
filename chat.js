const supabaseClient = window.yokoSupabase;
const params = new URLSearchParams(location.search);
const requestedConversation = params.get('conversation') || '';
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const signedUrlCache = new Map();
let currentUser = null;
let isStoreAdmin = false;
let conversationId = '';
let refreshing = false;

function showNotice(message, isError = false) {
  const notice = $('#chat-notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
}

async function signedImage(path) {
  if (!path) return '';
  if (!signedUrlCache.has(path)) {
    const { data, error } = await supabaseClient.storage.from('chat-attachments').createSignedUrl(path, 3600);
    if (error) return '';
    signedUrlCache.set(path, data.signedUrl);
  }
  return signedUrlCache.get(path);
}

async function startConversation(conversation, customerView = false) {
  conversationId = conversation.id;
  $('#chat-order').textContent = customerView
    ? 'პირდაპირი საუბარი Yoko Shop-თან'
    : `${conversation.customer_name || 'მყიდველი'} · ${conversation.customer_email || conversation.customer_id.slice(0, 8)}`;
  $('#chat-panel').hidden = false;
  $('#chat-inbox').hidden = true;
  $('#chat-form').hidden = false;
  $('#chat-inbox-return').hidden = !isStoreAdmin;
  $('#chat-message').placeholder = isStoreAdmin ? 'მყიდველს უპასუხე…' : 'დაწერე შეტყობინება…';
  await loadMessages();
}

async function loadMessages() {
  if (!supabaseClient || !conversationId || refreshing) return;
  refreshing = true;
  let timeoutId;
  try {
    const query = supabaseClient.from('support_chat_messages')
      .select('id,sender_id,sender_role,body,attachment_path,created_at')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(300);
    const timeout = new Promise((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error('Chat request timed out')), 12000); });
    const { data, error } = await Promise.race([query, timeout]);
    if (error) { showNotice('შეტყობინებები ვერ ჩაიტვირთა. გადაამოწმე Supabase-ში ჩათის SQL და ფოტოებისთვის Storage წესები.', true); return; }
    const thread = $('#chat-thread');
    const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
    const entries = await Promise.all(data.map(async (message) => {
      const mine = message.sender_id === currentUser.id;
      const sender = message.sender_role === 'admin' ? 'მაღაზია' : 'მყიდველი';
      const photoUrl = await signedImage(message.attachment_path);
      const photo = photoUrl ? `<a class="chat-photo" href="${escapeHtml(photoUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(photoUrl)}" alt="ჩათში გამოგზავნილი ფოტო" loading="lazy"></a>` : '';
      return `<article class="chat-message ${mine ? 'mine' : ''}">${message.body ? `<p>${escapeHtml(message.body)}</p>` : ''}${photo}<time><span class="chat-sender">${sender}</span> · ${escapeHtml(new Date(message.created_at).toLocaleString('ka-GE'))}</time></article>`;
    }));
    thread.innerHTML = entries.length ? entries.join('') : '<p class="chat-empty">ჯერ შეტყობინებები არ არის. შეგიძლია მოგვწერო.</p>';
    if (nearBottom) thread.scrollTop = thread.scrollHeight;
    showNotice('შეტყობინებები ახლდება ავტომატურად.');
  } catch (error) {
    console.error('Chat messages could not be loaded:', error);
    showNotice('ჩატთან კავშირი ვერ შედგა. განაახლე გვერდი და სცადე ხელახლა.', true);
  } finally {
    window.clearTimeout(timeoutId);
    refreshing = false;
  }
}

async function loadAdminInbox() {
  showNotice('შემოსული ჩათები იტვირთება…');
  const { data: conversations, error } = await supabaseClient.from('chat_conversations')
    .select('id,customer_id,customer_name,customer_email,updated_at')
    .order('updated_at', { ascending: false }).limit(100);
  if (error) { showNotice('ჩათების სია ვერ ჩაიტვირთა. გადაამოწმე Supabase-ის ჩატის SQL.', true); return; }
  const messagesByConversation = new Map();
  if (conversations.length) {
    const { data: messages } = await supabaseClient.from('support_chat_messages')
      .select('conversation_id,body,attachment_path,created_at')
      .in('conversation_id', conversations.map((item) => item.id))
      .order('created_at', { ascending: false }).limit(100);
    for (const message of messages || []) if (!messagesByConversation.has(message.conversation_id)) messagesByConversation.set(message.conversation_id, message);
  }
  $('#chat-inbox-list').innerHTML = conversations.length ? conversations.map((conversation) => {
    const latest = messagesByConversation.get(conversation.id);
    const label = conversation.customer_name || conversation.customer_email || conversation.customer_id.slice(0, 8);
    const preview = latest?.body || (latest?.attachment_path ? '📷 ფოტო' : 'ჯერ შეტყობინება არ მოუწერია');
    return `<a class="chat-inbox-item" href="chat.html?conversation=${encodeURIComponent(conversation.id)}"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(conversation.customer_email || conversation.customer_id.slice(0, 8))}</small><span>${escapeHtml(preview)}</span></span><time>${escapeHtml(new Date(latest?.created_at || conversation.updated_at).toLocaleString('ka-GE'))}</time></a>`;
  }).join('') : '<p class="chat-empty">შემოსული ჩათები ჯერ არ არის.</p>';
  $('#chat-inbox').hidden = false;
  $('#chat-panel').hidden = true;
  showNotice('მომხმარებლების ჩათები. აირჩიე საუბარი პასუხის გასაცემად.');
}

async function initializeChat() {
  if (!supabaseClient) { showNotice('საიტის მონაცემთა ბაზასთან კავშირი ვერ შედგა.', true); return; }
  let sessionData;
  try { ({ data: sessionData } = await supabaseClient.auth.getSession()); }
  catch (error) { console.error('Could not read sign-in session:', error); showNotice('სერვერთან კავშირი ვერ შედგა. გვერდი ხელახლა გახსენი.', true); return; }
  currentUser = sessionData.session?.user || null;
  if (!currentUser) {
    showNotice('ჩათის გამოსაყენებლად შედი შენს ანგარიშში.');
    $('#chat-login a').href = `index.html?view=login&next=chat${requestedConversation ? `&conversation=${encodeURIComponent(requestedConversation)}` : ''}`;
    $('#chat-login').hidden = false;
    return;
  }
  const { data: admin } = await supabaseClient.from('store_admins').select('user_id').eq('user_id', currentUser.id).maybeSingle();
  isStoreAdmin = Boolean(admin);
  if (isStoreAdmin && !requestedConversation) {
    await loadAdminInbox();
    window.setInterval(() => { if (!document.hidden) loadAdminInbox(); }, 10000);
    return;
  }
  if (requestedConversation) {
    const { data: conversation, error } = await supabaseClient.from('chat_conversations')
      .select('id,customer_id,customer_name,customer_email').eq('id', requestedConversation).maybeSingle();
    if (error || !conversation || (!isStoreAdmin && conversation.customer_id !== currentUser.id)) {
      showNotice('ამ ჩათზე წვდომა არ გაქვს. შედი მყიდველის ან მაღაზიის მფლობელის ანგარიშით.', true);
      return;
    }
    await startConversation(conversation, !isStoreAdmin);
  } else {
    const { data: id, error } = await supabaseClient.rpc('get_or_create_chat_conversation');
    if (error || !id) { showNotice('ჩათის გახსნა ვერ მოხერხდა. გადაამოწმე Supabase-ის ჩატის SQL.', true); return; }
    await startConversation({ id }, true);
  }
  window.setInterval(() => { if (!document.hidden) loadMessages(); }, 5000);
}

$('#chat-photo').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  $('#chat-file-name').textContent = file ? file.name : 'ფოტო არ არის არჩეული';
});

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-message');
  const body = input.value.trim();
  const file = $('#chat-photo').files?.[0] || null;
  if ((!body && !file) || body.length > 2000) return;
  if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
    showNotice('აირჩიე JPG, PNG, WEBP ან GIF ფოტო, მაქსიმუმ 5 მბ.', true); return;
  }
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  let attachmentPath = null;
  try {
    if (file) {
      showNotice('ფოტო იტვირთება…');
      const extension = ({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' })[file.type];
      attachmentPath = `${conversationId}/${currentUser.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabaseClient.storage.from('chat-attachments').upload(attachmentPath, file, { contentType: file.type, upsert: false });
      if (uploadError) { showNotice('ფოტო ვერ აიტვირთა. გადაამოწმე Supabase-ში chat-attachments Storage bucket და წესები.', true); return; }
    }
    const { error } = await supabaseClient.from('support_chat_messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      sender_role: isStoreAdmin ? 'admin' : 'customer',
      body,
      attachment_path: attachmentPath,
    });
    if (error) {
      if (attachmentPath) await supabaseClient.storage.from('chat-attachments').remove([attachmentPath]);
      showNotice('შეტყობინება ვერ გაიგზავნა. გადაამოწმე Supabase-ში ჩატის SQL და ფოტოებისთვის Storage წესები.', true); return;
    }
    input.value = '';
    $('#chat-photo').value = '';
    $('#chat-file-name').textContent = 'ფოტო არ არის არჩეული';
    if (attachmentPath) signedUrlCache.delete(attachmentPath);
    await loadMessages();
  } catch (error) {
    console.error('Chat message could not be sent:', error);
    showNotice('შეტყობინება ვერ გაიგზავნა. გადაამოწმე კავშირი და სცადე თავიდან.', true);
  } finally { button.disabled = false; }
});

initializeChat();
