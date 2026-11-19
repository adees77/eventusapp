/**
 * Terms of use. Mirrors how the product works: the platform is an intermediary, prepayments go through
 * the escrow (lib/payments/escrow.ts, auto-release after `autoReleaseDays`), vendors pay the commission
 * (`feePercent`), reviews only after a finished deal, auto-hide after `autoHideComplaints` complaints.
 */
import type { LegalDoc } from "./types";

export const TERMS: LegalDoc = {
  title: { ru: "Условия использования", en: "Terms of Use" },
  updated: "2026-11-19",
  intro: {
    ru: "Эти условия — договор между вами и {operator} о пользовании EVENTUS AI. Регистрируясь или пользуясь сервисом, вы их принимаете. Если вы не согласны, пожалуйста, не пользуйтесь сервисом.",
    en: "These terms are an agreement between you and {operator} about using EVENTUS AI. By signing up or using the service you accept them. If you don’t agree, please don’t use the service.",
  },
  sections: [
    {
      id: "service",
      title: { ru: "1. Что такое EVENTUS AI", en: "1. What EVENTUS AI is" },
      blocks: [
        {
          p: {
            ru: "EVENTUS AI — платформа для организации праздников: ИИ-ассистент, лента и профили исполнителей, чат, бронирование с безопасной сделкой и приглашения для гостей.",
            en: "EVENTUS AI is a platform for organising celebrations: an AI assistant, a feed and profiles of vendors, chat, booking with a safe deal and invitations for guests.",
          },
        },
        {
          p: {
            ru: "Мы — посредник. Договор на услугу заключается напрямую между клиентом и исполнителем. Мы проверяем исполнителей, храним предоплату до подтверждения сделки и помогаем решать споры, но сами услуги не оказываем и не отвечаем за их качество.",
            en: "We are an intermediary. The service contract is made directly between the client and the vendor. We verify vendors, hold the prepayment until the deal is confirmed and help resolve disputes, but we don’t provide the services ourselves and aren’t responsible for their quality.",
          },
        },
      ],
    },
    {
      id: "account",
      title: { ru: "2. Аккаунт", en: "2. Your account" },
      blocks: [
        {
          list: [
            { ru: "Пользоваться сервисом могут люди старше 18 лет.", en: "You must be over 18 to use the service." },
            { ru: "Указывайте правдивые данные и держите их актуальными.", en: "Give truthful details and keep them up to date." },
            { ru: "Не передавайте доступ к аккаунту другим; за действия в аккаунте отвечает его владелец.", en: "Don’t share access to your account; its owner is responsible for what happens in it." },
            { ru: "Мы можем ограничить или заблокировать аккаунт за нарушение этих условий.", en: "We may limit or block an account that breaks these terms." },
          ],
        },
      ],
    },
    {
      id: "booking",
      title: { ru: "3. Брони и безопасная сделка", en: "3. Bookings and the safe deal" },
      blocks: [
        {
          list: [
            {
              ru: "Цены и условия услуг устанавливает исполнитель. Цена может быть скрыта до запроса в чате, но при оформлении брони вы всегда видите сумму.",
              en: "Vendors set their prices and terms. A price may be hidden until you ask in chat, but you always see the amount when booking.",
            },
            {
              ru: "Бронь подтверждается предоплатой. Предоплата хранится на счёте EVENTUS AI и уходит исполнителю, когда обе стороны подтвердили сделку.",
              en: "A booking is secured by a prepayment. It is held in an EVENTUS AI account and goes to the vendor once both sides confirm the deal.",
            },
            {
              ru: "Если через {days} дн. после даты праздника никто не открыл спор, предоплата автоматически уходит исполнителю.",
              en: "If no dispute is opened within {days} days after the event date, the prepayment goes to the vendor automatically.",
            },
            {
              ru: "Если бронь отменена до того, как обе стороны подтвердили сделку, предоплата возвращается клиенту.",
              en: "If a booking is cancelled before both sides confirm the deal, the prepayment returns to the client.",
            },
            {
              ru: "Если что-то пошло не так, откройте спор: команда EVENTUS AI изучит переписку и решит, вернуть деньги клиенту или передать исполнителю.",
              en: "If something goes wrong, open a dispute: the EVENTUS AI team reviews the chat and decides whether the money returns to the client or goes to the vendor.",
            },
            {
              ru: "Защита безопасной сделки действует только для оплат, проведённых через EVENTUS AI.",
              en: "The safe-deal protection covers only payments made through EVENTUS AI.",
            },
          ],
        },
      ],
    },
    {
      id: "vendors",
      title: { ru: "4. Для исполнителей", en: "4. For vendors" },
      blocks: [
        {
          list: [
            { ru: "Размещайте только правдивую информацию: свои работы, реальные услуги, цены и свободные даты.", en: "Post only truthful information: your own work, real services, prices and free dates." },
            { ru: "Для отметки «Проверен» загрузите документы; мы можем отказать в проверке или снять отметку.", en: "Upload documents to get the «Verified» badge; we may refuse verification or remove the badge." },
            { ru: "Держите календарь актуальным и выполняйте подтверждённые брони.", en: "Keep your calendar up to date and honour confirmed bookings." },
            {
              ru: "Регистрация и размещение бесплатны. Комиссия — {fee}% — удерживается только с состоявшихся сделок при выплате; актуальный размер указан в кабинете.",
              en: "Signing up and listing are free. The commission — {fee}% — is deducted only from completed deals at payout; the current rate is shown in your cabinet.",
            },
            {
              ru: "ИИ-помощник отвечает клиентам от вашего имени по данным вашего профиля, услуг и календаря. Вы отвечаете за эти данные и можете выключить помощника в настройках.",
              en: "The AI assistant replies to clients on your behalf using your profile, services and calendar. You are responsible for that data and can switch the assistant off in settings.",
            },
          ],
        },
      ],
    },
    {
      id: "ai",
      title: { ru: "5. ИИ-ассистент", en: "5. The AI assistant" },
      blocks: [
        {
          p: {
            ru: "Ассистент помогает спланировать праздник и подобрать исполнителей, но может ошибаться. Проверяйте детали с исполнителем. Бронь действует только после подтверждения на платформе, а не после слов ассистента.",
            en: "The assistant helps plan the celebration and find vendors, but it can make mistakes. Check details with the vendor. A booking is valid only once it is confirmed on the platform, not because the assistant said so.",
          },
        },
      ],
    },
    {
      id: "content",
      title: { ru: "6. Контент и отзывы", en: "6. Content and reviews" },
      blocks: [
        {
          p: {
            ru: "Права на ваши фото и тексты остаются у вас. Размещая их, вы подтверждаете, что имеете на это право, и разрешаете EVENTUS AI бесплатно показывать их в сервисе, в том числе на страницах о сервисе.",
            en: "You keep the rights to your photos and texts. By posting them you confirm you have the right to do so and allow EVENTUS AI to show them in the service free of charge, including on pages about the service.",
          },
        },
        {
          p: {
            ru: "Отзыв может оставить только клиент после состоявшейся сделки. Отзывы за плату, от себя или от конкурентов запрещены.",
            en: "Only a client with a completed deal can leave a review. Paid reviews, reviews of yourself or of competitors are forbidden.",
          },
        },
      ],
    },
    {
      id: "rules",
      title: { ru: "7. Что запрещено", en: "7. What is not allowed" },
      blocks: [
        {
          list: [
            { ru: "незаконные услуги, обман и попытки получить деньги в обход договорённостей;", en: "illegal services, fraud and attempts to take money against what was agreed;" },
            { ru: "спам, оскорбления и угрозы;", en: "spam, insults and threats;" },
            { ru: "размещение чужих данных, фото и работ без согласия;", en: "posting other people’s data, photos or work without consent;" },
            { ru: "автоматический сбор данных, взлом и вмешательство в работу сервиса.", en: "automated data collection, hacking and interfering with the service." },
          ],
        },
        {
          p: {
            ru: "На публикацию можно пожаловаться. После {complaints} жалоб она скрывается до проверки модератором. Мы можем удалить контент, нарушающий эти условия, и заблокировать аккаунт.",
            en: "Anyone can report a post. After {complaints} reports it is hidden until a moderator checks it. We may remove content that breaks these terms and block the account.",
          },
        },
      ],
    },
    {
      id: "liability",
      title: { ru: "8. Ответственность", en: "8. Liability" },
      blocks: [
        {
          p: {
            ru: "Мы стараемся, чтобы сервис работал без перебоев, но предоставляем его «как есть». Мы не отвечаем за действия пользователей, за исполнение договоров между клиентами и исполнителями и за перебои, вызванные не нами. Наша ответственность ограничена в пределах, которые допускает закон.",
            en: "We work to keep the service running, but provide it «as is». We aren’t responsible for users’ actions, for the performance of contracts between clients and vendors, or for outages we didn’t cause. Our liability is limited to the extent the law allows.",
          },
        },
        {
          p: {
            ru: "Пока сервис работает в демо-режиме, данные в нём демонстрационные, а оплаты не проводятся.",
            en: "While the service runs in demo mode, its data is for demonstration and no payments are made.",
          },
        },
      ],
    },
    {
      id: "law",
      title: { ru: "9. Изменения, право и споры", en: "9. Changes, law and disputes" },
      blocks: [
        {
          p: {
            ru: "Мы можем менять условия, публикуя новую редакцию на этой странице; о важных изменениях сообщим заранее. Условия регулируются законодательством Кыргызской Республики. Споры решаются сначала переговорами, а если договориться не удалось — в суде по месту нахождения оператора в г. Бишкек.",
            en: "We may change these terms by publishing a new edition on this page and will announce important changes in advance. The terms are governed by the laws of the Kyrgyz Republic. Disputes are settled by negotiation first and, failing that, in court at the operator’s location in Bishkek.",
          },
        },
        {
          p: {
            ru: "Связаться с нами: {email}. {operator}, {address}.",
            en: "Contact us: {email}. {operator}, {address}.",
          },
        },
      ],
    },
  ],
};
