/**
 * Invitation templates: a visual style plus ready wording for an occasion.
 * Picking a template copies the texts into a new Invitation in the current
 * locale — after that the invitation is the user's own and edits freely.
 */
import { designFromLegacy } from "@/lib/invitations/design";
import { PHOTOS, unsplash } from "./seed/photos";
import type { Invitation, InvitationOccasion, InvitationStyle, LText } from "./types";

export interface InvitationTemplate {
  id: string;
  occasion: InvitationOccasion;
  style: InvitationStyle;
  name: LText;
  heading: LText;
  names: LText;
  message: LText;
  dressCode?: LText;
  time: string;
  photo?: string;
}

export const OCCASIONS: InvitationOccasion[] = ["wedding", "kyzUzatuu", "birthday", "jubilee", "sunnot", "corporate"];
export const STYLES: InvitationStyle[] = ["classic", "minimal", "night", "arch", "ornament", "photo"];

const weddingMessage: LText = {
  ru: "С радостью приглашаем вас разделить с нами самый важный день — день нашей свадьбы.",
  en: "We would be delighted to have you with us on the most important day of our lives — our wedding day.",
};

export const INVITATION_TEMPLATES: InvitationTemplate[] = [
  {
    id: "t-wedding-classic",
    occasion: "wedding",
    style: "classic",
    name: { ru: "Классика", en: "Classic" },
    heading: { ru: "Приглашение на свадьбу", en: "Wedding invitation" },
    names: { ru: "Айгерим и Тимур", en: "Aigerim & Timur" },
    message: weddingMessage,
    dressCode: { ru: "Вечерний, пастельные тона", en: "Evening wear, pastel tones" },
    time: "17:00",
  },
  {
    id: "t-wedding-arch",
    occasion: "wedding",
    style: "arch",
    name: { ru: "Арка", en: "Arch" },
    heading: { ru: "Мы женимся", en: "We are getting married" },
    names: { ru: "Айгерим и Тимур", en: "Aigerim & Timur" },
    message: {
      ru: "Будем счастливы видеть вас среди самых близких в день, когда начнётся наша семья.",
      en: "It would mean the world to have you among our closest people on the day our family begins.",
    },
    time: "16:00",
  },
  {
    id: "t-wedding-photo",
    occasion: "wedding",
    style: "photo",
    name: { ru: "С фотографией", en: "With a photo" },
    heading: { ru: "Свадьба", en: "Wedding" },
    names: { ru: "Айгерим и Тимур", en: "Aigerim & Timur" },
    message: weddingMessage,
    time: "17:00",
    photo: unsplash(PHOTOS.decor[0], 1000, 700),
  },
  {
    id: "t-kyz-ornament",
    occasion: "kyzUzatuu",
    style: "ornament",
    name: { ru: "Орнамент", en: "Ornament" },
    heading: { ru: "Кыз узатуу", en: "Kyz uzatuu" },
    names: { ru: "Айгерим", en: "Aigerim" },
    message: {
      ru: "Приглашаем вас на проводы нашей дочери. Ждём вас, чтобы вместе благословить её в новую жизнь.",
      en: "Please join us as we see our daughter off to her new family and give her our blessing.",
    },
    dressCode: { ru: "Национальные мотивы приветствуются", en: "National motifs are welcome" },
    time: "18:00",
  },
  {
    id: "t-sunnot-ornament",
    occasion: "sunnot",
    style: "ornament",
    name: { ru: "Орнамент", en: "Ornament" },
    heading: { ru: "Сүннөт той", en: "Sunnot toi" },
    names: { ru: "Алихан", en: "Alikhan" },
    message: {
      ru: "Приглашаем вас на сүннөт той нашего сына. Ваше присутствие — лучший подарок для нашей семьи.",
      en: "You are invited to our son's sunnot toi. Your presence is the best gift for our family.",
    },
    time: "13:00",
  },
  {
    id: "t-birthday-minimal",
    occasion: "birthday",
    style: "minimal",
    name: { ru: "Минимал", en: "Minimal" },
    heading: { ru: "День рождения", en: "Birthday" },
    names: { ru: "Дана, 30", en: "Dana, 30" },
    message: {
      ru: "Отмечаем тридцать — без лишнего пафоса, но с хорошей музыкой и любимыми людьми.",
      en: "Turning thirty — no fuss, just good music and the people I love.",
    },
    time: "19:00",
  },
  {
    id: "t-birthday-night",
    occasion: "birthday",
    style: "night",
    name: { ru: "Вечер", en: "Evening" },
    heading: { ru: "Приглашение на праздник", en: "You are invited" },
    names: { ru: "Нурсултан", en: "Nursultan" },
    message: {
      ru: "Будем рады видеть вас на ужине в честь моего дня рождения.",
      en: "I'd be glad to see you at a dinner in honour of my birthday.",
    },
    dressCode: { ru: "Black tie", en: "Black tie" },
    time: "19:30",
  },
  {
    id: "t-jubilee-classic",
    occasion: "jubilee",
    style: "classic",
    name: { ru: "Классика", en: "Classic" },
    heading: { ru: "Юбилей", en: "Anniversary" },
    names: { ru: "Гульнара Асановна, 60", en: "Gulnara, 60" },
    message: {
      ru: "Дети и внуки приглашают вас разделить радость юбилея нашей мамы и бабушки.",
      en: "Children and grandchildren invite you to celebrate our mother and grandmother's anniversary.",
    },
    time: "17:00",
  },
  {
    id: "t-jubilee-night",
    occasion: "jubilee",
    style: "night",
    name: { ru: "Вечер", en: "Evening" },
    heading: { ru: "Золотая свадьба", en: "Golden anniversary" },
    names: { ru: "Бакыт и Айнура", en: "Bakyt & Ainura" },
    message: {
      ru: "Пятьдесят лет вместе. Приглашаем отметить этот день с семьёй и друзьями.",
      en: "Fifty years together. Join our family and friends to mark the day.",
    },
    time: "18:00",
  },
  {
    id: "t-corporate-minimal",
    occasion: "corporate",
    style: "minimal",
    name: { ru: "Минимал", en: "Minimal" },
    heading: { ru: "Корпоративный вечер", en: "Company evening" },
    names: { ru: "Итоги года", en: "Year in review" },
    message: {
      ru: "Подводим итоги года вместе: награждение, ужин и живая музыка.",
      en: "Let's wrap up the year together: awards, dinner and live music.",
    },
    dressCode: { ru: "Smart casual", en: "Smart casual" },
    time: "19:00",
  },
];

export function templateById(id: string | undefined) {
  return INVITATION_TEMPLATES.find((t) => t.id === id);
}

/** Fields for a new invitation started from a template (or blank), in the given locale */
export function draftFromTemplate(
  tpl: InvitationTemplate | undefined,
  locale: "ru" | "en",
  event?: { id: string; date: string },
): Omit<Invitation, "id" | "ownerId" | "rsvps" | "guests" | "views" | "createdAt" | "updatedAt"> {
  const pick = (x: LText | undefined) => (x ? x[locale] : "");
  const fields = {
    eventId: event?.id,
    templateId: tpl?.id,
    style: tpl?.style ?? "classic",
    occasion: tpl?.occasion ?? "wedding",
    heading: pick(tpl?.heading),
    names: pick(tpl?.names),
    message: pick(tpl?.message),
    dressCode: pick(tpl?.dressCode) || undefined,
    date: event?.date ?? "",
    time: tpl?.time ?? "18:00",
    venue: "",
    address: "",
    photo: tpl?.photo ?? (tpl?.style === "photo" ? INVITATION_PHOTOS[0] : undefined),
  };
  return { ...fields, design: designFromLegacy({ ...fields, contact: undefined }) };
}

/** Photos offered for the "photo" style */
export const INVITATION_PHOTOS = [
  unsplash(PHOTOS.decor[0], 1000, 700),
  unsplash(PHOTOS.decor[1], 1000, 700),
  unsplash(PHOTOS.halls[0], 1000, 700),
  unsplash(PHOTOS.halls[1], 1000, 700),
  unsplash(PHOTOS.decor[2], 1000, 700),
];
