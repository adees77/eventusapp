/**
 * Privacy policy. Describes what the code actually collects (lib/data/types.ts, lib/ai, lib/voice,
 * lib/analytics) and every provider data goes to. Keep it in sync when that changes.
 */
import type { LegalDoc } from "./types";

export const PRIVACY: LegalDoc = {
  title: { ru: "Политика конфиденциальности", en: "Privacy Policy" },
  updated: "2026-11-19",
  intro: {
    ru: "Здесь простыми словами описано, какие данные собирает EVENTUS AI, зачем, где они хранятся и как вы можете ими управлять. Политика действует для всех, кто пользуется сайтом и приложением: клиентов, исполнителей, гостей приглашений и посетителей.",
    en: "This page explains in plain words what data EVENTUS AI collects, why, where it is stored and how you can control it. It applies to everyone who uses the site and the app: clients, vendors, invitation guests and visitors.",
  },
  sections: [
    {
      id: "general",
      title: { ru: "1. Кто обрабатывает данные", en: "1. Who processes the data" },
      blocks: [
        {
          p: {
            ru: "Оператор персональных данных — {operator} ({address}). Мы обрабатываем данные в соответствии с Законом Кыргызской Республики «Об информации персонального характера» и этой политикой.",
            en: "The data controller is {operator} ({address}). We process data under the Law of the Kyrgyz Republic «On Personal Information» and this policy.",
          },
        },
        {
          p: {
            ru: "Регистрируясь или пользуясь сервисом, вы соглашаетесь на обработку данных так, как описано ниже. Согласие можно отозвать в любой момент — напишите нам на {email} или удалите аккаунт.",
            en: "By signing up or using the service you agree to the processing described below. You can withdraw consent at any time by writing to {email} or deleting your account.",
          },
        },
      ],
    },
    {
      id: "data",
      title: { ru: "2. Какие данные мы собираем", en: "2. What data we collect" },
      blocks: [
        {
          list: [
            {
              ru: "Аккаунт: имя, электронная почта, телефон (если вы его указали), фото профиля, город и роль (клиент или исполнитель). При входе через Google — имя, почта и фото из вашего аккаунта Google.",
              en: "Account: name, email, phone (if you added it), profile photo, city and role (client or vendor). With Google sign-in — the name, email and photo from your Google account.",
            },
            {
              ru: "Праздник: дата, город, число гостей, бюджет и пожелания, которые вы сообщаете ассистенту или в анкете.",
              en: "Your event: date, city, number of guests, budget and wishes you share with the assistant or in the questionnaire.",
            },
            {
              ru: "Переписка: сообщения исполнителям и ИИ-ассистенту. Голосовые запросы мы получаем уже в виде текста.",
              en: "Messages: what you write to vendors and to the AI assistant. Voice requests reach us as text.",
            },
            {
              ru: "Для исполнителей: название, описание, фото работ, услуги и цены, календарь занятости и документы для проверки (паспорт, свидетельство о регистрации, лицензии, договоры).",
              en: "For vendors: business name, description, portfolio photos, services and prices, availability calendar and verification documents (passport, business registration, licences, contracts).",
            },
            {
              ru: "Брони и оплаты: что, когда и у кого забронировано, суммы, статусы предоплаты, выплат и споров. Данные банковских карт мы не получаем и не храним — их обрабатывает платёжный партнёр.",
              en: "Bookings and payments: what was booked, when and with whom, amounts, and the status of prepayments, payouts and disputes. We never receive or store card details — the payment partner handles them.",
            },
            {
              ru: "Приглашения: имена гостей и, если хозяин их указал, телефоны; ответы гостей (придут ли, сколько человек, комментарий) и отметки, что приглашение открыто.",
              en: "Invitations: guest names and, if the host added them, phone numbers; guests’ replies (attending or not, how many people, a note) and marks that an invitation was opened.",
            },
            {
              ru: "Отзывы, лайки и жалобы.",
              en: "Reviews, likes and complaints.",
            },
            {
              ru: "Технические данные: IP-адрес, тип устройства и браузера, время запросов — в журналах хостинга. С вашего согласия — данные о том, как вы пользуетесь сайтом (раздел 7).",
              en: "Technical data: IP address, device and browser type, request times — in hosting logs. With your consent — data about how you use the site (section 7).",
            },
          ],
        },
        {
          p: {
            ru: "В демо-режиме данные хранятся только в вашем браузере; наружу уходят лишь сообщения ИИ-ассистенту.",
            en: "In demo mode data stays in your browser; only messages to the AI assistant leave it.",
          },
        },
      ],
    },
    {
      id: "purposes",
      title: { ru: "3. Зачем мы это делаем", en: "3. Why we use it" },
      blocks: [
        {
          list: [
            { ru: "Регистрация, вход и работа аккаунта.", en: "Sign-up, sign-in and running your account." },
            { ru: "Подбор исполнителей, свободных на вашу дату и подходящих по бюджету.", en: "Finding vendors who are free on your date and fit your budget." },
            { ru: "Брони, безопасная сделка, выплаты исполнителям и разбор споров.", en: "Bookings, the safe deal, payouts to vendors and dispute resolution." },
            { ru: "Связь клиента и исполнителя в чате.", en: "Chat between clients and vendors." },
            { ru: "Проверка исполнителей и отметка «Проверен».", en: "Vendor verification and the «Verified» badge." },
            { ru: "Приглашения и сбор ответов гостей.", en: "Invitations and collecting guests’ replies." },
            { ru: "Письма с кодом входа и уведомления о бронях.", en: "Emails with sign-in codes and booking notifications." },
            { ru: "Безопасность, модерация и поддержка.", en: "Security, moderation and support." },
            { ru: "Улучшение сервиса — только с вашего согласия на аналитику.", en: "Improving the service — only with your consent to analytics." },
          ],
        },
        {
          p: {
            ru: "Мы не продаём ваши данные и не используем их для чужой рекламы.",
            en: "We do not sell your data or use it for third-party advertising.",
          },
        },
      ],
    },
    {
      id: "ai",
      title: { ru: "4. ИИ-ассистент и голосовой ввод", en: "4. AI assistant and voice input" },
      blocks: [
        {
          p: {
            ru: "Сообщения ИИ-ассистенту и ИИ-помощнику исполнителя передаются поставщику языковой модели (DeepSeek или Anthropic) только для того, чтобы получить ответ. Не пишите в чат паспортные данные, номера карт и другие сведения, которые не нужны для праздника.",
            en: "Messages to the AI assistant and to a vendor’s AI assistant are sent to a language-model provider (DeepSeek or Anthropic) only to get a reply. Please don’t write passport data, card numbers or anything not needed for the event.",
          },
        },
        {
          p: {
            ru: "ИИ-помощник исполнителя отвечает от его имени и видит переписку в чате с этим исполнителем. Голосовой ввод распознаёт ваш браузер (в Chrome — сервис Google, в Safari — Apple); мы получаем только текст.",
            en: "A vendor’s AI assistant replies on the vendor’s behalf and sees the conversation with that vendor. Voice input is recognised by your browser (Google in Chrome, Apple in Safari); we receive only the text.",
          },
        },
      ],
    },
    {
      id: "sharing",
      title: { ru: "5. Кому мы передаём данные", en: "5. Who we share data with" },
      blocks: [
        {
          p: {
            ru: "Только тем, без кого сервис не работает, и только в нужном объёме:",
            en: "Only those the service can’t work without, and only what they need:",
          },
        },
        {
          list: [
            { ru: "Исполнителю — данные брони и переписки с ним: имя, дата, детали праздника.", en: "The vendor — booking and chat details: name, date, event details." },
            { ru: "Гостям — то, что хозяин разместил в приглашении.", en: "Guests — what the host put in the invitation." },
            { ru: "Supabase — база данных и вход в аккаунт (серверы в Германии, ЕС).", en: "Supabase — database and sign-in (servers in Germany, EU)." },
            { ru: "Vercel — хостинг сайта и журналы запросов.", en: "Vercel — site hosting and request logs." },
            { ru: "Resend — отправка писем с кодом входа.", en: "Resend — sending sign-in code emails." },
            { ru: "Google — вход через аккаунт Google, если вы его выбрали.", en: "Google — sign-in with a Google account, if you choose it." },
            { ru: "DeepSeek (Китай) и Anthropic (США) — ответы ИИ-ассистента.", en: "DeepSeek (China) and Anthropic (USA) — AI assistant replies." },
            { ru: "PostHog — аналитика (серверы в ЕС), только с вашего согласия.", en: "PostHog — analytics (servers in the EU), only with your consent." },
            { ru: "Unsplash — часть иллюстраций загружается с его серверов.", en: "Unsplash — some illustrations load from its servers." },
            { ru: "Платёжный партнёр — когда будут подключены реальные оплаты.", en: "A payment partner — once real payments are enabled." },
            { ru: "Государственные органы — только по требованию закона.", en: "Public authorities — only when the law requires it." },
          ],
        },
        {
          p: {
            ru: "Часть этих сервисов находится за пределами Кыргызстана (ЕС, США, Китай). Пользуясь сервисом, вы соглашаетесь на такую трансграничную передачу.",
            en: "Some of these providers are outside Kyrgyzstan (EU, USA, China). By using the service you agree to this cross-border transfer.",
          },
        },
      ],
    },
    {
      id: "cookies",
      title: { ru: "6. Cookie и хранилище браузера", en: "6. Cookies and browser storage" },
      blocks: [
        {
          p: {
            ru: "Необходимые — без них сайт не работает, согласие не требуется:",
            en: "Necessary — the site doesn’t work without them, no consent needed:",
          },
        },
        {
          list: [
            { ru: "cookie eventus-locale — выбранный язык, хранится 1 год;", en: "cookie eventus-locale — your language, kept for 1 year;" },
            { ru: "localStorage eventus-supabase-auth, eventus-auth — вход в аккаунт;", en: "localStorage eventus-supabase-auth, eventus-auth — staying signed in;" },
            { ru: "localStorage eventus-db-v1, eventus-chats-v1 и другие eventus-* — данные приложения и черновики на вашем устройстве;", en: "localStorage eventus-db-v1, eventus-chats-v1 and other eventus-* keys — app data and drafts on your device;" },
            { ru: "localStorage eventus-consent — ваш выбор в этом баннере; sessionStorage eventus-session — аккаунт в текущей вкладке.", en: "localStorage eventus-consent — your choice in the cookie banner; sessionStorage eventus-session — the account in the current tab." },
          ],
        },
        {
          p: {
            ru: "Аналитические — только если вы их разрешили: cookie и записи PostHog (ph_*) и случайный идентификатор для A/B-тестов (eventus-anon).",
            en: "Analytics — only if you allow them: PostHog cookies and storage (ph_*) and a random id for A/B tests (eventus-anon).",
          },
        },
        {
          p: {
            ru: "Изменить выбор можно в любой момент: «Настройки cookie» внизу страницы. Удалить всё — очистить данные сайта в настройках браузера.",
            en: "Change your choice at any time with «Cookie settings» at the bottom of the page. To remove everything, clear the site data in your browser settings.",
          },
        },
      ],
    },
    {
      id: "analytics",
      title: { ru: "7. Аналитика", en: "7. Analytics" },
      blocks: [
        {
          p: {
            ru: "С вашего согласия мы измеряем, как люди пользуются сервисом, чтобы делать его удобнее и сравнивать варианты экранов (A/B-тесты):",
            en: "With your consent we measure how people use the service, to make it easier and to compare screen variants (A/B tests):",
          },
        },
        {
          list: [
            { ru: "какие страницы открывают (адрес без параметров);", en: "which pages are opened (the address without parameters);" },
            { ru: "на какие кнопки и ссылки нажимают;", en: "which buttons and links are pressed;" },
            {
              ru: "ключевые шаги: начало регистрации, сообщение ассистенту (только длина, без текста), бронь, оплата предоплаты, создание приглашения, публикация поста;",
              en: "key steps: starting sign-up, a message to the assistant (length only, no text), a booking, a prepayment, creating an invitation, publishing a post;",
            },
            { ru: "какой вариант A/B-теста вы видели;", en: "which A/B test variant you saw;" },
            { ru: "тип устройства и браузера, примерная страна и город по IP.", en: "device and browser type, approximate country and city from the IP address." },
          ],
        },
        {
          p: {
            ru: "Мы не отправляем в аналитику текст сообщений и запросов, имена, телефоны, почту, документы и то, что вы вводите в поля, и не записываем экран. События привязываются к аккаунту только по внутреннему номеру. Без вашего согласия аналитика не загружается.",
            en: "We never send message or request text, names, phones, emails, documents or anything you type into fields, and we don’t record your screen. Events are linked to an account only by an internal id. Without your consent analytics doesn’t load.",
          },
        },
      ],
    },
    {
      id: "retention",
      title: { ru: "8. Сколько мы храним данные", en: "8. How long we keep data" },
      blocks: [
        {
          list: [
            { ru: "Данные аккаунта — пока аккаунт активен. После удаления — удаляем или обезличиваем в течение 30 дней.", en: "Account data — while the account is active. After deletion we erase or anonymise it within 30 days." },
            { ru: "Брони, оплаты и споры — столько, сколько требует закон и учёт, и до окончания возможных споров.", en: "Bookings, payments and disputes — as long as law and accounting require, and until possible disputes end." },
            { ru: "Документы исполнителей — пока действует профиль исполнителя.", en: "Vendor documents — while the vendor profile exists." },
            { ru: "Аналитика — до 12 месяцев. Журналы хостинга — по правилам хостинга, обычно до 30 дней.", en: "Analytics — up to 12 months. Hosting logs — under the host’s rules, usually up to 30 days." },
          ],
        },
      ],
    },
    {
      id: "rights",
      title: { ru: "9. Ваши права", en: "9. Your rights" },
      blocks: [
        {
          p: {
            ru: "Вы можете узнать, какие данные о вас есть, исправить их, удалить аккаунт, отозвать согласие и отказаться от аналитики. Напишите на {email} — ответим в течение 30 дней. Если считаете, что мы нарушаем ваши права, вы можете обратиться в уполномоченный орган по защите персональных данных Кыргызской Республики.",
            en: "You can find out what data we hold about you, correct it, delete your account, withdraw consent and opt out of analytics. Write to {email} — we reply within 30 days. If you believe we violate your rights, you can contact the personal data protection authority of the Kyrgyz Republic.",
          },
        },
      ],
    },
    {
      id: "security",
      title: { ru: "10. Безопасность", en: "10. Security" },
      blocks: [
        {
          p: {
            ru: "Соединение шифруется (HTTPS). Вход — по одноразовому коду или через Google, без паролей. Доступ к данным ограничен правилами на уровне базы данных: каждый видит только своё, документы исполнителей — только администраторы проверки.",
            en: "Connections are encrypted (HTTPS). Sign-in uses a one-time code or Google, with no passwords. Database rules limit access: everyone sees only their own data, and vendor documents are visible only to verification admins.",
          },
        },
      ],
    },
    {
      id: "age",
      title: { ru: "11. Возраст", en: "11. Age" },
      blocks: [
        {
          p: {
            ru: "Сервис предназначен для людей старше 18 лет. Гости приглашений могут быть любого возраста — их данные указывает хозяин праздника.",
            en: "The service is for people over 18. Invitation guests can be any age — their details are added by the host.",
          },
        },
      ],
    },
    {
      id: "changes",
      title: { ru: "12. Изменения и контакты", en: "12. Changes and contacts" },
      blocks: [
        {
          p: {
            ru: "Если политика изменится, мы обновим дату вверху страницы, а о важных изменениях сообщим на сайте или по почте. Если появится новая цель аналитики, мы снова спросим согласие.",
            en: "If this policy changes we update the date at the top, and announce important changes on the site or by email. If a new analytics purpose appears, we ask for consent again.",
          },
        },
        {
          p: {
            ru: "Вопросы о данных: {email}. {operator}, {address}.",
            en: "Questions about your data: {email}. {operator}, {address}.",
          },
        },
      ],
    },
  ],
};
