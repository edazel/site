/* ═══════════════════════════════════════════════════════════════
   Настройки сайта «Полуфабрикаты Зеленоград»
   apiEndpoint появится после деплоя Cloudflare Worker (см. README.md).
   Пока он пустой — заказ копируется в буфер и отправляется Алене
   в Telegram одним нажатием (кнопка в корзине).
   ═══════════════════════════════════════════════════════════════ */
window.PZ_CONFIG = {
  apiEndpoint: 'https://polufabrikaty-zelenograd.nusihka72.workers.dev/api/order',
                       // например: 'https://polufabrikaty-worker.<аккаунт>.workers.dev/api/order'
  telegramUser: 'elenafrol',             // личка Алены
  telegramChannel: 'edazel1',            // канал
  telegramBot: 'polufabrikzel_bot',      // бот-витрина
  phone: '+79776780374',
  phoneDisplay: '+7 (977) 678-03-74',
  address: 'Зеленоград, 20-й район',
  showcase: 'https://t.me/polufabrikzel_bot/app',
  maxLink: 'https://max.ru/join/vmv7aX7Hat2qZpnpsuXe0YUjsFLxjQsUE91fieR_IDo',
  avitoLink: 'https://www.avito.ru/moskva_zelenograd/produkty_pitaniya/domashnie_polufabrikaty_na_zakaz_7893559520',
};
