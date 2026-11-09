-- Схема базы данных D1 «Полуфабрикаты Зеленоград»
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  phone_digits TEXT NOT NULL,
  delivery    TEXT NOT NULL DEFAULT 'pickup',   -- pickup | delivery
  address     TEXT NOT NULL DEFAULT '',
  comment     TEXT NOT NULL DEFAULT '',
  payment     TEXT NOT NULL DEFAULT 'cash',     -- cash | sbp
  total       INTEGER NOT NULL DEFAULT 0,
  items       TEXT NOT NULL DEFAULT '[]',       -- JSON: [{id,title,price,qty,unit}]
  status      TEXT NOT NULL DEFAULT 'new',      -- new|confirmed|cooking|shipping|done|cancelled
  admin_note  TEXT NOT NULL DEFAULT '',         -- внутренняя заметка
  customer_comment TEXT NOT NULL DEFAULT '',    -- ответ клиенту (виден в боте)
  source      TEXT NOT NULL DEFAULT 'site'
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone_digits ON orders(phone_digits);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_notes_order ON order_notes(order_id);

-- покупатели, привязанные к Telegram (заполняется ботом по номеру телефона)
CREATE TABLE IF NOT EXISTS customers (
  phone_digits TEXT PRIMARY KEY,
  telegram_id  INTEGER NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  first_seen   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- админы, подключившие уведомления через /start admin-<код>
CREATE TABLE IF NOT EXISTS admin_chats (
  chat_id    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- произвольные настройки сайта (ключ → значение), редактируются из админки
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                    -- JSON-строка
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
