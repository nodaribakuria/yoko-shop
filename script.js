const defaultProducts = [
  {id:9,name:'DOMINA 1023 — ლაქის ჩექმები',category:'ტანსაცმელი',price:200,oldPrice:360,badge:'−44%',featured:0,image:'domina-1023.png',alt:'წითელი ლაქის მაღალქუსლიანი ჩექმები'},
  {id:1,name:'კლასიკური ტრენჩი',category:'ტანსაცმელი',price:189,oldPrice:null,badge:'ახალი',featured:1,image:'',alt:'ღია ფერის ტრენჩი'},
  {id:2,name:'ყოველდღიური ტოტე',category:'აქსესუარები',price:95,oldPrice:120,badge:'−20%',featured:2,image:'',alt:'ყავისფერი ყოველდღიური ჩანთა'},
  {id:3,name:'ქსოვილის პერანგი',category:'ტანსაცმელი',price:115,oldPrice:null,badge:'ბესტსელერი',featured:3,image:'',alt:'თეთრი ქსოვილის პერანგი'},
  {id:4,name:'მინიმალისტური საათი',category:'აქსესუარები',price:149,oldPrice:null,badge:'ახალი',featured:4,image:'',alt:'მინიმალისტური მაჯის საათი'},
  {id:5,name:'რბილი ნაქსოვი სვიტერი',category:'ტანსაცმელი',price:139,oldPrice:null,badge:'',featured:5,image:'',alt:'ნაქსოვი ღია ფერის სვიტერი'},
  {id:6,name:'ყავის ჭიქა — Terra',category:'ნივთები',price:38,oldPrice:null,badge:'ხელნაკეთი',featured:6,image:'',alt:'კერამიკის ყავის ჭიქა'},
  {id:7,name:'სათვალე Soleil',category:'აქსესუარები',price:72,oldPrice:null,badge:'',featured:7,image:'',alt:'მზის სათვალე'},
  {id:8,name:'სურნელოვანი სანთელი',category:'ნივთები',price:45,oldPrice:null,badge:'',featured:8,image:'',alt:'სურნელოვანი სანთელი'}
];

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const money = amount => `${amount.toLocaleString('ka-GE')} ₾`;
const shippingFor = subtotal => subtotal >= 150 ? 0 : 10;
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const supabaseClient = window.yokoSupabase;
const savedProducts = readStored('yoko-products', []);
let products = [...defaultProducts, ...(Array.isArray(savedProducts) ? savedProducts.map(product => ({...product, image:product.image?.includes('images.unsplash.com') ? '' : product.image})) : [])];
let activeFilter = 'ყველა';
let searchTerm = '';
let showOnlyFavorites = false;
let cart = readStored('yoko-cart', []);
let favorites = readStored('yoko-favorites', []);
let profile = null;
let isStoreAdmin = false;
let toastTimer;

function renderProducts(){
  let visible = products.filter(product => (!showOnlyFavorites || favorites.includes(product.id)) && (activeFilter === 'ყველა' || product.category === activeFilter) && `${product.name} ${product.category}`.toLocaleLowerCase('ka').includes(searchTerm.toLocaleLowerCase('ka')));
  const sort = $('#sort-products').value;
  if(sort === 'price-low') visible.sort((a,b)=>a.price-b.price);
  else if(sort === 'price-high') visible.sort((a,b)=>b.price-a.price);
  else if(sort === 'newest') visible.sort((a,b)=>b.id-a.id);
  else visible.sort((a,b)=>a.featured-b.featured);
  $('#product-grid').innerHTML = visible.map(product => `<article class="product-card"><div class="product-image-wrap">${product.image?`<img class="product-image ${product.id===9?'product-image-contained':''}" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}" loading="lazy" />`:'<div class="product-placeholder" aria-hidden="true"></div>'}${product.badge?`<span class="product-badge">${escapeHtml(product.badge)}</span>`:''}<button class="product-wish ${favorites.includes(product.id)?'active':''}" data-wish="${product.id}" aria-label="${favorites.includes(product.id)?'რჩეულებიდან ამოღება':'რჩეულებში დამატება'}">${favorites.includes(product.id)?'♥':'♡'}</button><button class="add-button" data-add="${product.id}">კალათაში დამატება ＋</button></div><div class="product-info"><div><h3>${escapeHtml(product.name)}</h3><span class="product-category">${escapeHtml(product.category)}</span></div><div class="product-price">${product.oldPrice?`<span class="old-price">${money(product.oldPrice)}</span>`:''}${money(product.price)}</div></div></article>`).join('');
  $('#result-count').textContent = visible.length;
  $('#no-results').hidden = visible.length > 0;
}

function persistCart(){localStorage.setItem('yoko-cart',JSON.stringify(cart));renderCart()}
function renderCart(){
  cart = cart.filter(item => products.some(product => product.id === item.id));
  const count = cart.reduce((sum,item)=>sum+item.qty,0);
  const subtotal = cart.reduce((sum,item)=>sum+products.find(product=>product.id===item.id).price*item.qty,0);
  const shipping = count ? shippingFor(subtotal) : 0;
  $('#cart-count').textContent = count;
  $('#drawer-count').textContent = `(${count})`;
  $('#cart-subtotal').textContent = money(subtotal);
  $('#cart-shipping').textContent = shipping ? money(shipping) : 'უფასო';
  $('#cart-total').textContent = money(subtotal + shipping);
  $('#cart-items').innerHTML = cart.map(item=>{const product=products.find(product=>product.id===item.id);return `<div class="cart-row">${product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}"/>`:'<div class="cart-image-placeholder" aria-hidden="true"></div>'}<div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)}</p><div class="qty-control"><button data-qty="${product.id}" data-change="-1" aria-label="რაოდენობის შემცირება">−</button><span>${item.qty}</span><button data-qty="${product.id}" data-change="1" aria-label="რაოდენობის გაზრდა">＋</button></div></div><span class="cart-row-price">${money(product.price*item.qty)}</span></div>`}).join('');
  const empty = count===0;
  $('#cart-empty').classList.toggle('show',empty);
  $('#cart-footer').classList.toggle('hidden',empty);
  const remaining = Math.max(0,150-subtotal);
  $('#shipping-message').textContent = count ? (remaining ? `კიდევ ${money(remaining)} და მიწოდება უფასოა` : 'გილოცავ! მიწოდება უფასოა') : '150 ₾-დან მიწოდება უფასოა';
  $('#shipping-bar').style.width = `${Math.min(100,subtotal/150*100)}%`;
}

function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2100)}
function openCart(){ $('#cart-drawer').classList.add('open');$('#cart-drawer').setAttribute('aria-hidden','false');$('#scrim').classList.add('active');document.body.style.overflow='hidden';$('#close-cart').focus() }
function closeCart(){ $('#cart-drawer').classList.remove('open');$('#cart-drawer').setAttribute('aria-hidden','true');$('#scrim').classList.remove('active');document.body.style.overflow='' }
function renderProfile(){
  const hasProfile = Boolean(profile);
  $('#profile-register-panel').hidden = hasProfile;
  $('#profile-dashboard').hidden = !hasProfile;
  if(!hasProfile) return;
  $('#profile-name').textContent = profile.name;
  $('#profile-email').textContent = profile.email;
  $('#store-admin-panel').hidden = !isStoreAdmin;
  $('#store-customer-note').hidden = isStoreAdmin;
  $('#customer-orders-panel').hidden = isStoreAdmin;
  if(!isStoreAdmin) return;
  const ownedProducts = products.filter(product => product.owner === profile.id || product.owner === profile.email);
  $('#profile-product-count').textContent = `(${ownedProducts.length})`;
  $('#profile-product-list').innerHTML = ownedProducts.length ? ownedProducts.map(product => `<div class="profile-listing"><div><strong>${escapeHtml(product.name)}</strong><span>${money(product.price)} · ${escapeHtml(product.category)}</span></div><button type="button" data-remove-product="${product.id}">წაშლა</button></div>`).join('') : '<p class="profile-empty-list">ჯერ პროდუქტი არ დაგიმატებია.</p>';
}

function mapServerProduct(row){return {id:Number(row.id),name:row.name,category:row.category,price:Number(row.price),oldPrice:row.old_price===null?null:Number(row.old_price),badge:row.badge||'ახალი',featured:Number(row.created_at?new Date(row.created_at).getTime():row.id),image:row.image_url||'',imagePath:row.image_path||'',alt:row.alt||row.name,owner:row.user_id,remote:true}}
function saveOwnedProducts(){localStorage.setItem('yoko-products',JSON.stringify(products.filter(product=>product.owner&&!product.remote)))}
async function loadStoreAdmin(userId){
  isStoreAdmin=false;
  const {data,error}=await supabaseClient.from('store_admins').select('user_id').eq('user_id',userId).maybeSingle();
  if(error){console.error('Store admin access could not be checked:',error.message);return false}
  isStoreAdmin=Boolean(data);
  return isStoreAdmin;
}

async function uploadProductImage(file){
  if(!file)return {url:'',path:''};
  const allowed=['image/jpeg','image/png','image/webp','image/gif'];
  if(!allowed.includes(file.type))throw new Error('ფოტო უნდა იყოს JPG, PNG, WebP ან GIF ფორმატში.');
  if(file.size>5*1024*1024)throw new Error('ფოტოს ზომა 5 MB-ს არ უნდა აღემატებოდეს.');
  const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80)||'photo';
  const path=`${profile.id}/${Date.now()}-${safeName}`;
  const {error}=await supabaseClient.storage.from('product-images').upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
  if(error)throw new Error('ფოტოს ატვირთვა ვერ მოხერხდა.');
  const {data}=supabaseClient.storage.from('product-images').getPublicUrl(path);
  return {url:data.publicUrl,path};
}

$('#open-profile').addEventListener('click',async()=>{if(!supabaseClient){location.href='index.html?view=login';return}const {data}=await supabaseClient.auth.getSession();if(!data.session){location.href='index.html?view=login';return}profile={id:data.session.user.id,name:data.session.user.user_metadata.full_name||data.session.user.email,email:data.session.user.email,phone:data.session.user.user_metadata.phone||''};await loadStoreAdmin(profile.id);renderProfile();if(isStoreAdmin)await loadAdminOrders();else await loadCustomerOrders();$('#profile-dialog').showModal()});
$('#profile-logout').addEventListener('click',async()=>{if(supabaseClient)await supabaseClient.auth.signOut({scope:'local'});location.href='index.html?view=login'});

const productImageInput=$('#product-image-file');
let productPreviewUrl='';
productImageInput.addEventListener('change',()=>{
  if(productPreviewUrl)URL.revokeObjectURL(productPreviewUrl);
  const file=productImageInput.files[0];
  const preview=$('#product-image-preview');
  if(!file){preview.hidden=true;preview.innerHTML='';return}
  productPreviewUrl=URL.createObjectURL(file);
  preview.innerHTML=`<img src="${productPreviewUrl}" alt="არჩეული პროდუქტის ფოტო" />`;
  preview.hidden=false;
});

$('#product-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!profile||!supabaseClient||!isStoreAdmin){showToast('პროდუქტის დამატება მხოლოდ მაღაზიის მფლობელს შეუძლია');return}
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name')).trim();
  const category = String(data.get('category'));
  const price = Number(data.get('price'));
  if(!name || !Number.isFinite(price) || price <= 0){showToast('შეამოწმე პროდუქტის სახელი და ფასი');return}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  let uploaded=null;
  try{
    uploaded=await uploadProductImage(productImageInput.files[0]);
    const row={id:Date.now(),user_id:profile.id,name,category,price,old_price:null,badge:'ახალი',image_url:uploaded.url,image_path:uploaded.path,alt:name};
    const {data:created,error}=await supabaseClient.from('products').insert(row).select().single();
    if(error)throw new Error('პროდუქტის შენახვა ვერ მოხერხდა.');
    products.push(mapServerProduct(created));
    form.reset();if(productPreviewUrl)URL.revokeObjectURL(productPreviewUrl);productPreviewUrl='';$('#product-image-preview').hidden=true;$('#product-image-preview').innerHTML='';
    renderProducts();renderProfile();showToast('პროდუქტი და ფოტო საიტზე აიტვირთა');
  }catch(error){if(uploaded?.path)await supabaseClient.storage.from('product-images').remove([uploaded.path]);showToast(error.message||'ატვირთვა ვერ მოხერხდა')}
  finally{button.disabled=false}
});

$('#profile-product-list').addEventListener('click',async event=>{
  const button = event.target.closest('[data-remove-product]');
  if(!button) return;
  if(!isStoreAdmin){showToast('პროდუქტის წაშლა მხოლოდ მაღაზიის მფლობელს შეუძლია');return}
  const id = Number(button.dataset.removeProduct);
  const product=products.find(item=>item.id===id);
  if(product?.remote){
    const {error}=await supabaseClient.from('products').delete().eq('id',id);
    if(error){showToast('პროდუქტის წაშლა ვერ მოხერხდა');return}
    if(product.imagePath)await supabaseClient.storage.from('product-images').remove([product.imagePath]);
  }
  products = products.filter(product=>product.id!==id);
  cart = cart.filter(item=>item.id!==id);
  favorites = favorites.filter(item=>item!==id);
  localStorage.setItem('yoko-favorites',JSON.stringify(favorites));
  saveOwnedProducts();persistCart();renderProducts();renderProfile();showToast('პროდუქტი წაიშალა');
});

$('#product-grid').addEventListener('click',event=>{
  const add=event.target.closest('[data-add]');
  const wish=event.target.closest('[data-wish]');
  if(add){const id=Number(add.dataset.add);const existing=cart.find(item=>item.id===id);existing?existing.qty++:cart.push({id,qty:1});persistCart();showToast('პროდუქტი კალათაში დაემატა');}
  if(wish){const id=Number(wish.dataset.wish);favorites=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];localStorage.setItem('yoko-favorites',JSON.stringify(favorites));renderProducts();showToast(favorites.includes(id)?'დაემატა რჩეულებში':'ამოიშალა რჩეულებიდან');}
});
$('#cart-items').addEventListener('click',event=>{const button=event.target.closest('[data-qty]');if(!button)return;const item=cart.find(entry=>entry.id===Number(button.dataset.qty));item.qty+=Number(button.dataset.change);if(item.qty<=0)cart=cart.filter(entry=>entry.id!==item.id);persistCart()});
$('.filter-list').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;showOnlyFavorites=false;activeFilter=button.dataset.filter;$$('.filter-chip').forEach(chip=>chip.classList.toggle('active',chip===button));renderProducts()});
$$('.category-card').forEach(button=>button.addEventListener('click',()=>{showOnlyFavorites=false;activeFilter=button.dataset.category;$$('.filter-chip').forEach(chip=>chip.classList.toggle('active',chip.dataset.filter===activeFilter));renderProducts();$('#shop').scrollIntoView({behavior:'smooth'})}));
$('#product-search').addEventListener('input',event=>{searchTerm=event.target.value;renderProducts()});
$('#sort-products').addEventListener('change',renderProducts);
$('#show-all').addEventListener('click',()=>{showOnlyFavorites=false;activeFilter='ყველა';searchTerm='';$('#product-search').value='';$$('.filter-chip').forEach(chip=>chip.classList.toggle('active',chip.dataset.filter==='ყველა'));renderProducts()});
$('#open-cart').addEventListener('click',openCart);$('#close-cart').addEventListener('click',closeCart);$('#scrim').addEventListener('click',closeCart);$('#continue-shopping').addEventListener('click',closeCart);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCart()});
$('.search-toggle').addEventListener('click',()=>{$('#shop').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('#product-search').focus(),450)});
$('.wishlist-shortcut').addEventListener('click',()=>{showOnlyFavorites=true;activeFilter='ყველა';searchTerm='';$('#product-search').value='';renderProducts();$('#shop').scrollIntoView({behavior:'smooth'});showToast(favorites.length?`რჩეულებში ${favorites.length} პროდუქტია`:'რჩეულებში ჯერ პროდუქტი არ არის')});
$('.menu-toggle').addEventListener('click',()=>{const existing=$('.mobile-nav');if(existing){existing.remove();return}const nav=document.createElement('nav');nav.className='mobile-nav';nav.innerHTML='<a href="#shop">მაღაზია</a><a href="#categories">კატეგორიები</a><a href="#story">ჩვენ შესახებ</a>';$('.site-header').after(nav);nav.addEventListener('click',event=>{if(event.target.closest('a'))nav.remove()})});
async function requireProfileForPurchase(){
  if(!supabaseClient){showToast('შეკვეთის გასაფორმებლად მომხმარებლის ანგარიშია საჭირო');location.href='index.html?view=login&next=checkout';return false}
  const {data,error}=await supabaseClient.auth.getSession();
  if(error||!data.session){location.href='index.html?view=login&next=checkout';return false}
  const user=data.session.user;
  profile={id:user.id,name:user.user_metadata.full_name||user.email,email:user.email,phone:user.user_metadata.phone||''};
  return true;
}
function updateCheckoutSummary(){
  const subtotal=cart.reduce((sum,item)=>sum+(products.find(product=>product.id===item.id)?.price||0)*item.qty,0);
  const shipping=cart.length?shippingFor(subtotal):0;
  $('#checkout-subtotal').textContent=money(subtotal);
  $('#checkout-shipping').textContent=shipping?money(shipping):'უფასო';
  $('#checkout-total').textContent=money(subtotal+shipping);
}
function prefillCheckout(){
  const nameField=$('#checkout-form [name="name"]');
  const phoneField=$('#checkout-form [name="phone"]');
  if(profile?.name&&!nameField.value&&profile.name!==profile.email)nameField.value=profile.name;
  if(profile?.phone&&!phoneField.value)phoneField.value=profile.phone;
  updateCheckoutSummary();
}
$('#checkout-button').addEventListener('click',async()=>{if(!cart.length){showToast('კალათა ცარიელია');return}if(!await requireProfileForPurchase())return;prefillCheckout();$('#checkout-dialog').showModal()});
$('#checkout-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!await requireProfileForPurchase())return;
  if(!cart.length){showToast('კალათა ცარიელია');return}
  const submitButton=$('#checkout-form button[type="submit"]');
  submitButton.disabled=true;
  try{
    const values=new FormData(event.currentTarget);
    const paymentMethod=String(values.get('paymentMethod')||'cash_on_delivery');
    if(paymentMethod!=='cash_on_delivery')throw new Error('ონლაინ ბარათით გადახდა ჯერ არ არის ჩართული. აირჩიე მიტანისას გადახდა.');
    const orderItems=cart.map(item=>({id:item.id,quantity:item.qty}));
    const {data,error}=await supabaseClient.rpc('place_order',{p_customer_name:String(values.get('name')).trim(),p_customer_phone:String(values.get('phone')).trim(),p_shipping_address:String(values.get('address')).trim(),p_items:orderItems});
    if(error)throw new Error('შეკვეთა ვერ შეინახა. გადაამოწმე Supabase-ის განახლებული SQL და სცადე ხელახლა.');
    $('#order-confirmation-number').textContent=`შეკვეთის ნომერი: ${data}`;
    $('#checkout-form').hidden=true;$('.checkout-note').hidden=true;$('#order-confirmation').hidden=false;cart=[];persistCart();
  }catch(error){showToast(error.message||'შეკვეთა ვერ შეინახა')}
  finally{submitButton.disabled=false}
});
$('#finish-order').addEventListener('click',()=>{$('#checkout-dialog').close();$('#checkout-form').reset();$('#checkout-form').hidden=false;$('.checkout-note').hidden=false;$('#order-confirmation').hidden=true;closeCart()});

async function loadAdminOrders(){
  if(!supabaseClient||!isStoreAdmin)return;
  const message=$('#store-orders-message');
  message.textContent='შეკვეთები იტვირთება…';
  const {data,error}=await supabaseClient.from('orders').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){message.textContent='შეკვეთების ჩატვირთვა ვერ მოხერხდა. გადაამოწმე, რომ Supabase-ის განახლებული SQL დაყენებულია.';$('#store-order-list').innerHTML='';return}
  message.textContent=data.length?`ბოლო ${data.length} შეკვეთა`:'შეკვეთები ჯერ არ არის.';
  $('#store-order-list').innerHTML=data.map(order=>{
    const lines=(Array.isArray(order.items)?order.items:[]).map(item=>`<li>${escapeHtml(item.name)} × ${Number(item.quantity)||0} — ${money(Number(item.unit_price||0)*(Number(item.quantity)||0))}</li>`).join('');
    const date=new Date(order.created_at).toLocaleString('ka-GE');
    const options=['ახალი','დამუშავებაში','გაგზავნილი','დასრულებული','გაუქმებული'].map(status=>`<option value="${status}" ${order.status===status?'selected':''}>${status}</option>`).join('');
    const shippingFee=Number(order.shipping_fee)||0;
    return `<article class="store-order"><div class="store-order-heading"><strong>${escapeHtml(order.customer_name)}</strong><span>${escapeHtml(order.status)}</span></div><p>${escapeHtml(order.customer_phone)} · ${escapeHtml(order.customer_email||'ელფოსტა არ არის მითითებული')} · ${escapeHtml(order.shipping_address)}</p><ul>${lines}</ul><p class="store-order-shipping">მიწოდება: ${shippingFee?money(shippingFee):'უფასო'} · ${order.payment_method==='cash_on_delivery'?'მიტანისას გადახდა':'ონლაინ ბარათი'}</p><div class="store-order-total"><time>${escapeHtml(date)}</time><strong>${money(Number(order.total)||0)}</strong></div><small class="store-order-id">${escapeHtml(order.id)}</small><form class="store-order-status-form" data-order-id="${escapeHtml(order.id)}"><label>შეკვეთის სტატუსი<select name="status">${options}</select></label><button type="submit" class="button button-outline">შენახვა</button></form></article>`;
  }).join('');
}
$('#refresh-orders').addEventListener('click',loadAdminOrders);
$('#store-order-list').addEventListener('submit',async event=>{
  const form=event.target.closest('.store-order-status-form');
  if(!form)return;
  event.preventDefault();
  if(!isStoreAdmin)return;
  const button=form.querySelector('button');
  button.disabled=true;
  const {error}=await supabaseClient.from('orders').update({status:form.elements.status.value}).eq('id',form.dataset.orderId);
  if(error)showToast('სტატუსი ვერ შეინახა. გადაამოწმე Supabase-ის განახლებული SQL.');
  else{showToast('შეკვეთის სტატუსი განახლდა');await loadAdminOrders()}
  button.disabled=false;
});
async function loadCustomerOrders(){
  if(!supabaseClient||!profile)return;
  const message=$('#customer-orders-message');
  message.textContent='შეკვეთები იტვირთება…';
  const {data,error}=await supabaseClient.from('orders').select('id,items,total,shipping_fee,payment_method,status,created_at').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(50);
  if(error){message.textContent='შეკვეთების ისტორია ვერ ჩაიტვირთა.';$('#customer-order-list').innerHTML='';return}
  message.textContent=data.length?`შენი შეკვეთები: ${data.length}`:'შეკვეთები ჯერ არ გაქვს.';
  $('#customer-order-list').innerHTML=data.map(order=>{
    const lines=(Array.isArray(order.items)?order.items:[]).map(item=>`<li>${escapeHtml(item.name)} × ${Number(item.quantity)||0} — ${money(Number(item.unit_price||0)*(Number(item.quantity)||0))}</li>`).join('');
    const shippingFee=Number(order.shipping_fee)||0;
    return `<article class="store-order"><div class="store-order-heading"><strong>შეკვეთა ${escapeHtml(order.id.slice(0,8))}</strong><span>${escapeHtml(order.status)}</span></div><ul>${lines}</ul><p class="store-order-shipping">მიწოდება: ${shippingFee?money(shippingFee):'უფასო'} · ${order.payment_method==='cash_on_delivery'?'მიტანისას გადახდა':'ონლაინ ბარათი'}</p><div class="store-order-total"><time>${escapeHtml(new Date(order.created_at).toLocaleString('ka-GE'))}</time><strong>${money(Number(order.total)||0)}</strong></div></article>`;
  }).join('');
}
$('#refresh-customer-orders').addEventListener('click',loadCustomerOrders);

async function initializeStore(){
  if(supabaseClient){
    const {data:sessionData}=await supabaseClient.auth.getSession();
    if(sessionData.session){
      const user=sessionData.session.user;
      profile={id:user.id,name:user.user_metadata.full_name||user.email,email:user.email,phone:user.user_metadata.phone||''};
      await loadStoreAdmin(profile.id);
    }
    const {data:rows,error}=await supabaseClient.from('products').select('*').order('created_at',{ascending:false});
    if(!error&&rows){const local=products.filter(product=>!product.remote&&!rows.some(row=>Number(row.id)===product.id));products=[...local,...rows.map(mapServerProduct)]}
  }
  renderProducts();renderCart();renderProfile();
  if(new URLSearchParams(location.search).get('checkout')==='1'&&profile&&cart.length){prefillCheckout();$('#checkout-dialog').showModal()}
}
initializeStore();
