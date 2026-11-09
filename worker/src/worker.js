/* ═══════════════════════════════════════════════════════════════
   Worker «Полуфабрикаты Зеленоград»
   · POST /api/order              — приём заказа с сайта → D1 + Telegram
   · /api/admin/*                 — API панели управления (Bearer ADMIN_TOKEN)
   · POST /telegram/webhook       — бот для покупателей + уведомления админам
   · GET  /api/health             — проверка связи
   Секреты (wrangler secret put): ADMIN_TOKEN, ADMIN_SETUP_CODE,
   CUSTOMER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, ALLOWED_ORIGIN, SITE_URL
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* Каталог с серверными ценами — тотал считаем только на сервере */
const CATALOG = {
  1399182: { title: 'Котлеты домашние',              price: 850, unit: '1 кг' },
  1399176: { title: 'Блинчики с мясом',              price: 650, unit: '1 кг' },
  1432364: { title: 'Галеты творожные с сыром и зеленью', price: 650, unit: '2 шт' },
  1482102: { title: 'Куриные котлетки',              price: 750, unit: '1 кг' },
  1399193: { title: 'Отбивные куриные',              price: 850, unit: '1 кг' },
  1399177: { title: 'Блинчики с творогом',           price: 650, unit: '1 кг' },
  1399178: { title: 'Блинчики с сыром и ветчиной',   price: 650, unit: '1 кг' },
  1399190: { title: 'Блинчики ветчина / сыр / зелень', price: 650, unit: '1 кг' },
  1399181: { title: 'Зразы с грибным сердцем',       price: 850, unit: '1 кг' },
  1399186: { title: 'Гнёзда мясные с помидором и сыром', price: 750, unit: '1 кг' },
  1399184: { title: 'Фрикадельки',                   price: 800, unit: '1 кг' },
  1399191: { title: 'Колбаски домашние',             price: 950, unit: '1 кг' },
  1399189: { title: 'Рубленные куриные котлетки',    price: 700, unit: '1 кг' },
  1500001: { title: 'Сырники домашние',              price: 600, unit: '1 кг' },
  /* наборы со скидкой (id совпадают с BUNDLES на сайте) */
  900001: { title: 'Набор «Семейный завтрак»',       price: 1800, unit: 'набор' },
  900002: { title: 'Набор «Мясной запас»',           price: 2300, unit: 'набор' },
  900003: { title: 'Набор «Куриный набор»',          price: 2100, unit: 'набор' },
  900004: { title: 'Набор «Праздничный стол»',       price: 1900, unit: 'набор' },
};

const STATUS_META = {
  new:       { label: 'Новый',        short: '🆕' },
  confirmed: { label: 'Подтверждён',  short: '✅' },
  cooking:   { label: 'Готовится',    short: '🍳' },
  shipping:  { label: 'В пути / ждёт выдачи', short: '🛵' },
  done:      { label: 'Выполнен',     short: '🎉' },
  cancelled: { label: 'Отменён',      short: '❌' },
};
const STATUS_ORDER = ['new', 'confirmed', 'cooking', 'shipping', 'done', 'cancelled'];

/* ───────────────── утилиты ───────────────── */
const digits = s => String(s || '').replace(/\D/g, '').replace(/^8/, '7');
const fmt = n => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(extraHeaders) } });

let corsOrigin = '*';
const corsHeaders = extra => ({
  'Access-Control-Allow-Origin': corsOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  ...extra,
});

const unauthorized = () => json({ ok: false, error: 'Нет доступа: проверьте токен панели' }, 401);
const badRequest = msg => json({ ok: false, error: msg }, 400);

function checkAdmin(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '').trim();
  if (!env.ADMIN_TOKEN || token.length !== env.ADMIN_TOKEN.length) return false;
  // простое стойкое сравнение
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ env.ADMIN_TOKEN.charCodeAt(i);
  return diff === 0;
}

async function tg(env, method, payload) {
  if (!env.CUSTOMER_BOT_TOKEN) return { ok: false, description: 'CUSTOMER_BOT_TOKEN не задан' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.CUSTOMER_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: String(e) };
  }
}

async function notifyAdmins(env, html, orderId) {
  const { results } = await env.DB.prepare('SELECT chat_id FROM admin_chats').all();
  const buttons = [
    [
      { text: '✅ Подтвердить', callback_data: `act:${orderId}:confirmed` },
      { text: '🍳 Готовлю',     callback_data: `act:${orderId}:cooking` },
    ],
    [
      { text: '🛵 В путь / к выдаче', callback_data: `act:${orderId}:shipping` },
      { text: '🎉 Выполнен',          callback_data: `act:${orderId}:done` },
    ],
    [{ text: '❌ Отменить заказ', callback_data: `act:${orderId}:cancelled` }],
  ];
  for (const row of results || []) {
    await tg(env, 'sendMessage', {
      chat_id: row.chat_id, text: html, parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons },
    });
  }
}

async function notifyCustomer(env, phoneDigits, text) {
  const row = await env.DB.prepare('SELECT telegram_id FROM customers WHERE phone_digits = ?').bind(phoneDigits).first();
  if (row?.telegram_id) {
    await tg(env, 'sendMessage', { chat_id: row.telegram_id, text, parse_mode: 'HTML' });
    return true;
  }
  return false;
}

const orderHtml = (o, withItems = true) => {
  const items = JSON.parse(o.items || '[]');
  const lines = [
    `🛒 <b>Заказ №${o.id}</b> · ${fmt(o.total)}`,
    ``,
    `👤 <b>${esc(o.name)}</b>`,
    `📞 ${esc(o.phone)}`,
    o.delivery === 'delivery'
      ? `🛵 Яндекс Доставка (оплата покупателем)${o.address ? ' — ' + esc(o.address) : ''}`
      : `🏠 Самовывоз · Зеленоград, 20-й район`,
    `💰 Предоплата 50% — ${fmt(Math.round(o.total / 2))} (реквизиты отправит Алена при подтверждении)`,
    `💳 Остаток 50% при получении: ${o.payment === 'sbp' ? 'СБП' : 'наличными'}`,
  ];
  if (withItems && items.length) {
    lines.push('', ...items.map(i => `• ${esc(i.title)} ×${i.qty} — ${fmt(i.price * i.qty)}`));
  }
  if (o.comment) lines.push('', `💬 ${esc(o.comment)}`);
  lines.push('', `🕒 ${esc(o.created_at)}`);
  return lines.join('\n');
};

/* ───────────────── POST /api/order ───────────────── */
async function handleOrder(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest('Некорректный JSON'); }

  // антиспам-ловушка
  if (body.website) return json({ ok: true, orderId: null });

  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').trim().slice(0, 24);
  const pd = digits(phone);
  if (name.length < 2) return badRequest('Укажите имя');
  if (pd.length !== 11) return badRequest('Укажите телефон полностью');
  if (!Array.isArray(body.items) || !body.items.length) return badRequest('Корзина пуста');
  if (body.items.length > 50) return badRequest('Слишком много позиций');

  const delivery = body.delivery === 'delivery' ? 'delivery' : 'pickup';
  const payment = body.payment === 'sbp' ? 'sbp' : 'cash';
  const address = String(body.address || '').trim().slice(0, 200);
  const comment = String(body.comment || '').trim().slice(0, 500);

  // серверный пересчёт тотала
  let total = 0;
  const items = [];
  for (const raw of body.items) {
    const p = CATALOG[Number(raw.id)];
    const qty = Math.min(99, Math.max(1, Number(raw.qty) || 0));
    if (!p || !qty) return badRequest('Неизвестная позиция в заказе: ' + raw.id);
    total += p.price * qty;
    items.push({ id: Number(raw.id), title: p.title, price: p.price, qty, unit: p.unit });
  }

  const result = await env.DB.prepare(
    `INSERT INTO orders (name, phone, phone_digits, delivery, address, comment, payment, total, items, source)
     VALUES (?,?,?,?,?,?,?,?,?, 'site')`
  ).bind(name, phone, pd, delivery, address, comment, payment, total, JSON.stringify(items)).run();

  const orderId = result.meta?.last_row_id ?? null;
  const order = orderId ? await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first() : null;

  if (order) await notifyAdmins(env, orderHtml(order), order.id);
  return json({ ok: true, orderId });
}

/* ───────────────── ADMIN API ───────────────── */
async function adminListOrders(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const where = [], params = [];
  if (status && STATUS_META[status]) { where.push('status = ?'); params.push(status); }
  if (q) {
    const qd = digits(q);
    if (qd.length >= 3) { where.push('phone_digits LIKE ?'); params.push('%' + qd + '%'); }
    else { where.push('(name LIKE ? OR comment LIKE ? OR CAST(id AS TEXT) = ?)'); params.push(`%${q}%`, `%${q}%`, q); }
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const { results } = await env.DB.prepare(
    `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();
  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM orders ${whereSql}`).bind(...params).first();
  return json({ ok: true, orders: results || [], total: countRow?.n || 0 });
}

async function adminGetOrder(env, id) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return json({ ok: false, error: 'Заказ не найден' }, 404);
  const { results: notes } = await env.DB.prepare('SELECT * FROM order_notes WHERE order_id = ? ORDER BY id DESC').bind(id).all();
  return json({ ok: true, order, notes: notes || [], catalog: CATALOG });
}

async function adminPatchOrder(request, env, id) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return json({ ok: false, error: 'Заказ не найден' }, 404);
  let body;
  try { body = await request.json(); } catch { return badRequest('Некорректный JSON'); }

  const sets = [], params = [];
  const prevStatus = order.status;
  if (body.status !== undefined) {
    if (!STATUS_META[body.status]) return badRequest('Неизвестный статус');
    sets.push('status = ?'); params.push(body.status);
  }
  if (body.admin_note !== undefined)      { sets.push('admin_note = ?');      params.push(String(body.admin_note).slice(0, 1000)); }
  if (body.customer_comment !== undefined){ sets.push('customer_comment = ?');params.push(String(body.customer_comment).slice(0, 1000)); }
  if (!sets.length) return badRequest('Нечего обновлять');

  await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...params, id).run();

  // уведомление клиенту при смене статуса — если он известен в боте
  if (body.status && body.status !== prevStatus) {
    const meta = STATUS_META[body.status];
    const upd = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    const cc = upd.customer_comment ? `\n\n💬 ${esc(upd.customer_comment)}` : '';
    await notifyCustomer(env, upd.phone_digits,
      `${meta.short} <b>Заказ №${upd.id}</b>: статус — «${meta.label}».${cc}\n\nВопросы? Напишите сюда — Алена ответит.`);
  }
  return json({ ok: true });
}

async function adminPutItems(request, env, id) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return json({ ok: false, error: 'Заказ не найден' }, 404);
  let body;
  try { body = await request.json(); } catch { return badRequest('Некорректный JSON'); }
  if (!Array.isArray(body.items)) return badRequest('items должен быть массивом');

  let total = 0; const items = [];
  for (const raw of body.items) {
    const p = CATALOG[Number(raw.id)];
    const qty = Math.min(99, Math.max(0, Number(raw.qty) || 0));
    if (!p) continue;
    if (qty === 0) continue;
    total += p.price * qty;
    items.push({ id: Number(raw.id), title: p.title, price: p.price, qty, unit: p.unit });
  }
  await env.DB.prepare('UPDATE orders SET items = ?, total = ? WHERE id = ?')
    .bind(JSON.stringify(items), total, id).run();
  return json({ ok: true, total, items });
}

async function adminAddNote(request, env, id) {
  const order = await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first();
  if (!order) return json({ ok: false, error: 'Заказ не найден' }, 404);
  let body;
  try { body = await request.json(); } catch { return badRequest('Некорректный JSON'); }
  const text = String(body.text || '').trim().slice(0, 1000);
  if (!text) return badRequest('Пустая заметка');
  await env.DB.prepare('INSERT INTO order_notes (order_id, text) VALUES (?,?)').bind(id, text).run();
  return json({ ok: true });
}

async function adminDeleteOrder(env, id) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function adminStats(env) {
  const today = new Date().toISOString().slice(0, 10);
  const { results: byStatus } = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
  const totals = {};
  for (const r of byStatus || []) totals[r.status] = r.n;
  const todayRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS sum FROM orders WHERE date(created_at) = date('now','localtime') AND status != 'cancelled'`
  ).first();
  const weekRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS sum FROM orders WHERE created_at >= datetime('now','-7 days','localtime') AND status != 'cancelled'`
  ).first();
  const revenueDone = await env.DB.prepare(
    `SELECT COALESCE(SUM(total),0) AS sum FROM orders WHERE status = 'done'`
  ).first();
  return json({
    ok: true,
    today: { orders: todayRow?.n || 0, sum: todayRow?.sum || 0, day: today },
    week: { orders: weekRow?.n || 0, sum: weekRow?.sum || 0 },
    done_revenue: revenueDone?.sum || 0,
    by_status: totals,
  });
}

/* ───────────────── Telegram webhook: бот покупателей ───────────────── */
async function handleTelegramWebhook(request, env) {
  // проверяем секрет вебхука — endpoint открыт только Telegram
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
    if (got !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  }
  let update;
  try { update = await request.json(); } catch { return new Response('ok'); }

  /* — кнопки: «Мои заказы» у клиента и быстрые статусы у админа — */
  if (update.callback_query) {
    const cq = update.callback_query;

    if (cq.data === 'myorders') {
      await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });
      const row = await env.DB.prepare('SELECT phone_digits FROM customers WHERE telegram_id = ?').bind(cq.from.id).first();
      if (row) await sendMyOrders(env, cq.from.id, row.phone_digits);
      else await askPhone(env, cq.from.id);
      return new Response('ok');
    }

    const m = /^act:(\d+):(\w+)$/.exec(cq.data || '');
    const isAdmin = await env.DB.prepare('SELECT chat_id FROM admin_chats WHERE chat_id = ?').bind(cq.from.id).first();
    if (!m || !isAdmin) {
      await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: 'Нет доступа' });
      return new Response('ok');
    }
    const [, idStr, status] = m;
    if (!STATUS_META[status]) return new Response('ok');
    await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, Number(idStr)).run();
    const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(idStr)).first();
    if (o) {
      const meta = STATUS_META[status];
      await notifyCustomer(env, o.phone_digits,
        `${meta.short} <b>Заказ №${o.id}</b>: статус — «${meta.label}».${o.customer_comment ? '\n\n💬 ' + esc(o.customer_comment) : ''}`);
      // помечаем карточку в чате админа
      await tg(env, 'editMessageText', {
        chat_id: cq.message.chat.id, message_id: cq.message.message_id,
        text: `${orderHtml(o)}\n\n${meta.short} <b>Статус: ${meta.label}</b>`,
        parse_mode: 'HTML', disable_web_page_preview: true,
      });
    }
    await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: 'Статус обновлён' });
    return new Response('ok');
  }

  const msg = update.message;
  if (!msg) return new Response('ok');
  const chatId = msg.chat.id;
  const from = msg.from || {};
  const firstName = from.first_name || 'друг';

  /* — клиент поделился контактом: связываем телефон с telegram_id — */
  if (msg.contact) {
    const pd = digits(msg.contact.phone_number);
    await env.DB.prepare(
      'INSERT INTO customers (phone_digits, telegram_id, name) VALUES (?,?,?) ON CONFLICT(phone_digits) DO UPDATE SET telegram_id = excluded.telegram_id, name = excluded.name'
    ).bind(pd, chatId, [from.first_name, from.last_name].filter(Boolean).join(' ')).run();
    await sendMyOrders(env, chatId, pd);
    return new Response('ok');
  }

  const text = (msg.text || '').trim();

  /* — /start, в т.ч. deep-link admin-<код> — */
  if (text.startsWith('/start')) {
    const payload = text.split(/\s+/)[1] || '';
    if (payload && env.ADMIN_SETUP_CODE && payload === 'admin-' + env.ADMIN_SETUP_CODE) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO admin_chats (chat_id, name) VALUES (?,?)'
      ).bind(chatId, [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Админ').run();
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: '✅ <b>Вы подключены к заказам!</b>\n\nНовые заявки с сайта будут приходить сюда с кнопками быстрой смены статуса.',
        parse_mode: 'HTML',
      });
      return new Response('ok');
    }
    const siteUrl = env.SITE_URL || 'https://example.github.io/';
    await tg(env, 'sendMessage', {
      chat_id: chatId,
      text: `Привет, ${esc(firstName)}! 👋\n\nЯ — бот «Полуфабрикаты Зеленоград»: здесь можно посмотреть меню, узнать статус своего заказа и связаться с Аленой.\n\nГотовим блинчики, котлеты, зразы и творожные галеты вручную, из натуральных продуктов.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🥟 Открыть меню и заказать', web_app: { url: siteUrl } }],
          [{ text: '📦 Мои заказы', callback_data: 'myorders' }],
          [{ text: '💬 Написать Алене', url: 'https://t.me/elenafrol' }],
        ],
      },
    });
    return new Response('ok');
  }

  if (text === '/menu') {
    const siteUrl = env.SITE_URL || 'https://example.github.io/';
    await tg(env, 'sendMessage', {
      chat_id: chatId, text: 'Меню и заказ онлайн:',
      reply_markup: { inline_keyboard: [[{ text: '🥟 Открыть меню', web_app: { url: siteUrl } }]] },
    });
    return new Response('ok');
  }

  if (text === '/orders' || text.toLowerCase() === 'мои заказы') {
    const row = await env.DB.prepare('SELECT phone_digits FROM customers WHERE telegram_id = ?').bind(chatId).first();
    if (row) return void (await sendMyOrders(env, chatId, row.phone_digits));
    await askPhone(env, chatId);
    return new Response('ok');
  }

  if (text === '/help' || text.toLowerCase() === 'помощь') {
    await tg(env, 'sendMessage', {
      chat_id: chatId,
      text: '<b>Чем помогу:</b>\n/menu — открыть меню и заказать\n/orders — мои заказы и их статусы\n\nИли напишите Алене лично: @elenafrol\nТелефон: +7 (977) 678-03-74\nКанал: @edazel1',
      parse_mode: 'HTML',
    });
    return new Response('ok');
  }

  await tg(env, 'sendMessage', {
    chat_id: chatId,
    text: 'Не совсем поняла 🙂 Напишите /menu — чтобы открыть меню, /orders — чтобы узнать статус заказа, или выберите кнопку ниже.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📦 Мои заказы', callback_data: 'myorders' }],
        [{ text: '💬 Написать Алене', url: 'https://t.me/elenafrol' }],
      ],
    },
  });
  return new Response('ok');
}

async function askPhone(env, chatId) {
  await tg(env, 'sendMessage', {
    chat_id: chatId,
    text: 'Чтобы найти ваши заказы, поделитесь, пожалуйста, номером телефона — тем, который оставляли при заказе:',
    reply_markup: {
      keyboard: [[{ text: '📱 Поделиться телефоном', request_contact: true }]],
      resize_keyboard: true, one_time_keyboard: true,
    },
  });
}

async function sendMyOrders(env, chatId, pd) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders WHERE phone_digits = ? ORDER BY id DESC LIMIT 5'
  ).bind(pd).all();
  if (!results?.length) {
    await tg(env, 'sendMessage', { chat_id: chatId, text: 'Пока не нахожу заказов по вашему номеру. Может, оформляли на другой? Напишите Алене: @elenafrol' });
    return;
  }
  const lines = ['<b>Ваши последние заказы:</b>', ''];
  for (const o of results) {
    const meta = STATUS_META[o.status] || { label: o.status, short: '•' };
    lines.push(`${meta.short} <b>Заказ №${o.id}</b> — ${fmt(o.total)} — «${meta.label}»`);
    if (o.customer_comment) lines.push(`   💬 ${esc(o.customer_comment)}`);
  }
  lines.push('', 'Вопрос по заказу? Напишите Алене: @elenafrol');
  await tg(env, 'sendMessage', {
    chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true },
  });
}

/* ───────────────── живой блок «Сегодня в наличии» ───────────────── */
const STOCK_KEY = 'stock';
const fmtMskTime = iso => {
  try {
    return new Date(iso.replace(' ', 'T')).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(iso); }
};
const sanitizeStockItems = raw => {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const out = [];
  for (const item of raw.slice(0, 12)) {
    const name = String(item?.name ?? item ?? '').trim().slice(0, 60);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name });
  }
  return out;
};

async function publicGetStock(env) {
  const row = await env.DB.prepare('SELECT value, updated_at FROM site_settings WHERE key = ?').bind(STOCK_KEY).first();
  if (!row) return json({ ok: true, items: null, updated_at: null });  // сайт отдаст дефолт
  let items = [];
  try { items = sanitizeStockItems(JSON.parse(row.value)) || []; } catch { items = []; }
  return json({ ok: true, items, updated_at: fmtMskTime(row.updated_at) });
}

async function adminPutStock(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest('Некорректный JSON'); }
  const items = sanitizeStockItems(body.items);
  if (!items) return badRequest('items должен быть массивом позиций');
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?,?,datetime('now','localtime'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(STOCK_KEY, JSON.stringify(items)).run();
  const row = await env.DB.prepare('SELECT updated_at FROM site_settings WHERE key = ?').bind(STOCK_KEY).first();
  return json({ ok: true, items, updated_at: fmtMskTime(row?.updated_at || new Date().toISOString()) });
}

/* ───────────────── роутер ───────────────── */
export default {
  async fetch(request, env) {
    corsOrigin = env.ALLOWED_ORIGIN || '*';
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders({}) });

    try {
      /* здоровье связи — для админки */
      if (path === '/api/health' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders').first();
        return json({ ok: true, orders: row?.n || 0, time: new Date().toISOString() });
      }

      /* заказ с сайта */
      if (path === '/api/order' && request.method === 'POST') return await handleOrder(request, env);

      /* публичный живой список «в наличии» — читают все страницы сайта */
      if (path === '/api/public/settings/stock' && request.method === 'GET') return await publicGetStock(env);

      /* webhook бота */
      if (path === '/telegram/webhook' && request.method === 'POST') return await handleTelegramWebhook(request, env);

      /* admin API */
      if (path.startsWith('/api/admin')) {
        if (!checkAdmin(request, env)) return unauthorized();

        if (path === '/api/admin/orders' && request.method === 'GET') return await adminListOrders(request, env);
        if (path === '/api/admin/stats' && request.method === 'GET') return await adminStats(env);
        if (path === '/api/admin/settings/stock' && request.method === 'GET') return await publicGetStock(env);
        if (path === '/api/admin/settings/stock' && request.method === 'PUT') return await adminPutStock(request, env);

        let m = /^\/api\/admin\/orders\/(\d+)(\/items|\/notes)?$/.exec(path);
        if (m) {
          const id = Number(m[1]), sub = m[2] || '';
          if (!sub && request.method === 'GET') return await adminGetOrder(env, id);
          if (!sub && request.method === 'PATCH') return await adminPatchOrder(request, env, id);
          if (!sub && request.method === 'DELETE') return await adminDeleteOrder(env, id);
          if (sub === '/items' && request.method === 'PUT') return await adminPutItems(request, env, id);
          if (sub === '/notes' && request.method === 'POST') return await adminAddNote(request, env, id);
        }
        return json({ ok: false, error: 'Маршрут не найден' }, 404);
      }

      return json({ ok: false, error: 'Маршрут не найден' }, 404);
    } catch (err) {
      console.error(err);
      return json({ ok: false, error: 'Внутренняя ошибка: ' + String(err?.message || err) }, 500);
    }
  },
};
