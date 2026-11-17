@AGENTS.md

# EVENTUS AI — карта проекта для Claude

Демо-маркетплейс услуг для свадеб/тоев (Бишкек) + ИИ-ассистент. Next.js 16.4 App Router, React 19.3, TS, Tailwind v4, shadcn/ui на Base UI, zustand, zod 4, date-fns 4, vitest 5. Общение с пользователем — **на русском**.

## Экономия токенов (обязательно)
- Этот файл — источник правды о структуре. Не исследуй проект заново: сначала смотри карту ниже, потом `grep -n` по нужному символу и читай файл **диапазоном** (`offset/limit`).
- Большие файлы никогда не читать целиком: `messages/{ru,en}.json`, `lib/data/seed/{vendors,specs,index}.ts`, `lib/data/{specs,types}.ts`, `components/invitation/**`, `app/onboarding/page.tsx`, `README.md` (все > 450 строк; оглавление — `grep -n '^export'`).
- Не открывать: `package-lock.json`, `tsconfig.tsbuildinfo`, `.next/`, `public/brand/logo-original.png`, `.claude/worktrees/`.
- Next-доки (`node_modules/next/dist/docs/`) — только grep по конкретному API, не читать подряд.
- Проверка: `npm run typecheck`, `npm test`, `npm run lint`. `npm run build` — только по просьбе. Typecheck ругается на `.next/types/validator.ts` (удалённый маршрут) → `npx next typegen`.
- Dev-сервер: часто уже запущен на :3000 из другой сессии — переиспользуй через preview url, второй `next dev` не запускай. Конфиги в `.claude/launch.json` (`eventus-dev` :3000, `eventus-product` :3021).

## Карта
```
app/                 маршруты (client components; данные — только через хуки lib/data/views, запись — lib/data/actions)
  page.tsx           лендинг — только порядок секций; сами секции в components/landing/*
  assistant/         чат с ИИ (вендоров редиректит в /vendor; `?q=` — новый чат с запросом; открытый тред помнится per user — `chat-store.active`)
  vendors/           лента-соцсеть + [slug] профиль (шапка; вкладки — components/vendor-profile/*)   book/[offerId], checkout/[bookingId]
  messages/[id]      чат клиент↔вендор  dashboard/*     кабинет клиента (events, bookings, payments, saved, profile)
  vendor/*           кабинет исполнителя (обзор с календарём, bookings, finance, profile с документами; posts/services — через «+», details и занятые даты — из кабинета/профиля; нижнее меню: кабинет · лента · + · сообщения · профиль; отзывы только в профиле /vendors/[slug])
  admin/*            админка: users, vendors, verification (документы/заявки), bookings, disputes, finance, posts, reviews, complaints, settings
  onboarding/        онбординг клиента (чат; «Всё верно» → диалог становится первым тредом ассистента с подборкой исполнителей на дату — `lib/ai/onboarding-thread.ts`); onboarding/vendor — форма вендора   welcome/ — вход (Google/email-OTP/демо)   auth/callback — возврат с Google   me/ — вкладка «Профиль»
  invitations/, i/[id]  приглашения: список с кольцом ответов + «Создать» (с нуля → конструктор, шаблон → простые поля quick-editor); вкладки дизайн/статистика(гости внутри)/поделиться; i/[id] — публичная   create/post, create/service
  api/chat           SSE-стрим одного хода ассистента   api/onboarding — разбор свободного текста
  api/vendor-chat    ИИ-помощник исполнителя: отвечает в чате клиент↔исполнитель от его имени (`ai: true`, карточки брони `offerIds`); молчит, если исполнитель писал сам < 12 ч или `Vendor.aiAssistant === false`
components/          ui/ (shadcn, не трогать без нужды), layout/ (app-shell, header — без меню аккаунта, bottom-nav, cabinet-shell, nav-items), cabinet/account-section (почта и её смена, язык, демо-роли, выход — в профилях клиента/исполнителя/админа),
                     landing/ (секции лендинга; story — скролл-история «Как это работает»: липкий телефон, 5 сцен, библиотека `motion`), vendor-profile/ (вкладки профиля), vendor-panel/ (offers, calendar, profile-form, documents…),
                     feed/ (post-dialog → post-view: иконки + меню «⋯» с жалобой; post-sheets), demo/ (TryDemoButton), chat/, vendor/, booking/, invitation/{editor,page,rsvp-donut,create-dialog}, auth/,
                     onboarding/, cabinet/, charts/, messages/, brand/
app/manifest.ts      PWA (на экран «Домой», standalone); иконки public/icons/* (сгенерированы sharp из logo.svg). Нижнее меню — плавающая капсула (`bottom-tabbar`/`pb-tabbar` в globals.css); у клиента: лента · приглашения · шар EVENTUS (ассистент, `orb` в nav-items) · сообщения · кабинет. Фон чатов — `chat/logo-watermark`
config/brand.ts      имя («EVENTUS AI» — в UI только через `brand.name`), домен eventusai.app, цвета → CSS-переменные (инжект в app/layout.tsx). Ключи хранилища `eventus-*` не переименовывать — сбросит вход и данные
config/demo.ts       `enabled` — показывать ли демо вообще; `features` — что работает внутри демо (roleSwitcher, vendorAutoReply, baselineOccupancy, reset)
lib/demo/            mode.ts — режим данных `live` | `demo` (`isDemoMode()`, `useIsDemo()`, `demoFeature(x)`); switch.ts — `enterMode()` меняет базу
lib/routes.ts        ВСЕ адреса приложения (`routes.vendor(slug, tab)`, `routes.chat(id)`…) — строками пути не писать
lib/data/
  types.ts           все сущности + `DB` (в конце файла); VendorDocument, Complaint, Vendor.verification
  store.ts           zustand+localStorage: своя база на режим (`DB_STORAGE_KEYS`), `switchDataMode()`, `migrate()`, синхр. вкладок. В app/components не импортировать (ESLint)
  actions/           ВСЕ мутации по доменам (bookings, messaging, vendors, feed, reviews, invitations, events, account, moderation, admin,
                     notifications); все `async` и бросают ошибку; актёр не параметр — `currentActor()` из сессии (= auth.uid()); `asActor()` (async) для тестов;
                     `_core.ts` — uid/now/update; `notify`/`addSystemMessage` — внутренние, из index не экспортируются
  use-action.ts      `useAction()` → `{ run, pending, isPending(key) }`: тост ошибки, защита от двойного клика; `background()` — счётчики/автосейв
  views/             ЧТЕНИЕ для UI: на экран — чистый селектор `selectX(db, …)` + хук `useX(…)` (admin, vendor, client, bookings, messaging,
                     feed, landing, moderation, catalog, availability, users; `_shared.ts` — `BookingView` и join-хелперы). С Supabase селектор → запрос
  policies.ts        права (`Actor`, `can`, `isFinishedDeal`, `DOC_KINDS`, `missingDocs`) = RLS и функции в supabase/migrations
  queries.ts, feed.ts  чистые хелперы для views/ai (searchVendors, activeOffers, conversationsFor…; ранжирование ленты, similarPosts)
  availability.ts    свободно = всего − блок − брони; неоплаченная держит 15 мин; фоновая занятость
  specs.ts           схема характеристик по категориям (цена+период: x, xQty, xPer)
  seed/              buildSeed() — демо целиком; buildLiveSeed() — только каталог (без клиентов и их активности); `SEED_VERSION` — поднять при смене формы сида;
                     catalog, posts, photos (Unsplash), specs, moderation (документы, жалобы, DEFAULT_SETTINGS, DEFAULT_PREPAY_PERCENT)
lib/ai/              protocol, tool-defs (zod), tool-exec (в браузере по стору), claude-agent, deepseek-agent,
                     mock-agent (без ключей), system-prompt, use-chat, chat-store, onboarding-extract; vendor-{protocol,agent,mock} — ИИ-помощник исполнителя (карточку собирает `selectAssistantRequest` в views/messaging)
lib/feed-prefs.ts, lib/photos.ts (файл → data URL)
lib/data/remote-account.ts  мост до этапа 4: итог онбординга → RPC complete_client_onboarding/sign_up_vendor; при входе `syncAccountWithServer` (actions/account) восстанавливает аккаунт с сервера или досылает локальный
lib/auth/            store.ts — вход: live = Supabase Auth (supabase.ts: код на почту, Google OAuth; id аккаунта = auth.uid, админ — из profiles.role; syncLiveSession), без env — имитация; signInDemo(userId?) → режим demo; lib/session.ts — аккаунт вкладки (sessionStorage), роль берётся из профиля; lib/planner.ts — дата/город/гости
lib/payments/        provider.ts (DemoPaymentProvider), escrow.ts (P2P-эскроу, комиссия)
lib/i18n/index.tsx   `useT()`, `t(key, vars)`, `tn(key, n)`; ключи типизированы из messages/ru.json
lib/invitations/design.ts, lib/onboarding/{script,parse,draft}.ts, lib/voice/use-speech.ts
supabase/migrations/ Postgres проекта Supabase «eventus» (Франкфурт, id gtftnpvgdsfkpstdnolf; применены через Supabase MCP): schema (таблицы),
                     rls (политики + хелперы is_admin/owns_vendor…), rpc (create_booking с блокировкой, эскроу confirm/cancel/dispute/payout, sign_up_vendor…),
                     triggers (профиль из auth.users, защита колонок, уведомления, системные сообщения, рейтинг, автоскрытие, pg_cron автовыплата)
supabase/tests/smoke.sql  сквозная проверка под ролями (транзакция с откатом) — гонять после каждой миграции через MCP execute_sql
lib/supabase/        client.ts — браузерный клиент (URL и publishable key — env или публичный дефолт в next.config.ts; прод www.eventusai.app (Vercel), Site URL/Redirect URLs в Supabase Auth); database.types.ts — сгенерированные типы (перегенерировать после миграции)
```
Тесты: `**/__tests__/*.test.ts` (node env, alias `@/`).

## Правила кода
- Чтение в UI — только хук из `lib/data/views/*` (новый экран → селектор + хук там же); запись — только `lib/data/actions/*` с `assert(can.x(currentActor(), …))`. Вызов действия в UI — `run(() => action(…), { success, onSuccess })` + `<Button pending>`; для ввода с клавиатуры (автосейв) — `background()`. Голый вызов без `await`/`void` ловит ESLint `no-floating-promises`; итог действия без результата — в `onSuccess`. Новая сущность → `types.ts` + `DB` + `migrate()` в store.ts + сид + `supabase/schema.sql`.
- Все строки UI — в **оба** `messages/ru.json` и `en.json` (одинаковые ключи; плюралы ru `one|few|many`, en `one|other`). Секции верхнего уровня: common nav home chat catalog vendor booking checkout messages dashboard vp admin invitations auth onboarding escrow feed profile cabinet vcab acab inv landing notif vsetup reviews specs create owner …  Найти секцию: `grep -n '"<секция>": {' messages/ru.json`.
- Тексты сида — `LText` `{ru, en}`.
- Ключи ИИ только на сервере. Порядок провайдеров: DeepSeek → Claude → mock (`AI_PROVIDER` форсит).

## Как вносить изменения (рецепты)
- **Новый экран**: `app/<путь>/page.tsx` + адрес в `lib/routes.ts` + данные хуком из `lib/data/views/<раздел>.ts` (селектор `selectX` + `useX`). Страница > ~300 строк → блоки в `components/<раздел>/*`.
- **Новое действие**: `export async function` в `lib/data/actions/<домен>.ts` (`const actor = currentActor(); assert(can.x(actor, …))`), правило в `policies.ts`, тест в `lib/data/__tests__`.
- **Новое поле/сущность**: `types.ts` → сид (`seed/`) → `migrate()` в store.ts (или поднять `SEED_VERSION`) → новая миграция в `supabase/migrations/` (+ smoke.sql, + типы).
- **Новая строка UI**: ключ в оба `messages/{ru,en}.json`. **Новая секция лендинга**: файл в `components/landing/` + строка в `app/page.tsx`.
- **Что-то только для демо**: `demoFeature("…")` / `useIsDemo()` + флаг в `config/demo.ts` `features`. Реальные аккаунты (режим live) это не видят.

## Дизайн (не нарушать)
Язык референса «Secureon» (ноя 2026), перенесённый на праздники. Палитра (`config/brand.ts` → токены Tailwind): тёплый белый фон `bg-background`, белые `bg-card` и бежевые `bg-cream` блоки, синий `primary`, тёмно-синий `ink` (`surface-ink` = фон+голубое свечение: hero, подвал, тёмные карточки), жёлтый `sun` — главные CTA (`<Button variant="sun">`), золото — рейтинг/«проверен».
- **Блоки без обводок** (просьба пользователя): никаких `border border-border`/`ring-1` у карточек, секций, полей; разделение фоном. Поля — заливка `bg-foreground/[0.045]`. Тонкие линии допустимы только между строками таблиц/списков.
- Кнопки и табы — пилюли (`rounded-full`); активный пункт навигации/таба — `bg-ink text-white` (счётчик `text-sun`). Карточки `rounded-3xl`/`rounded-[28px]`.
- Заголовки — гротеск Golos (`display` utility или `font-heading`), не антиква. Cormorant (`font-serif`) и Marck Script — только внутри приглашений.
- Без AI-slop: никаких эмодзи, блёсток, фиолетовых градиентов. Вместо фото-заглушек — макеты нашего UI (чат, бронь, сделка). Фирменная деталь — точки «свободно N из M». Контейнер `container-app` 1280.

## Известные грабли
- Цены: `settings.hidePrices` (по умолчанию вкл) — клиент не видит цен в ленте/профиле/ассистенте, вместо них «Узнать цену» (`AskPriceButton`, `routes.chat(id, {draft})`); владелец и админ видят. При оформлении брони цена видна всегда. Миграция `…_vendor_ai_assistant.sql` применена; пометку `ai` в messages ставит только service_role (триггер guard_message_ai).
- Закладок нет: лайк = сохранение. `/dashboard/saved` «Понравилось» = лайкнутые посты + исполнители, лайкнутые на карточках ассистента (`db.favorites`); `db.saved` в UI не используется. Поиск ленты: поле только с клавиатурой, категории и сортировка — в кнопке фильтров; без города, даты, бюджета.
- В UI «исполнитель», не «поставщик». Входа «как владелец» нет (убран: доступ к чужому аккаунту без согласия).
- Вкладки на localhost:3000 делят localStorage и режим (демо/live); смена режима в одной вкладке перезагружает остальные. Вкладка со старым кодом может затереть запись — перезагрузи её.
- Нет prettier-конфига: не запускать `prettier --write` (переформатирует под 80 колонок; в проекте строки до ~150).
- Миграции Supabase идут от `supabase_admin`: новая функция по умолчанию доступна `anon`. В каждой миграции — `revoke execute … from public, anon, authenticated` и явный `grant` (образец `…_lock_down_functions.sql`). Проверка — Supabase MCP `get_advisors`.
- Supabase Auth: письма идут через Resend (SMTP `smtp.resend.com`, отправитель `team@eventusai.app`, домен подтверждён, DNS в Cloudflare), лимит 100/ч, код 6 цифр (= `LIVE_OTP_LENGTH`). Шаблоны «Magic link or OTP» и «Confirm sign up» — русский текст с `{{ .Token }}`; меняются только в панели Supabase (у MCP нет доступа к настройкам Auth). Google — Auth → Providers (нужен OAuth-клиент). Данные live-режима пока локальные (этап 4).
- Вторая независимая копия приложения: `http://127.0.0.1:3000` (своё localStorage, `allowedDevOrigins` в next.config) — проверять вход, не трогая вкладки на localhost.
- `AGENTS.md` перезаписывает `next dev` — не редактировать, коммитить как есть.

## Поддержание этого файла
После изменений, которые меняют структуру (новый/удалённый маршрут, модуль, сущность, флаг, команда, правило, грабли) — **обнови соответствующую строку здесь** в том же ходе, коротко. Мелкие правки внутри файла не записывать. История — в git, не сюда. Держи файл < 120 строк.
