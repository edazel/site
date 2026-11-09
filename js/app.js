/* ═══════════════════════════════════════════════════════════════
   «Полуфабрикаты Зеленоград» — общая логика всех страниц
   корзина · каталог · наборы · оформление · живой блок «в наличии» · тема
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const CFG = window.PZ_CONFIG;
const fmt = n => n.toLocaleString('ru-RU') + ' ₽';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ALL_SELLABLE = [...PRODUCTS, ...BUNDLES.map(b => ({
  id: b.id, title: b.title, unit: 'набор', price: b.price, desc: b.contents,
  img: b.img[0], cats: [], badge: null, cook: null, isBundle: true,
}))];
const GIFT_GOAL = 3000; // порог маленького подарка от Елены

/* ───────────────── FAQ — данные ───────────────── */
const FAQ = [
  { q: 'Из чего сделан фарш?',
    a: 'Классика — свинина и говядина пополам. Куриные позиции — из охлаждённой куриной грудки. Рубим и мешаем сами в день приготовления, без сои, крахмала и усилителей вкуса.' },
  { q: 'Сколько хранится в морозилке?',
    a: 'До 3 месяцев при стабильной −18 °C в плотно закрытой упаковке. После разморозки не замораживайте повторно — готовьте в тот же день. В холодильнике размораживайте на нижней полке.' },
  { q: 'Можно ли приготовить под заказ без соли, лука или специй?',
    a: 'Да! Напишите пожелания в комментарии к заказу или в Telegram — учту. Делаю и детские варианты, и постные — по запросу.' },
  { q: 'Сколько времени готовится заказ?',
    a: 'Обычно 1–2 дня: готовлю малыми партиями под конкретные заказы. Если нужно срочно «прямо сегодня» — напишите, подскажу, что есть в наличии.' },
  { q: 'Как заказать доставку через Яндекс Доставку?',
    a: 'При оформлении выберите «Доставка» — и обязательно укажите адрес. Я упаковываю заказ и вызываю курьера Яндекс Доставки (Яндекс Go). Стоимость доставки оплачивает покупатель по тарифам Яндекса на момент отправления — курьеру при получении или по ссылке из СМС. В самовывозе всё бесплатно.' },
  { q: 'Возите ли за пределы Зеленограда?',
    a: 'В пределах Зеленограда — по договорённости через Яндекс Доставку. В другие города — только самовывоз: по законам физики блинчики не любят длинных дорог, но Елена ненавидит их не меньше.' },
  { q: 'Как оплатить?',
    a: 'Товар — при получении: наличными или переводом по СБП / по номеру телефона. Доставка Яндексом оплачивается отдельно — тоже Яндексу, а не мне.' },
];

/* ───────────────── состояние корзины ───────────────── */
const CART_KEY = 'pz_cart_v2';
let cart = {};
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; } catch { cart = {}; }

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartEntries = () => Object.entries(cart).map(([id, qty]) => ({ product: ALL_SELLABLE.find(p => p.id === +id), qty })).filter(e => e.product && e.qty > 0);
const cartCount = () => cartEntries().reduce((s, e) => s + e.qty, 0);
const cartTotal = () => cartEntries().reduce((s, e) => s + e.qty * e.product.price, 0);

/* ───────────────── рендер карточек товара ───────────────── */
const badgeHTML = b => b ? `<span class="badge ${BADGES[b].cls}">${BADGES[b].text}</span>` : '';

function productCard(p) {
  const qty = cart[p.id] || 0;
  return `
  <article class="card reveal visible" data-id="${p.id}">
    <div class="card-photo">
      <img src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.onerror=null;this.src='images/logo.jpg'">
      ${badgeHTML(p.badge)}
    </div>
    <div class="card-body">
      <h3>${p.title}</h3>
      <p class="card-comp">${p.desc}</p>
      ${p.cook ? `<p class="card-cook"><svg class="icon"><use href="#i-flame"/></svg>${p.cook}</p>` : ''}
      <div class="card-foot">
        <div class="price">${fmt(p.price)}<small>за ${p.unit}</small></div>
        <button class="add-btn" data-add="${p.id}" ${qty ? 'hidden' : ''}>В корзину</button>
        <div class="qty-stepper ${qty ? 'on' : ''}" data-stepper="${p.id}">
          <button data-dec="${p.id}" aria-label="Убавить"><svg class="icon"><use href="#i-minus"/></svg></button>
          <span class="qty-n">${qty}</span>
          <button data-inc="${p.id}" aria-label="Прибавить"><svg class="icon"><use href="#i-plus"/></svg></button>
        </div>
      </div>
    </div>
  </article>`;
}

/* ───────────────── каталог (страница menu.html) ───────────────── */
const grid = $('#catalogGrid');
const chipRow = $('#chipRow');
const searchInput = $('#catalogSearch');
const emptyMsg = $('#catalogEmpty');
let activeCat = 'all';
let query = '';

const matches = p => {
  const catOk =
    activeCat === 'all' ? true :
    activeCat === 'hit' ? (p.badge === 'hit' || p.badge === 'hit-new') :
    activeCat === 'new' ? (p.badge === 'new' || p.badge === 'hit-new') :
    p.cats.includes(activeCat);
  if (!catOk) return false;
  if (!query) return true;
  const hay = (p.title + ' ' + p.desc).toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

function renderChips() {
  if (!chipRow) return;
  chipRow.innerHTML = CATEGORIES.map(c =>
    `<button class="chip ${c.key === activeCat ? 'active' : ''}" data-cat="${c.key}" role="tab" aria-selected="${c.key === activeCat}">${c.label}</button>`
  ).join('');
}
function renderCatalog() {
  if (!grid) return;
  const list = PRODUCTS.filter(matches);
  emptyMsg.hidden = list.length !== 0;
  grid.innerHTML = list.map(productCard).join('');
}

/* ───────────────── наборы со скидкой ───────────────── */
function renderBundles() {
  const host = $('#bundlesRow');
  if (!host) return;
  host.innerHTML = BUNDLES.map(b => `
    <article class="bundle-card" data-bundle="${b.id}">
      <span class="bundle-save">Выгода ${fmt(b.saving)}</span>
      <span class="bundle-tag">${b.tag}</span>
      <div class="bundle-photos">${b.img.map(src => `<img src="${src}" alt="${b.title}" loading="lazy">`).join('')}</div>
      <h3 class="bundle-title">${b.title}</h3>
      <p class="bundle-contents">${b.contents}</p>
      <div class="bundle-foot">
        <div class="bundle-price">${fmt(b.price)}<small>${fmt(b.price + b.saving)} по меню</small></div>
        <button class="bundle-add" data-add="${b.id}">В корзину</button>
      </div>
    </article>`).join('');
}

/* ───────────────── порционный гид ───────────────── */
function renderPortionGuide() {
  const host = $('#portionGuide');
  if (!host) return;
  host.innerHTML = PORTION_GUIDE.map(p => `
    <div class="portion-item"><svg class="icon"><use href="#${p.icon}"/></svg><div><b>${p.name}</b><span>${p.text}</span></div></div>`).join('');
}

/* ───────────────── хиты на главной ───────────────── */
function renderHits() {
  const host = $('#hitsGrid');
  if (!host) return;
  const hits = PRODUCTS.filter(p => p.badge).slice(0, 4);
  host.innerHTML = hits.map(productCard).join('');
}

/* ───────────────── корзина: операции ───────────────── */
const cartCountEl = $('#cartCount');
const tabCartCount = $('#tabCartCount');

function updateBadges() {
  const n = cartCount();
  if (cartCountEl) {
    cartCountEl.textContent = n;
    cartCountEl.style.display = n > 0 ? 'grid' : 'none';
    cartCountEl.classList.remove('bump'); void cartCountEl.offsetWidth; cartCountEl.classList.add('bump');
  }
  if (tabCartCount) tabCartCount.textContent = n;
  const tot = fmt(cartTotal());
  const cartTotalEl = $('#cartTotal'); if (cartTotalEl) cartTotalEl.textContent = tot;
  const submitTotal = $('#submitTotal'); if (submitTotal) submitTotal.textContent = tot;
  updateGiftProgress();
}

function updateGiftProgress() {
  const box = $('#giftProgress');
  if (!box) return;
  const total = cartTotal();
  const fill = $('#giftBarFill'), text = $('#giftProgressText');
  const left = Math.max(0, GIFT_GOAL - total);
  const done = total >= GIFT_GOAL;
  box.hidden = cartEntries().length === 0;
  box.classList.toggle('done', done);
  if (fill) fill.style.width = Math.min(100, (total / GIFT_GOAL) * 100) + '%';
  if (text) text.textContent = done
    ? 'Подарок Елены уже в вашем пакете — приятного аппетита!'
    : `До маленького подарка от Елены осталось ${fmt(left)}`;
}

function addToCart(id, fromCard) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  refreshCardControls(id);
  updateBadges();
  renderCartItems();
  flyToCart(fromCard);
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  saveCart();
  refreshCardControls(id);
  updateBadges();
  renderCartItems();
}

function refreshCardControls(id) {
  $$(`[data-stepper="${id}"]`).forEach(st => {
    const n = cart[id] || 0;
    st.classList.toggle('on', n > 0);
    $('.qty-n', st).textContent = n;
    const btn = $(`[data-add="${id}"]`);
    if (btn) btn.hidden = n > 0;
  });
}

function flyToCart(fromCard) {
  const cartBtn = $('#cartOpenBtn');
  const cardImg = fromCard?.querySelector('.card-photo img, .bundle-card') || null;
  if (!cartBtn || !cardImg) return;
  const a = (cardImg.querySelector('img') || cardImg).getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
  const ghost = (cardImg.querySelector('img') || cardImg).cloneNode();
  Object.assign(ghost.style, {
    position: 'fixed', left: a.left + 'px', top: a.top + 'px',
    width: a.width + 'px', height: a.height + 'px', objectFit: 'cover',
    borderRadius: '18px', zIndex: 100, pointerEvents: 'none',
  });
  document.body.appendChild(ghost);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '18px' },
    { transform: `translate(${b.left + b.width/2 - (a.left + a.width/2)}px, ${b.top + b.height/2 - (a.top + a.height/2)}px) scale(.12)`, opacity: .85, borderRadius: '50%' },
  ], { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => ghost.remove();
}

/* ───────────────── рендер корзины ───────────────── */
const cartItemsEl = $('#cartItems');
const cartEmpty = $('#cartEmpty');
const cartBody = $('#cartBody');
const cartFooter = $('#cartFooter');
const successView = $('#successView');
const cartView = $('#cartView');

function renderCartItems() {
  if (!cartItemsEl) return;
  const entries = cartEntries();
  const isEmpty = entries.length === 0;
  cartEmpty.style.display = isEmpty ? 'flex' : 'none';
  cartBody.style.display = isEmpty ? 'none' : 'flex';
  cartFooter.style.display = isEmpty ? 'none' : 'block';
  cartItemsEl.innerHTML = entries.map(({ product: p, qty }) => `
    <li class="cart-item" data-item="${p.id}">
      <img src="${p.img}" alt="${p.title}" loading="lazy">
      <div class="cart-item-info">
        <p class="cart-item-name">${p.title}${p.isBundle ? ' <em class="bundle-mark">набор</em>' : ''}</p>
        <p class="cart-item-price">${fmt(p.price)} за ${p.unit}</p>
        <div class="qty-stepper on">
          <button data-dec="${p.id}" aria-label="Убавить"><svg class="icon"><use href="#i-minus"/></svg></button>
          <span class="qty-n">${qty}</span>
          <button data-inc="${p.id}" aria-label="Прибавить"><svg class="icon"><use href="#i-plus"/></svg></button>
        </div>
      </div>
      <button class="cart-item-remove" data-remove="${p.id}" aria-label="Убрать из корзины"><svg class="icon"><use href="#i-trash"/></svg></button>
    </li>`).join('');
}

/* ───────────────── шторка корзины ───────────────── */
const drawer = $('#cartDrawer');
const overlay = $('#cartOverlay');
let lastFocus = null;

function openCart() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('show'));
  document.body.style.overflow = 'hidden';
  $('#cartCloseBtn')?.focus();
}
function closeCart() {
  if (!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('show');
  setTimeout(() => { overlay.hidden = true; }, 350);
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}
function bindCartTriggers() {
  $('#cartOpenBtn')?.addEventListener('click', openCart);
  $('#tabCartBtn')?.addEventListener('click', openCart);
  $('#cartCloseBtn')?.addEventListener('click', closeCart);
  overlay?.addEventListener('click', closeCart);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer?.classList.contains('open')) closeCart(); });
}

/* ───────────────── делегирование кликов ───────────────── */
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) { addToCart(+add.dataset.add, add.closest('.card, .bundle-card')); showToast('Добавлено в корзину'); return; }
  const inc = e.target.closest('[data-inc]');
  if (inc) { setQty(+inc.dataset.inc, (cart[+inc.dataset.inc] || 0) + 1); return; }
  const dec = e.target.closest('[data-dec]');
  if (dec) { setQty(+dec.dataset.dec, (cart[+dec.dataset.dec] || 0) - 1); return; }
  const rem = e.target.closest('[data-remove]');
  if (rem) { setQty(+rem.dataset.remove, 0); showToast('Убрано из корзины'); return; }
  const chip = e.target.closest('.chip');
  if (chip) { activeCat = chip.dataset.cat; renderChips(); renderCatalog(); return; }
});
if (searchInput) searchInput.addEventListener('input', e => { query = e.target.value.trim(); renderCatalog(); });

/* ───────────────── тост ───────────────── */
const toastEl = $('#toast');
let toastTimer;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ───────────────── телефон: маска +7 ───────────────── */
const phoneInput = $('#fPhone');
if (phoneInput) {
  phoneInput.addEventListener('input', () => {
    let d = phoneInput.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && !d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '';
    if (d.length > 0) out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    phoneInput.value = out;
    phoneInput.classList.remove('invalid');
  });
}
const phoneDigits = () => (phoneInput ? phoneInput.value.replace(/\D/g, '') : '');

/* адрес показываем только при доставке */
const addressField = $('#fAddress');
function bindDeliveryToggle() {
  $$('input[name="delivery"]').forEach(r => r.addEventListener('change', () => {
    addressField.hidden = $('input[name="delivery"]:checked').value !== 'delivery';
  }));
  // если пришли со страницы доставки с выбором «Яндекс Доставка» — предвыбираем
  const pref = localStorage.getItem('pz_pref_delivery');
  if (pref) {
    const radio = $(`input[name="delivery"][value="${pref}"]`);
    if (radio) { radio.checked = true; if (addressField) addressField.hidden = pref !== 'delivery'; }
    localStorage.removeItem('pz_pref_delivery');
  }
}

/* ───────────────── состав заказа → текст ───────────────── */
function orderText() {
  const entries = cartEntries();
  const lines = entries.map(({ product: p, qty }) => `• ${p.title} ×${qty} — ${fmt(p.price * qty)}`);
  const delivery = $('input[name="delivery"]:checked').value === 'delivery'
    ? `Доставка Яндексом (за счёт покупателя)${addressField.value ? ', адрес: ' + addressField.value : ''}`
    : 'Самовывоз (Зеленоград, 20-й район)';
  const payment = $('input[name="payment"]:checked').value === 'cash' ? 'наличными' : 'СБП';
  return [
    'Заказ с сайта «Полуфабрикаты Зеленоград»', '',
    ...lines, '',
    `Итого: ${fmt(cartTotal())}`,
    `Имя: ${$('#fName').value.trim()}`,
    `Телефон: ${phoneInput.value}`,
    `Получение: ${delivery}`,
    `Оплата: ${payment}`,
    $('#fComment').value.trim() ? `Комментарий: ${$('#fComment').value.trim()}` : null,
  ].filter(Boolean).join('\n');
}

/* ───────────────── отправка заказа ───────────────── */
const form = $('#checkoutForm');
const submitBtn = $('#submitOrderBtn');

if (form) form.addEventListener('submit', async e => {
  e.preventDefault();
  if ($('#fWebsite').value) return; // антиспам

  const name = $('#fName').value.trim();
  const phoneOk = phoneDigits().length === 11;
  if (!name) { $('#fName').focus(); showToast('Укажите, как к вам обращаться'); return; }
  if (!phoneOk) { phoneInput.classList.add('invalid'); phoneInput.focus(); showToast('Введите телефон полностью'); return; }
  if (!$('#fConsent').checked) { showToast('Отметьте согласие на обработку телефона'); return; }

  const entries = cartEntries();
  if (!entries.length) { showToast('Корзина пуста'); return; }

  const payload = {
    name, phone: '+' + phoneDigits(),
    delivery: $('input[name="delivery"]:checked').value,
    address: addressField.value.trim(),
    comment: $('#fComment').value.trim(),
    payment: $('input[name="payment"]:checked').value,
    total: cartTotal(),
    items: entries.map(({ product: p, qty }) => ({ id: p.id, title: p.title, price: p.price, qty, unit: p.unit })),
    website: '',
  };

  submitBtn.disabled = true;
  submitBtn.style.opacity = .7;

  let orderId = null, sentToServer = false;
  if (CFG.apiEndpoint) {
    try {
      const res = await fetch(CFG.apiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { sentToServer = true; orderId = data.orderId || null; }
      else throw new Error(data.error || 'Ошибка сервера');
    } catch (err) { console.warn('API недоступен, fallback на Telegram:', err); }
  }

  if (!sentToServer) {
    try { await navigator.clipboard.writeText(orderText()); } catch {}
    showToast('Заявка скопирована — вставьте её Елене в Telegram');
    window.open('https://t.me/' + CFG.telegramUser, '_blank', 'noopener');
  }

  cart = {}; saveCart();
  refreshAllCards();
  updateBadges();
  renderCartItems();
  if ($('#successOrderId')) { $('#successOrderId').hidden = !orderId; if (orderId) $('#successOrderId b').textContent = '№ ' + orderId; }
  if (cartView) cartView.hidden = true;
  if (successView) successView.hidden = false;
  submitBtn.disabled = false;
  submitBtn.style.opacity = 1;
  form.reset();
  if (addressField) addressField.hidden = true;
});
function refreshAllCards() { ALL_SELLABLE.forEach(p => refreshCardControls(p.id)); }
$('#successCloseBtn')?.addEventListener('click', () => {
  if (successView) successView.hidden = true;
  if (cartView) cartView.hidden = false;
  closeCart();
});

/* ───────────────── FAQ — аккордеон ───────────────── */
const acc = $('#faqAccordion');
if (acc) {
  acc.innerHTML = FAQ.map((item, i) => `
    <div class="faq-item${i === 0 ? ' open' : ''}">
      <button class="faq-q" aria-expanded="${i === 0}">${item.q}<svg class="icon"><use href="#i-plus"/></svg></button>
      <div class="faq-a"><p>${item.a}</p></div>
    </div>`).join('');
  acc.addEventListener('click', e => {
    const btn = e.target.closest('.faq-q');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    item.classList.toggle('open');
    btn.setAttribute('aria-expanded', item.classList.contains('open'));
  });
}

/* ───────────────── живая карточка «Сегодня в наличии» ───────────────── */
const stockList = $('#stockList');
const stockUpdated = $('#stockUpdated');
const stockRefreshBtn = $('#stockRefreshBtn');

function renderStock(items, updatedAt, { isFallback = false } = {}) {
  if (!stockList) return;
  const rows = Array.isArray(items) ? items.slice(0, 8) : DEFAULT_STOCK;
  stockList.innerHTML = rows.length
    ? rows.map(i => `<li>${escapeHTML(i.name ?? i)}</li>`).join('')
    : '<li class="stock-none">Сегодня всё разобрано — Елена уже лепит новую партию</li>';
  if (stockUpdated) {
    stockUpdated.innerHTML = updatedAt
      ? `обновлено <b>${escapeHTML(updatedAt)}</b>`
      : 'список Елены — актуален на сегодня';
  }
}
const escapeHTML = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function fetchStock() {
  if (!CFG.apiEndpoint) { renderStock(DEFAULT_STOCK, null); return; }
  try {
    const base = CFG.apiEndpoint.replace(/\/api\/order\/?$/, '');
    const res = await fetch(base + '/api/public/settings/stock', { cache: 'no-store' });
    const data = await res.json();
    // items === null → Елена ещё не заводила список: показываем дефолт
    if (data.ok && Array.isArray(data.items)) renderStock(data.items, data.updated_at);
    else renderStock(DEFAULT_STOCK, null);
  } catch {
    renderStock(DEFAULT_STOCK, null);
  }
}
stockRefreshBtn?.addEventListener('click', fetchStock);

/* ───────────────── тема оформления ───────────────── */
const themeToggle = $('#themeToggle');
themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? '' : 'dark';
  if (next) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('pz_theme', next); } catch {}
  showToast(next === 'dark' ? 'Тёмная «печная» тема включена' : 'Светлая «топленое молоко» тема включена');
});

/* ───────────────── шапка: тень + прогресс + наверх ───────────────── */
const header = $('.site-header');
const toTop = $('#toTop');
const progressBar = $('#scrollProgress');
function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop;
  header?.classList.toggle('scrolled', y > 24);
  toTop?.classList.toggle('show', y > 600);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ───────────────── плавное появление блоков ───────────────── */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach(el => io.observe(el));
setTimeout(() => $$('.reveal').forEach(el => el.classList.add('visible')), 1200);

/* ───────────────── стартовая отрисовка ───────────────── */
bindCartTriggers();
bindDeliveryToggle();
renderChips();
renderCatalog();
renderBundles();
renderPortionGuide();
renderHits();
renderCartItems();
updateBadges();
fetchStock();
setInterval(fetchStock, 60000); // живой список — сама подтянется раз в минуту
onScroll();
