const defaultProducts = [
  {id:9,name:'DOMINA 1023 — ლაქის ჩექმები',category:'ტანსაცმელი',price:200,oldPrice:360,badge:'−44%',featured:0,image:'domina-1023.png',alt:'წითელი ლაქის მაღალქუსლიანი ჩექმები'},
  {id:1,name:'კლასიკური ტრენჩი',category:'ტანსაცმელი',price:189,oldPrice:null,badge:'ახალი',featured:1,image:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=750&q=80',alt:'ღია ფერის ტრენჩი'},
  {id:2,name:'ყოველდღიური ტოტე',category:'აქსესუარები',price:95,oldPrice:120,badge:'−20%',featured:2,image:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=750&q=80',alt:'ყავისფერი ყოველდღიური ჩანთა'},
  {id:3,name:'ქსოვილის პერანგი',category:'ტანსაცმელი',price:115,oldPrice:null,badge:'ბესტსელერი',featured:3,image:'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=750&q=80',alt:'თეთრი ქსოვილის პერანგი'},
  {id:4,name:'მინიმალისტური საათი',category:'აქსესუარები',price:149,oldPrice:null,badge:'ახალი',featured:4,image:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=750&q=80',alt:'მინიმალისტური მაჯის საათი'},
  {id:5,name:'რბილი ნაქსოვი სვიტერი',category:'ტანსაცმელი',price:139,oldPrice:null,badge:'',featured:5,image:'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=750&q=80',alt:'ნაქსოვი ღია ფერის სვიტერი'},
  {id:6,name:'ყავის ჭიქა — Terra',category:'ნივთები',price:38,oldPrice:null,badge:'ხელნაკეთი',featured:6,image:'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=750&q=80',alt:'კერამიკის ყავის ჭიქა'},
  {id:7,name:'სათვალე Soleil',category:'აქსესუარები',price:72,oldPrice:null,badge:'',featured:7,image:'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=750&q=80',alt:'მზის სათვალე'},
  {id:8,name:'სურნელოვანი სანთელი',category:'ნივთები',price:45,oldPrice:null,badge:'',featured:8,image:'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=750&q=80',alt:'სურნელოვანი სანთელი'}
];

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const money = amount => `${amount.toLocaleString('ka-GE')} ₾`;
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const categoryImages = {
  'ტანსაცმელი':'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=750&q=80',
  'აქსესუარები':'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=750&q=80',
  'ნივთები':'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=750&q=80'
};
const savedProducts = readStored('yoko-products', []);
let products = [...defaultProducts, ...(Array.isArray(savedProducts) ? savedProducts : [])];
let activeFilter = 'ყველა';
let searchTerm = '';
let showOnlyFavorites = false;
let cart = readStored('yoko-cart', []);
let favorites = readStored('yoko-favorites', []);
let profile = readStored('yoko-profile', null);
let toastTimer;

function renderProducts(){
  let visible = products.filter(product => (!showOnlyFavorites || favorites.includes(product.id)) && (activeFilter === 'ყველა' || product.category === activeFilter) && `${product.name} ${product.category}`.toLocaleLowerCase('ka').includes(searchTerm.toLocaleLowerCase('ka')));
  const sort = $('#sort-products').value;
  if(sort === 'price-low') visible.sort((a,b)=>a.price-b.price);
  else if(sort === 'price-high') visible.sort((a,b)=>b.price-a.price);
  else if(sort === 'newest') visible.sort((a,b)=>b.id-a.id);
  else visible.sort((a,b)=>a.featured-b.featured);
  $('#product-grid').innerHTML = visible.map(product => `<article class="product-card"><div class="product-image-wrap"><img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}" loading="lazy" />${product.badge?`<span class="product-badge">${escapeHtml(product.badge)}</span>`:''}<button class="product-wish ${favorites.includes(product.id)?'active':''}" data-wish="${product.id}" aria-label="${favorites.includes(product.id)?'რჩეულებიდან ამოღება':'რჩეულებში დამატება'}">${favorites.includes(product.id)?'♥':'♡'}</button><button class="add-button" data-add="${product.id}">კალათაში დამატება ＋</button></div><div class="product-info"><div><h3>${escapeHtml(product.name)}</h3><span class="product-category">${escapeHtml(product.category)}</span></div><div class="product-price">${product.oldPrice?`<span class="old-price">${money(product.oldPrice)}</span>`:''}${money(product.price)}</div></div></article>`).join('');
  $('#result-count').textContent = visible.length;
  $('#no-results').hidden = visible.length > 0;
}

function persistCart(){localStorage.setItem('yoko-cart',JSON.stringify(cart));renderCart()}
function renderCart(){
  cart = cart.filter(item => products.some(product => product.id === item.id));
  const count = cart.reduce((sum,item)=>sum+item.qty,0);
  const total = cart.reduce((sum,item)=>sum+products.find(product=>product.id===item.id).price*item.qty,0);
  $('#cart-count').textContent = count;
  $('#drawer-count').textContent = `(${count})`;
  $('#cart-total').textContent = money(total);
  $('#cart-items').innerHTML = cart.map(item=>{const product=products.find(product=>product.id===item.id);return `<div class="cart-row"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}"/><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)}</p><div class="qty-control"><button data-qty="${product.id}" data-change="-1" aria-label="რაოდენობის შემცირება">−</button><span>${item.qty}</span><button data-qty="${product.id}" data-change="1" aria-label="რაოდენობის გაზრდა">＋</button></div></div><span class="cart-row-price">${money(product.price*item.qty)}</span></div>`}).join('');
  const empty = count===0;
  $('#cart-empty').classList.toggle('show',empty);
  $('#cart-footer').classList.toggle('hidden',empty);
  const remaining = Math.max(0,150-total);
  $('#shipping-message').textContent = remaining ? `კიდევ ${money(remaining)} და მიწოდება უფასოა` : 'გილოცავ! მიწოდება უფასოა';
  $('#shipping-bar').style.width = `${Math.min(100,total/150*100)}%`;
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
  const ownedProducts = products.filter(product => product.owner === profile.email);
  $('#profile-product-count').textContent = `(${ownedProducts.length})`;
  $('#profile-product-list').innerHTML = ownedProducts.length ? ownedProducts.map(product => `<div class="profile-listing"><div><strong>${escapeHtml(product.name)}</strong><span>${money(product.price)} · ${escapeHtml(product.category)}</span></div><button type="button" data-remove-product="${product.id}">წაშლა</button></div>`).join('') : '<p class="profile-empty-list">ჯერ პროდუქტი არ დაგიმატებია.</p>';
}

function safeImageUrl(value, category){
  if(!value) return categoryImages[category];
  try { const imageUrl = new URL(value); if(imageUrl.protocol === 'https:') return imageUrl.href; } catch {}
  return categoryImages[category];
}

function saveOwnedProducts(){localStorage.setItem('yoko-products',JSON.stringify(products.filter(product=>product.owner)))}

$('#open-profile').addEventListener('click',()=>{renderProfile();$('#profile-dialog').showModal()});
$('#profile-register-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  if(data.get('password') !== data.get('passwordConfirm')){showToast('პაროლები ერთმანეთს არ ემთხვევა');return}
  profile = {name:String(data.get('name')).trim(),email:String(data.get('email')).trim().toLocaleLowerCase('ka'),phone:String(data.get('phone')).trim()};
  localStorage.setItem('yoko-profile',JSON.stringify(profile));
  form.reset();renderProfile();showToast('პროფილი შეიქმნა ამ ბრაუზერში');
});

$('#product-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(!profile){showToast('პროდუქტის დასამატებლად შექმენი პროფილი');return}
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name')).trim();
  const category = String(data.get('category'));
  const price = Number(data.get('price'));
  if(!name || !Number.isFinite(price) || price <= 0){showToast('შეამოწმე პროდუქტის სახელი და ფასი');return}
  const id = Date.now();
  products.push({id,name,category,price,oldPrice:null,badge:'ახალი',featured:id,image:safeImageUrl(String(data.get('image')).trim(),category),alt:name,owner:profile.email});
  saveOwnedProducts();form.reset();renderProducts();renderProfile();showToast('პროდუქტი მაღაზიის კატალოგს დაემატა');
});

$('#profile-product-list').addEventListener('click',event=>{
  const button = event.target.closest('[data-remove-product]');
  if(!button) return;
  const id = Number(button.dataset.removeProduct);
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
$('#newsletter-form').addEventListener('submit',event=>{event.preventDefault();$('#newsletter-message').textContent='მადლობა გამოწერისთვის! სიახლე მალე შეგხვდება.';$('#newsletter-email').value=''});
function requireProfileForPurchase(){if(profile&&profile.name&&profile.email)return true;window.location.href='index.html';return false}
$('#checkout-button').addEventListener('click',()=>{if(!requireProfileForPurchase())return;$('#checkout-dialog').showModal()});
$('#checkout-form').addEventListener('submit',event=>{event.preventDefault();if(!requireProfileForPurchase())return;$('#checkout-form').hidden=true;$('.checkout-note').hidden=true;$('#order-confirmation').hidden=false;cart=[];persistCart()});
$('#finish-order').addEventListener('click',()=>{$('#checkout-dialog').close();$('#checkout-form').reset();$('#checkout-form').hidden=false;$('.checkout-note').hidden=false;$('#order-confirmation').hidden=true;closeCart()});

renderProducts();renderCart();
