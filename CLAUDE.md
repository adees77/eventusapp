@AGENTS.md

# EVENTUS — карта проекта для Claude

Демо-маркетплейс услуг для свадеб/тоев (Бишкек) + ИИ-ассистент. Next.js 16.4 App Router, React 19.3, TS, Tailwind v4, shadcn/ui на Base UI, zustand, zod 4, date-fns 4, vitest 5. Общение с пользователем — **на русском**.

## Экономия токенов (обязательно)
- Этот файл — источник правды о структуре. Не исследуй проект заново: сначала смотри карту ниже, потом `grep -n` по нужному символу и читай файл **диапазоном** (`offset/limit`).
- Большие файлы никогда не читать целиком: `messages/{ru,en}.json` (1240 строк), `lib/data/seed/vendors.ts` (1360), `lib/data/actions.ts` (1000), `lib/data/specs.ts` (940), `lib/data/seed/specs.ts`, `lib/data/types.ts` (460), `README.md`.
- Не открывать: `package-lock.json`, `tsconfig.tsbuildinfo`, `.next/`, `public/brand/logo-original.png`, `.claude/worktrees/`.
- Next-доки (`node_modules/next/dist/docs/`) — только grep по конкретному API, не читать подряд.
- Проверка: `npm run typecheck`, `npm test`, линт — `npx eslint app components lib config` (`npm run lint` цепляет чужие `.claude/worktrees`). `npm run build` — только по просьбе.
- Dev-сервер: часто уже запущен на :3000 из другой сессии — переиспользуй через preview url, второй `next dev` не запускай. Конфиги в `.claude/launch.json` (`eventus-dev` :3000, `eventus-product` :3021).

## Карта
```
app/                 маршруты (все страницы — client components поверх локального стора)
  page.tsx           лендинг (секции-функции: Hero…Footer; пакеты считают бюджет по ценам каталога)
  assistant/         чат с ИИ (вендоров редиректит в /vendor; `?q=` предзаполняет запрос)
  vendors/           лента-соцсеть + [slug] профиль      book/[offerId], checkout/[bookingId]
  messages/[id]      чат клиент↔вендор  dashboard/*     кабинет клиента (events, bookings, payments, saved, profile)
  vendor/*           кабинет вендора (services, calendar, bookings, posts, details, finance, reviews, profile)
  admin/*            админка            onboarding/     онбординг клиента (чат); onboarding/vendor — форма вендора
  invitations/, i/[id]  редактор приглашений / публичная страница   create/post, create/service
  api/chat           SSE-стрим одного хода ассистента   api/onboarding — разбор свободного текста
components/          ui/ (shadcn, не трогать без нужды), layout/ (app-shell, header, bottom-nav, cabinet-shell, nav-items),
                     chat/, feed/, vendor/, vendor-panel/, booking/, invitation/{editor,page}, auth/, onboarding/
config/brand.ts      имя, цвета → CSS-переменные (инжект в app/layout.tsx)
config/demo.ts       флаги демо; `seedVersion` — поднять при изменении формы сида
lib/data/
  types.ts           все сущности + `DB` (стр. ~439)
  store.ts           zustand+localStorage, `useDB(selector)`, `getDB()`, `migrate()`; синхронизация вкладок по `storage`
  actions.ts         ВСЕ мутации; каждая `assert(can.x(actor,…))`
  policies.ts        права (`Actor`, `can`) = RLS в supabase/schema.sql
  queries.ts         чтение (searchVendors, vendorBySlug…)  feed.ts — ранжирование ленты
  availability.ts    свободно = всего − блок − брони; неоплаченная держит 15 мин; фоновая занятость
  specs.ts           схема характеристик по категориям (цена+период: x, xQty, xPer)
  seed/              buildSeed(): vendors, catalog, posts, photos (Unsplash), specs
lib/ai/              protocol, tool-defs (zod), tool-exec (в браузере по стору), claude-agent, deepseek-agent,
                     mock-agent (без ключей), system-prompt, use-chat, chat-store, onboarding-extract
lib/auth/            демо-OTP и store; lib/session.ts — роль per-tab (sessionStorage); lib/planner.ts — дата/город/гости
lib/payments/        provider.ts (DemoPaymentProvider), escrow.ts (P2P-эскроу, комиссия)
lib/i18n/index.tsx   `useT()`, `t(key, vars)`, `tn(key, n)`; ключи типизированы из messages/ru.json
lib/invitations/design.ts, lib/onboarding/{script,parse,draft}.ts, lib/voice/use-speech.ts
supabase/schema.sql  будущая схема + RLS (сейчас не используется)
```
Тесты: `**/__tests__/*.test.ts` (node env, alias `@/`).

## Правила кода
- Мутации данных — только через `lib/data/actions.ts` с проверкой в `policies.ts`; новая сущность → `types.ts` + `DB` + `migrate()` в store.ts + сид.
- Все строки UI — в **оба** `messages/ru.json` и `en.json` (одинаковые ключи; плюралы ru `one|few|many`, en `one|other`). Секции верхнего уровня: common nav home chat catalog vendor booking checkout messages dashboard vp admin invitations auth onboarding escrow feed profile cabinet vcab acab inv landing notif vsetup reviews specs create owner …  Найти секцию: `grep -n '"<секция>": {' messages/ru.json`.
- Тексты сида — `LText` `{ru, en}`.
- Ключи ИИ только на сервере. Порядок провайдеров: DeepSeek → Claude → mock (`AI_PROVIDER` форсит).

## Дизайн (не нарушать)
Язык референса «Secureon» (ноя 2026), перенесённый на праздники. Палитра (`config/brand.ts` → токены Tailwind): тёплый белый фон `bg-background`, белые `bg-card` и бежевые `bg-cream` блоки, синий `primary`, тёмно-синий `ink` (`surface-ink` = фон+голубое свечение: hero, подвал, тёмные карточки), жёлтый `sun` — главные CTA (`<Button variant="sun">`), золото — рейтинг/«проверен».
- **Блоки без обводок** (просьба пользователя): никаких `border border-border`/`ring-1` у карточек, секций, полей; разделение фоном. Поля — заливка `bg-foreground/[0.045]`. Тонкие линии допустимы только между строками таблиц/списков.
- Кнопки и табы — пилюли (`rounded-full`); активный пункт навигации/таба — `bg-ink text-white` (счётчик `text-sun`). Карточки `rounded-3xl`/`rounded-[28px]`.
- Заголовки — гротеск Golos (`display` utility или `font-heading`), не антиква. Cormorant (`font-serif`) и Marck Script — только внутри приглашений.
- Без AI-slop: никаких эмодзи, блёсток, фиолетовых градиентов. Вместо фото-заглушек — макеты нашего UI (чат, бронь, сделка). Фирменная деталь — точки «свободно N из M». Контейнер `container-app` 1280.

## Известные грабли
- Вкладки на localhost:3000 делят localStorage; вкладка со старым кодом может затереть запись — перезагрузи её.
- `AGENTS.md` перезаписывает `next dev` — не редактировать, коммитить как есть.

## Поддержание этого файла
После изменений, которые меняют структуру (новый/удалённый маршрут, модуль, сущность, флаг, команда, правило, грабли) — **обнови соответствующую строку здесь** в том же ходе, коротко. Мелкие правки внутри файла не записывать. История — в git, не сюда. Держи файл < 120 строк.
