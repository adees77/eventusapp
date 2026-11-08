import type { Category, LText } from "../types";

export const CATEGORIES: Category[] = [
  { id: "cars", name: { ru: "Кортежи", en: "Motorcades" }, icon: "car", order: 1 },
  { id: "halls", name: { ru: "Банкетные залы", en: "Banquet halls" }, icon: "landmark", order: 2 },
  { id: "hosts", name: { ru: "Ведущие", en: "Hosts" }, icon: "mic", order: 3 },
  { id: "photo", name: { ru: "Фото и видео", en: "Photo & video" }, icon: "camera", order: 4 },
  { id: "decor", name: { ru: "Декор и флористика", en: "Decor & florals" }, icon: "flower", order: 5 },
  { id: "music", name: { ru: "Музыка и артисты", en: "Music & artists" }, icon: "music", order: 6 },
  { id: "furniture", name: { ru: "Мебель и столы", en: "Furniture & tables" }, icon: "armchair", order: 7 },
  { id: "cakes", name: { ru: "Торты", en: "Cakes" }, icon: "cake", order: 8 },
  { id: "beauty", name: { ru: "Визаж и причёски", en: "Makeup & hair" }, icon: "sparkle", order: 9 },
  { id: "attire", name: { ru: "Платья и костюмы", en: "Dresses & suits" }, icon: "shirt", order: 10 },
  { id: "traditional", name: { ru: "Той-атрибутика", en: "Traditional items" }, icon: "tent", order: 11 },
  { id: "shows", name: { ru: "Шоу и фейерверки", en: "Shows & fireworks" }, icon: "flame", order: 12 },
];

export const CITIES: Record<string, LText> = {
  bishkek: { ru: "Бишкек", en: "Bishkek" },
  "cholpon-ata": { ru: "Чолпон-Ата", en: "Cholpon-Ata" },
  osh: { ru: "Ош", en: "Osh" },
};

export const REVIEW_AUTHORS = [
  "Айгерим К.",
  "Нурбек А.",
  "Динара С.",
  "Элнура Т.",
  "Санжар М.",
  "Мээрим Ж.",
  "Анна В.",
  "Тилек Б.",
  "Айпери О.",
  "Жаныл Р.",
  "Улан К.",
  "Камила Д.",
];

/** Generic review templates, adapted by category where it matters */
export const REVIEW_TEMPLATES: { rating: number; text: LText }[] = [
  {
    rating: 5,
    text: {
      ru: "Всё прошло идеально, приехали вовремя, всё как договаривались. Рекомендуем!",
      en: "Everything went perfectly, on time and exactly as agreed. Highly recommend!",
    },
  },
  {
    rating: 5,
    text: {
      ru: "Очень внимательное отношение, ответили на все вопросы ещё до брони. Спасибо за наш день!",
      en: "Very attentive, answered every question before we booked. Thank you for our day!",
    },
  },
  {
    rating: 5,
    text: {
      ru: "Гости до сих пор вспоминают. Цена полностью соответствует качеству.",
      en: "Our guests still talk about it. Worth every som.",
    },
  },
  {
    rating: 4,
    text: {
      ru: "В целом отлично, немного задержались с началом, но быстро всё наверстали.",
      en: "Great overall, started a little late but quickly made up for it.",
    },
  },
  {
    rating: 5,
    text: {
      ru: "Бронировали через платформу за две минуты, сразу списались в чате. Очень удобно.",
      en: "Booked through the platform in two minutes and chatted right away. Very convenient.",
    },
  },
  {
    rating: 4,
    text: {
      ru: "Хороший сервис, приятная команда. Хотелось бы чуть больше вариантов, но результатом довольны.",
      en: "Good service, lovely team. Would like a few more options, but we're happy with the result.",
    },
  },
];
