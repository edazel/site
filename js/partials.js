/* ═══════════════════════════════════════════════════════════════
   Общий «каркас» всех страниц «Полуфабрикаты Зеленоград»
   Шапка · тикер · подвал · корзина-шторка · нижняя мобильная навигация
   Вставляется в плейсхолдеры <div id="pp-..."></div> каждой страницы.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const PZ_PAGES = [
  { href: 'index.html',    key: 'home',     label: 'Главная',  icon: 'i-home' },
  { href: 'menu.html',     key: 'menu',     label: 'Меню',     icon: 'i-basket' },
  { href: 'delivery.html', key: 'delivery', label: 'Доставка', icon: 'i-truck' },
  { href: 'about.html',    key: 'about',    label: 'О нас',    icon: 'i-leaf' },
  { href: 'reviews.html',  key: 'reviews',  label: 'Отзывы',   icon: 'i-star' },
  { href: 'faq.html',      key: 'faq',      label: 'Вопросы',  icon: 'i-help' },
  { href: 'contacts.html', key: 'contacts', label: 'Контакты', icon: 'i-pin' },
];

/* определяем текущую страницу */
const PZ_HERE = (() => {
  const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (f === '' || f === 'index') return 'home';
  return (PZ_PAGES.find(p => p.href === f) || { key: 'home' }).key;
})();

const PZ_ICONS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-basket" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.5 12a2 2 0 0 1-2 2.2H6.5a2 2 0 0 1-2-2.2L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 3l9 8.5"/><path d="M5.5 10v9a1.5 1.5 0 0 0 1.5 1.5h4v-6h2v6h4a1.5 1.5 0 0 0 1.5-1.5v-9"/></symbol>
  <symbol id="i-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8 1c0 1.4-1.4 2-2.4 2.8-.6.5-1 .9-1 1.8"/><circle cx="12" cy="17" r=".4" fill="currentColor"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></symbol>
  <symbol id="i-tg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.4 2.6 2.7 9.7c-1.3.5-1.2 1.4-.2 1.7l4.9 1.5 1.9 5.8c.2.6.7.8 1.3.4l2.7-2.6 4.8 3.6c.7.4 1.4.1 1.6-.8l2.8-17c.2-1-.6-1.6-1.3-1.6zM8.4 12l9.3-8.1c.4-.3.8.2.5.5L9.7 12.5l-.3 4z"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></symbol>
  <symbol id="i-truck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v11H2zM14 9h4l3.5 4v4h-7.5"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17.5" cy="17.5" r="1.7"/></symbol>
  <symbol id="i-wallet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1"/><path d="M3 7v11a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 9 12 4 21 4c0 10-5 15-14 15"/><path d="M5 19c3-6 7-9 12-11"/></symbol>
  <symbol id="i-snow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6 4 18M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4h6v3"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"/></symbol>
  <symbol id="i-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 5l7 7-7 7"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><path d="m9 12 2.2 2.2L15.5 10"/></symbol>
  <symbol id="i-wheat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 13c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M12 8C9 8 7 6 7 3c3 0 5 2 5 5zM12 8c3 0 5-2 5-5-3 0-5 2-5 5z"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.8"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></symbol>
  <symbol id="i-gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z"/><path d="M3 7.5h18V12H3zM12 7.5V22M12 7.5C12 5 10 3 8 3s-3.5 1.8-2.4 3.6C7 8.5 12 7.5 12 7.5zM12 7.5c0-2.5 2-4.5 4-4.5s3.5 1.8 2.4 3.6C17 8.5 12 7.5 12 7.5z"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></symbol>
  <symbol id="i-max" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.18"/><path d="M8.6 9.3h6.8v1.6h-2.6v.8h2.6v1.6h-2.6v.8h2.6v1.6H8.6z"/></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></symbol><symbol id="i-flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-6.8 0-3-1.6-4.8-3.2-7.2C14.4 6 13 3.6 13 2c-3 2-4.5 5-4.4 8C7.4 8.7 6.5 7 6.5 5 4.7 7.4 4 10 4 13.4 4 18.2 8 22 12 22z"/></symbol>
</svg>`;

const navHTML = PZ_PAGES.map(p =>
  `<a href="${p.href}" data-page="${p.key}" class="${p.key === PZ_HERE ? 'active' : ''}">${p.label}</a>`).join('');
const tabHTML = ['home', 'menu', 'delivery', 'contacts'].map(k => {
  const p = PZ_PAGES.find(x => x.key === k);
  return `<a href="${p.href}" data-page="${p.key}" class="tab-item${p.key === PZ_HERE ? ' active' : ''}"><svg class="icon"><use href="#${p.icon}"/></svg><span>${p.label}</span></a>`;
}).join('') + `<button class="tab-item tab-cart" id="tabCartBtn" aria-label="Открыть корзину"><svg class="icon"><use href="#i-basket"/></svg><span>Корзина</span><b class="tab-cart-count" id="tabCartCount">0</b></button>`;

const PZ_PARTIAL_HTML = {
  ticker: `<div class="ticker" aria-hidden="true"><div class="ticker-track" id="tickerTrack"><span>Готовим малыми партиями</span><i>◆</i><span>Шоковая заморозка</span><i>◆</i><span>Только натуральные продукты</span><i>◆</i><span>Предоплата 50%</span><i>◆</i><span>Самовывоз — бесплатно</span><i>◆</i><span>Доставка — Яндекс Доставка за счёт покупателя</span><i>◆</i></div></div><div class="scroll-progress" aria-hidden="true"><div class="scroll-progress-bar" id="scrollProgress"></div></div>`,

  header: `<header class="site-header" id="top"><div class="container header-inner">
    <a class="brand" href="index.html" aria-label="Полуфабрикаты Зеленоград — на главную"><span class="brand-badge"><img src="images/logo.jpg" alt="Полуфабрикаты Зеленоград — логотип" width="56" height="56"></span><span class="brand-text"><strong>Полуфабрикаты</strong><em>Зеленоград</em></span></a>
    <nav class="main-nav" aria-label="Разделы сайта">${navHTML}</nav>
    <div class="header-actions">
      <a class="header-phone" href="tel:+79776780374"><svg class="icon"><use href="#i-phone"/></svg><span>+7 (977) 678-03-74</span></a>
      <button class="theme-toggle" id="themeToggle" aria-label="Переключить тёмную тему"><svg class="icon i-moon"><use href="#i-moon"/></svg><svg class="icon i-sun"><use href="#i-sun"/></svg></button>
      <button class="cart-btn" id="cartOpenBtn" aria-label="Открыть корзину"><svg class="icon"><use href="#i-basket"/></svg><span class="cart-count" id="cartCount">0</span></button>
    </div>
  </div></header>`,

  footer: `<div class="rushnyk" role="presentation"></div>
<footer class="site-footer"><div class="container footer-grid">
  <div class="footer-brand">
    <a class="brand small" href="index.html"><span class="brand-badge"><img src="images/logo.jpg" alt="" width="48" height="48"></span><span class="brand-text"><strong>Полуфабрикаты</strong><em>Зеленоград</em></span></a>
    <p>Домашняя еда из натуральных продуктов. Готовим малыми партиями, замораживаем шоково, отдаём с душой.</p>
    <div class="footer-socials">
      <a href="https://t.me/edazel1" target="_blank" rel="noopener" aria-label="Канал в Telegram"><svg class="icon"><use href="#i-tg"/></svg></a>
      <a href="https://t.me/elenafrol" target="_blank" rel="noopener" aria-label="Написать Алене"><svg class="icon"><use href="#i-tg"/></svg><span class="hand">личка Алены</span></a>
    </div>
  </div>
  <nav class="footer-nav" aria-label="Разделы">
    <p class="footer-title">Разделы</p>
    ${PZ_PAGES.map(p => `<a href="${p.href}">${p.label}</a>`).join('')}
  </nav>
  <div class="footer-contacts">
    <p class="footer-title">Связь</p>
    <a href="tel:+79776780374">+7 (977) 678-03-74</a>
    <a href="https://t.me/elenafrol" target="_blank" rel="noopener">@elenafrol — написать</a>
    <a href="https://t.me/edazel1" target="_blank" rel="noopener">Канал @edazel1</a>
    <a href="https://t.me/polufabrikzel_bot/app" target="_blank" rel="noopener">Онлайн-витрина в Telegram</a>
    <a href="admin/index.html">Панель заказов →</a>
  </div>
</div><div class="container footer-bottom"><span>© 2026 «Полуфабрикаты Зеленоград» · Все права защищены</span><span class="hand">сделано с любовью на домашней кухне</span></div><div class="container footer-credit"><span>Сайт создан студией Антона Рясова · <a href="https://antonryasov.github.io/site/#/home" target="_blank" rel="noopener">antonryasov.github.io ↗</a></span></div></footer>`,

  cart: `<div class="overlay" id="cartOverlay" hidden></div>
<aside class="cart-drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-labelledby="cartTitle" aria-hidden="true">
  <div class="cart-head"><h2 id="cartTitle"><svg class="icon"><use href="#i-basket"/></svg>Ваша корзина</h2><button class="icon-btn" id="cartCloseBtn" aria-label="Закрыть корзину"><svg class="icon"><use href="#i-close"/></svg></button></div>
  <div class="cart-view" id="cartView">
    <div class="cart-empty" id="cartEmpty">
      <svg viewBox="0 0 24 24" class="empty-basket" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.5 12a2 2 0 0 1-2 2.2H6.5a2 2 0 0 1-2-2.2L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/><path d="M10 13.5v3M14 13.5v3"/></svg>
      <p class="cart-empty-title">В корзине пока пусто</p>
      <p class="cart-empty-text">Загляните в меню — котлеты домашние и блинчики с мясом ждут вас.</p>
      <a class="btn btn-primary" href="menu.html">Перейти в меню</a>
    </div>
    <div class="cart-body" id="cartBody">
      <div class="gift-progress" id="giftProgress" hidden>
        <div class="gift-progress-top"><svg class="icon"><use href="#i-gift"/></svg><span id="giftProgressText">До подарка осталось 0 ₽</span></div>
        <div class="gift-bar"><div class="gift-bar-fill" id="giftBarFill"></div></div>
      </div>
      <ul class="cart-items" id="cartItems"></ul>
      <form class="checkout-form" id="checkoutForm" novalidate>
        <p class="checkout-title">Оформление заказа</p>
        <div class="form-row">
          <label class="field"><span>Ваше имя *</span><input type="text" name="name" id="fName" required placeholder="Как к вам обращаться" autocomplete="name"></label>
          <label class="field"><span>Телефон *</span><input type="tel" name="phone" id="fPhone" required placeholder="+7 (___) ___-__-__" autocomplete="tel" inputmode="tel"></label>
        </div>
        <fieldset class="seg">
          <legend>Способ получения</legend>
          <label class="seg-option"><input type="radio" name="delivery" value="pickup" checked><span><svg class="icon"><use href="#i-pin"/></svg>Самовывоз · Зеленоград, 20-й район<em>бесплатно, как договоримся</em></span></label>
          <label class="seg-option"><input type="radio" name="delivery" value="delivery"><span><img class="yandex-go-mini" src="images/yandex-go.png" alt="Go">Яндекс Доставка <em>за счёт покупателя по тарифам Яндекса</em></span></label>
        </fieldset>
        <input type="text" class="field-address" name="address" id="fAddress" placeholder="Куда привезти? (адрес, подъезд, этаж)" hidden>
        <label class="field"><span>Комментарий к заказу</span><textarea name="comment" id="fComment" rows="2" placeholder="Например: позвонить за час, без лука в котлетах…"></textarea></label>
        <fieldset class="seg">
          <legend>Оплата</legend>
          <label class="seg-option mini"><input type="radio" name="payment" value="cash" checked><span><svg class="icon"><use href="#i-wallet"/></svg>Остаток наличными при получении</span></label>
          <label class="seg-option mini"><input type="radio" name="payment" value="sbp"><span><svg class="icon"><use href="#i-shield"/></svg>Остаток по СБП при получении</span></label>
        </fieldset>
        <label class="consent"><input type="checkbox" id="fConsent" required><span>Я соглашаюсь на обработку телефона для оформления заказа</span></label>
        <input type="text" name="website" id="fWebsite" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="submitOrderBtn">Отправить заказ · <span id="submitTotal">0 ₽</span></button>
        <p class="checkout-note prepay-note"><b>Предоплата 50% от суммы заказа обязательна.</b> После оформления Алена свяжется с вами и пришлёт реквизиты для СБП; остаток — при получении. Стоимость доставки Яндексом оплачивается отдельно по тарифам Яндекса.</p>
      </form>
    </div>
    <div class="cart-footer" id="cartFooter"><div class="totals-row"><span>Итого по меню</span><strong id="cartTotal">0 ₽</strong></div><p class="totals-note"><b>Аванс 50%</b> — СБП при подтверждении, остаток — при получении. Доставка Яндексом оплачивается отдельно по тарифам Яндекса.</p></div>
  </div>
  <div class="cart-view success-view" id="successView" hidden>
    <svg class="success-check" viewBox="0 0 72 72" fill="none"><circle class="sc-circle" cx="36" cy="36" r="31" stroke="var(--green)" stroke-width="4"/><path class="sc-tick" d="M22 37.5 32 47 51 26" stroke="var(--green)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <h3>Заявка отправлена!</h3>
    <p id="successText">Алена получит заявку в Telegram, свяжется с вами для подтверждения и пришлёт реквизиты на предоплату 50%.</p>
    <p class="success-order" id="successOrderId" hidden>Номер заказа: <b></b></p>
    <button class="btn btn-primary" id="successCloseBtn">Отлично, жду звонка</button>
  </div>
</aside>
<nav class="bottom-tabbar" aria-label="Быстрая навигация">${tabHTML}</nav>
<button class="to-top" id="toTop" aria-label="Наверх"><svg class="icon" style="transform:rotate(180deg)"><use href="#i-chevron"/></svg></button>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`,
};

(function inject() {
  // вставляем иконки один раз
  const iconsHost = document.createElement('div');
  iconsHost.innerHTML = PZ_ICONS;
  document.body.insertBefore(iconsHost.firstElementChild, document.body.firstChild);

  for (const key of Object.keys(PZ_PARTIAL_HTML)) {
    const host = document.getElementById('pp-' + key);
    if (host) host.innerHTML = PZ_PARTIAL_HTML[key];
  }
  // дублируем тикер для бесшовной петли
  const t = document.getElementById('tickerTrack');
  if (t) t.innerHTML += t.innerHTML;
  window.PZ_PARTIALS_DONE = true;
  window.dispatchEvent(new CustomEvent('pz:partials'));
})();
