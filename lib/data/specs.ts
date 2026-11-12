/**
 * Category-specific vendor details: what a client needs to know before booking
 * (the fleet and its prices, hall area, seats and menus, languages of a host…).
 * One schema drives the vendor form, the profile «Подробно» tab and the short
 * facts shown over feed posts.
 *
 * Prices carry their own period: the vendor says «3 000 сом за час»,
 * «45 000 сом за 4 часа», «25 000 за день» or «2 500 за гостя» — not only hourly.
 * A price field `x` is stored as `x` (amount), `xQty` (how many periods, >1 only)
 * and `xPer` (period id); a duration field `x` as `x` (quantity) and `xPer`.
 */
import type { CategoryId, LText, SpecItem, SpecValue, VendorSpecs } from "./types";

type Opt = { id: string; label: LText };

// ── Periods ─────────────────────────────────────────────────────

/** Billing periods. Forms are «one|few|many» (ru) and «one|other» (en). */
export const PERIODS = {
  hour: { ru: "час|часа|часов", en: "hour|hours" },
  day: { ru: "день|дня|дней", en: "day|days" },
  event: { ru: "мероприятие|мероприятия|мероприятий", en: "event|events" },
  evening: { ru: "вечер|вечера|вечеров", en: "evening|evenings" },
  guest: { ru: "гость|гостя|гостей", en: "guest|guests" },
  person: { ru: "человек|человека|человек", en: "person|people" },
  look: { ru: "образ|образа|образов", en: "look|looks" },
  piece: { ru: "штука|штуки|штук", en: "piece|pieces" },
  set: { ru: "комплект|комплекта|комплектов", en: "set|sets" },
  kg: { ru: "кг|кг|кг", en: "kg|kg" },
  show: { ru: "шоу|шоу|шоу", en: "show|shows" },
  minute: { ru: "минута|минуты|минут", en: "minute|minutes" },
  km: { ru: "км|км|км", en: "km|km" },
  bottle: { ru: "бутылка|бутылки|бутылок", en: "bottle|bottles" },
} satisfies Record<string, LText>;
export type PeriodId = keyof typeof PERIODS;
/** «за минуту», «за гостя»: accusative for feminine and animate periods */
const PER_ONE_RU: Partial<Record<PeriodId, string>> = { minute: "минуту", bottle: "бутылку", piece: "штуку", guest: "гостя", person: "человека" };

const PLURAL = { ru: ["one", "few", "many"], en: ["one", "other"] } as const;
function plural(forms: string, n: number, locale: "ru" | "en") {
  const list = forms.split("|");
  const k = (PLURAL[locale] as readonly string[]).indexOf(new Intl.PluralRules(locale).select(n));
  return list[Math.min(k === -1 ? list.length - 1 : k, list.length - 1)];
}
const fmtNum = (n: number, locale: "ru" | "en") => n.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");

/** Period word agreeing with a number: «часа» for 4, «часов» for 5 */
export const periodForm = (per: PeriodId, n: number, locale: "ru" | "en") => plural(PERIODS[per][locale], n, locale);

/** Period name for a select: «час», «день», «мероприятие» */
export const periodName = (per: PeriodId, locale: "ru" | "en") => plural(PERIODS[per][locale], 1, locale);

/** «за час», «за 4 часа», «за мероприятие» / «per hour», «per 4 hours» */
export function perLabel(per: string, qty: number | undefined, locale: "ru" | "en"): string {
  const p = PERIODS[per as PeriodId];
  if (!p) return "";
  const n = qty && qty > 1 ? qty : 1;
  if (locale === "en") return n === 1 ? `per ${plural(p.en, 1, "en")}` : `per ${fmtNum(n, "en")} ${plural(p.en, n, "en")}`;
  // «за» takes the accusative: «за минуту», «за 21 минуту», «за 31 гостя» — every number in the "one" plural class
  const word = new Intl.PluralRules("ru").select(n) === "one" ? (PER_ONE_RU[per as PeriodId] ?? plural(p.ru, n, "ru")) : plural(p.ru, n, "ru");
  return n === 1 ? `за ${word}` : `за ${fmtNum(n, "ru")} ${word}`;
}

/** «4 часа», «2 дня» */
export function durationLabel(qty: number, per: string, locale: "ru" | "en"): string {
  const p = PERIODS[per as PeriodId];
  return p ? `${fmtNum(qty, locale)} ${plural(p[locale], qty, locale)}` : fmtNum(qty, locale);
}

/** «3 000 сом за час» */
export function priceText(amount: number, qty: number | undefined, per: string, locale: "ru" | "en") {
  return `${fmtNum(amount, locale)} ${locale === "ru" ? "сом" : "som"} ${perLabel(per, qty, locale)}`.trim();
}

/** Offer unit text built from a period: «4 часа» / «4 hours», «мероприятие» */
export function unitFromPeriod(per: PeriodId, qty: number): LText {
  return qty > 1 ? { ru: durationLabel(qty, per, "ru"), en: durationLabel(qty, per, "en") } : { ru: periodName(per, "ru"), en: periodName(per, "en") };
}

// ── Field kinds ─────────────────────────────────────────────────

interface Base {
  id: string;
  label: LText;
  hint?: LText;
}
export interface NumberField extends Base {
  kind: "number";
  unit?: LText;
  placeholder?: string;
  /** short fact for the feed: `{v}` is the value, forms split by `|` */
  short?: LText;
}
export interface TextField extends Base {
  kind: "text";
  placeholder?: LText;
}
export interface LongTextField extends Base {
  kind: "longtext";
  placeholder?: LText;
}
export interface SelectField extends Base {
  kind: "select";
  options: Opt[];
  short?: boolean;
}
export interface MultiField extends Base {
  kind: "multi";
  options: Opt[];
  short?: boolean;
}
export interface BoolField extends Base {
  kind: "bool";
  short?: LText;
}
/** Amount + «за N периодов»: the vendor picks the period (hour, day, event, guest…) */
export interface PriceField extends Base {
  kind: "price";
  periods: PeriodId[];
  placeholder?: string;
  /** fact template, `{v}` is the full price text */
  short?: LText;
}
/** Quantity of a period: «минимум 4 часа», «2 дня в цене» */
export interface DurationField extends Base {
  kind: "duration";
  periods: PeriodId[];
  placeholder?: string;
  short?: LText;
}
export type ItemField = NumberField | TextField | LongTextField | SelectField | PriceField;
export interface ListField extends Base {
  kind: "list";
  item: ItemField[];
  add: LText;
  countField?: string;
  titleField: string;
  short?: LText;
}
export type SpecField = NumberField | TextField | LongTextField | SelectField | MultiField | BoolField | PriceField | DurationField | ListField;

export interface SpecGroup {
  title: LText;
  hint?: LText;
  fields: SpecField[];
}

const o = (id: string, ru: string, en: string): Opt => ({ id, label: { ru, en } });
const L = (ru: string, en: string): LText => ({ ru, en });

const U = {
  pcs: L("шт", "pcs"),
  som: L("сом", "som"),
  somKm: L("сом/км", "som/km"),
  guests: L("гостей", "guests"),
  m2: L("м²", "m²"),
  m: L("м", "m"),
  minutes: L("мин", "min"),
  people: L("чел.", "people"),
  kg: L("кг", "kg"),
  seats: L("мест", "seats"),
  pct: L("%", "%"),
  pages: L("стр.", "pages"),
};

const LANGS = [o("ky", "Кыргызский", "Kyrgyz"), o("ru", "Русский", "Russian"), o("kz", "Казахский", "Kazakh"), o("uz", "Узбекский", "Uzbek"), o("en", "Английский", "English"), o("tr", "Турецкий", "Turkish")];
const EVENTS = [
  o("wedding", "Свадьба", "Wedding"),
  o("kyzUzatuu", "Кыз узатуу", "Kyz uzatuu"),
  o("kudalyk", "Кудалык", "Kudalyk"),
  o("sunnot", "Сүннөт той", "Sunnot toi"),
  o("birthday", "День рождения", "Birthday"),
  o("jubilee", "Юбилей", "Jubilee"),
  o("corporate", "Корпоратив", "Corporate"),
  o("kids", "Детский праздник", "Kids party"),
];
const REGIONS = [
  o("bishkek", "Бишкек", "Bishkek"),
  o("chui", "Чуйская обл.", "Chui region"),
  o("issyk-kul", "Иссык-Куль", "Issyk-Kul"),
  o("osh", "Ош", "Osh"),
  o("all", "По всему Кыргызстану", "All Kyrgyzstan"),
];
const regions = (): MultiField => ({ id: "regions", kind: "multi", label: L("Выезд", "Service area"), options: REGIONS });
const overtime = (): PriceField => ({ id: "overtime", kind: "price", label: L("Переработка", "Overtime"), periods: ["hour"], placeholder: "5000" });

// ── Categories ──────────────────────────────────────────────────

export const CATEGORY_SPECS: Record<CategoryId, SpecGroup[]> = {
  // ─────────── Кортежи ───────────
  cars: [
    {
      title: L("Автопарк", "Fleet"),
      fields: [
        {
          id: "fleet",
          kind: "list",
          label: L("Машины", "Cars"),
          hint: L("Каждую модель — отдельной строкой. Цену можно указать за час, за несколько часов, за день или за мероприятие", "One row per model. Price per hour, per several hours, per day or per event"),
          add: L("Добавить машину", "Add a car"),
          titleField: "model",
          countField: "count",
          short: L("{v} авто|{v} авто|{v} авто", "{v} car|{v} cars"),
          item: [
            { id: "model", kind: "text", label: L("Модель", "Model"), placeholder: L("Mercedes-Benz S-Class", "Mercedes-Benz S-Class") },
            {
              id: "body",
              kind: "select",
              label: L("Тип", "Type"),
              options: [o("sedan", "Седан", "Sedan"), o("suv", "Внедорожник", "SUV"), o("limo", "Лимузин", "Limousine"), o("minivan", "Минивэн", "Minivan"), o("bus", "Автобус", "Bus"), o("retro", "Ретро", "Retro"), o("cabrio", "Кабриолет", "Convertible")],
            },
            { id: "year", kind: "number", label: L("Год", "Year"), placeholder: "2021" },
            {
              id: "color",
              kind: "select",
              label: L("Цвет", "Colour"),
              options: [o("white", "Белый", "White"), o("black", "Чёрный", "Black"), o("silver", "Серебристый", "Silver"), o("champagne", "Шампань", "Champagne"), o("other", "Другой", "Other")],
            },
            { id: "seats", kind: "number", label: L("Пассажиров", "Passengers"), placeholder: "4" },
            { id: "count", kind: "number", label: L("Сколько машин", "How many"), unit: U.pcs, placeholder: "1" },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["hour", "day", "event"], placeholder: "3000" },
          ],
        },
      ],
    },
    {
      title: L("Условия аренды", "Rental terms"),
      fields: [
        { id: "minRent", kind: "duration", label: L("Минимальная аренда", "Minimum rental"), periods: ["hour", "day"], placeholder: "3", short: L("мин. {v}", "min. {v}") },
        overtime(),
        { id: "outOfCity", kind: "number", label: L("За городом", "Outside the city"), unit: U.somKm, placeholder: "50" },
        { id: "decor", kind: "bool", label: L("Украшение машин включено", "Car decoration included"), short: L("украшение включено", "decor included") },
        { id: "driverSuit", kind: "bool", label: L("Водители в костюмах", "Drivers in suits") },
        { id: "coordinator", kind: "bool", label: L("Координатор кортежа", "Motorcade coordinator") },
        { id: "videoCar", kind: "bool", label: L("Машина для видеооператора", "Camera car available") },
        { id: "waiting", kind: "bool", label: L("Ожидание и фотостопы без доплат", "Waiting and photo stops included") },
        regions(),
      ],
    },
  ],

  // ─────────── Банкетные залы ───────────
  halls: [
    {
      title: L("Вместимость и залы", "Capacity and rooms"),
      fields: [
        { id: "banquet", kind: "number", label: L("Гостей на банкет", "Banquet guests"), unit: U.guests, placeholder: "300", short: L("до {v} гостя|до {v} гостей|до {v} гостей", "up to {v} guest|up to {v} guests") },
        { id: "buffet", kind: "number", label: L("Гостей на фуршет", "Buffet guests"), unit: U.guests, placeholder: "450" },
        { id: "minGuests", kind: "number", label: L("Минимум гостей", "Minimum guests"), unit: U.guests, placeholder: "50" },
        { id: "area", kind: "number", label: L("Общая площадь", "Total area"), unit: U.m2, placeholder: "600", short: L("{v} м²", "{v} m²") },
        { id: "ceiling", kind: "number", label: L("Высота потолков", "Ceiling height"), unit: U.m, placeholder: "6" },
        {
          id: "rooms",
          kind: "list",
          label: L("Залы", "Rooms"),
          hint: L("Если залов несколько — опишите каждый: вместимость, площадь и аренду", "Several rooms? Describe each: capacity, area and rent"),
          add: L("Добавить зал", "Add a room"),
          titleField: "name",
          short: L("{v} зал|{v} зала|{v} залов", "{v} room|{v} rooms"),
          item: [
            { id: "name", kind: "text", label: L("Название", "Name"), placeholder: L("Большой зал", "Grand hall") },
            { id: "seats", kind: "number", label: L("Гостей", "Guests"), unit: U.guests, placeholder: "250" },
            { id: "area", kind: "number", label: L("Площадь", "Area"), unit: U.m2, placeholder: "400" },
            { id: "rent", kind: "price", label: L("Аренда", "Rent"), periods: ["event", "hour", "day"], placeholder: "50000" },
          ],
        },
      ],
    },
    {
      title: L("Меню", "Menu"),
      hint: L("Банкетные меню с ценой за гостя и составом — клиент сразу посчитает бюджет", "Banquet menus with price per guest and dishes — clients can estimate the budget"),
      fields: [
        {
          id: "menus",
          kind: "list",
          label: L("Банкетные меню", "Banquet menus"),
          add: L("Добавить меню", "Add a menu"),
          titleField: "name",
          short: L("{v} меню|{v} меню|{v} меню", "{v} menu|{v} menus"),
          item: [
            { id: "name", kind: "text", label: L("Название", "Name"), placeholder: L("Меню «Классика»", "Classic menu") },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["guest", "set"], placeholder: "2500" },
            { id: "minGuests", kind: "number", label: L("От гостей", "From guests"), unit: U.guests, placeholder: "50" },
            {
              id: "dishes",
              kind: "longtext",
              label: L("Состав", "Dishes"),
              placeholder: L("Салаты: оливье, цезарь\nГорячее: бешбармак, плов\nДесерт: фрукты, чак-чак\nНапитки: чай, морс, компот", "Salads: …\nMains: beshbarmak, plov\nDessert: fruit\nDrinks: tea, juice"),
            },
          ],
        },
        {
          id: "cuisine",
          kind: "multi",
          label: L("Кухня", "Cuisine"),
          options: [o("kyrgyz", "Кыргызская", "Kyrgyz"), o("european", "Европейская", "European"), o("eastern", "Восточная", "Eastern"), o("asian", "Азиатская", "Asian"), o("halal", "Халяль", "Halal")],
        },
        { id: "avgCheck", kind: "price", label: L("Средний чек", "Average bill"), periods: ["guest"], placeholder: "2500" },
        { id: "service", kind: "number", label: L("Обслуживание", "Service charge"), unit: U.pct, placeholder: "10" },
        { id: "kidsMenu", kind: "bool", label: L("Детское меню", "Kids menu") },
        { id: "tasting", kind: "bool", label: L("Дегустация меню перед праздником", "Menu tasting before the event") },
      ],
    },
    {
      title: L("Аренда и правила", "Rent and rules"),
      fields: [
        { id: "rent", kind: "price", label: L("Аренда зала без меню", "Hall rent without menu"), periods: ["event", "hour", "day"], placeholder: "100000" },
        { id: "included", kind: "duration", label: L("Время в аренде", "Time included"), periods: ["hour"], placeholder: "6" },
        overtime(),
        {
          id: "until",
          kind: "select",
          label: L("Работаем до", "Open until"),
          options: [o("23", "23:00", "11 pm"), o("00", "00:00", "midnight"), o("02", "02:00", "2 am"), o("last", "до последнего гостя", "last guest")],
        },
        { id: "ownAlcohol", kind: "bool", label: L("Можно со своим алкоголем", "Own alcohol allowed") },
        { id: "corkage", kind: "price", label: L("Пробковый сбор", "Corkage"), periods: ["bottle"], placeholder: "300" },
        { id: "ownFood", kind: "bool", label: L("Можно свои торт и фрукты", "Own cake and fruit allowed") },
        { id: "decorIncluded", kind: "bool", label: L("Базовый декор включён", "Basic decor included") },
      ],
    },
    {
      title: L("Оснащение", "Facilities"),
      fields: [
        { id: "parking", kind: "number", label: L("Парковка", "Parking"), unit: U.seats, placeholder: "80" },
        { id: "stage", kind: "bool", label: L("Сцена", "Stage") },
        { id: "danceFloor", kind: "bool", label: L("Танцпол", "Dance floor") },
        { id: "screen", kind: "bool", label: L("LED-экран / проектор", "LED screen / projector") },
        { id: "sound", kind: "bool", label: L("Звук и свет", "Sound and light") },
        { id: "ac", kind: "bool", label: L("Кондиционеры", "Air conditioning") },
        { id: "terrace", kind: "bool", label: L("Терраса / выездная регистрация", "Terrace / outdoor ceremony"), short: L("терраса", "terrace") },
        { id: "bride", kind: "bool", label: L("Комната невесты", "Bridal room") },
        { id: "rooms4guests", kind: "bool", label: L("Номера для гостей", "Guest rooms") },
        { id: "access", kind: "bool", label: L("Доступно для маломобильных гостей", "Wheelchair accessible") },
      ],
    },
  ],

  // ─────────── Ведущие ───────────
  hosts: [
    {
      title: L("Ведение", "Hosting"),
      fields: [
        { id: "languages", kind: "multi", label: L("Языки ведения", "Languages"), options: LANGS, short: true },
        { id: "events", kind: "multi", label: L("Какие праздники ведёте", "Events you host"), options: EVENTS },
        {
          id: "style",
          kind: "select",
          label: L("Стиль", "Style"),
          options: [o("classic", "Классический", "Classic"), o("modern", "Современный", "Modern"), o("humor", "С юмором", "Humorous"), o("formal", "Официальный", "Formal")],
        },
        { id: "maxGuests", kind: "number", label: L("Комфортно до", "Comfortable up to"), unit: U.guests, placeholder: "500" },
        { id: "traditions", kind: "bool", label: L("Знаю обряды: нике, кыз узатуу, беташар", "Know traditions: nike, kyz uzatuu, betashar") },
      ],
    },
    {
      title: L("Стоимость и время", "Price and time"),
      fields: [
        { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["event", "hour", "evening"], placeholder: "60000" },
        { id: "duration", kind: "duration", label: L("Длительность программы", "Programme length"), periods: ["hour"], placeholder: "5", short: L("{v} программы", "{v} programme") },
        overtime(),
        { id: "meetings", kind: "number", label: L("Встреч до праздника", "Meetings before"), placeholder: "2" },
      ],
    },
    {
      title: L("Что входит", "Included"),
      fields: [
        { id: "dj", kind: "bool", label: L("DJ в составе", "DJ included"), short: L("с DJ", "with DJ") },
        { id: "soundGear", kind: "bool", label: L("Своя аппаратура", "Own sound equipment") },
        { id: "script", kind: "bool", label: L("Индивидуальный сценарий", "Personal script") },
        { id: "games", kind: "bool", label: L("Конкурсы и интерактив", "Games and interactive") },
        { id: "singer", kind: "bool", label: L("Вокал / артисты в программе", "Singer / artists in the show") },
        regions(),
      ],
    },
  ],

  // ─────────── Фото и видео ───────────
  photo: [
    {
      title: L("Съёмка", "Coverage"),
      fields: [
        {
          id: "services",
          kind: "multi",
          label: L("Что снимаете", "What you shoot"),
          short: true,
          options: [
            o("photo", "Фото", "Photo"),
            o("video", "Видео", "Video"),
            o("drone", "Дрон", "Drone"),
            o("loveStory", "Love story", "Love story"),
            o("reels", "Reels / вертикальные ролики", "Reels"),
            o("sde", "Монтаж в день свадьбы", "Same-day edit"),
            o("album", "Фотокнига", "Photo book"),
            o("live", "Прямая трансляция", "Live stream"),
          ],
        },
        { id: "photographers", kind: "number", label: L("Фотографов", "Photographers"), unit: U.people, placeholder: "1" },
        { id: "videographers", kind: "number", label: L("Видеографов", "Videographers"), unit: U.people, placeholder: "1" },
        { id: "studio", kind: "bool", label: L("Своя студия", "Own studio") },
      ],
    },
    {
      title: L("Стоимость и время", "Price and time"),
      fields: [
        { id: "price", kind: "price", label: L("Цена съёмки", "Shoot price"), periods: ["hour", "day", "event"], placeholder: "5000" },
        { id: "minRent", kind: "duration", label: L("Минимальный заказ", "Minimum booking"), periods: ["hour"], placeholder: "2" },
        overtime(),
        regions(),
      ],
    },
    {
      title: L("Результат", "Delivery"),
      fields: [
        { id: "photos", kind: "number", label: L("Фото в обработке", "Edited photos"), unit: U.pcs, placeholder: "400" },
        { id: "film", kind: "number", label: L("Длина фильма", "Film length"), unit: U.minutes, placeholder: "15" },
        { id: "album", kind: "number", label: L("Фотокнига", "Photo book"), unit: U.pages, placeholder: "30" },
        { id: "delivery", kind: "duration", label: L("Срок сдачи", "Delivery time"), periods: ["day"], placeholder: "30", short: L("сдача за {v}", "delivered in {v}") },
        { id: "preview", kind: "bool", label: L("Превью на следующий день", "Preview next day") },
        { id: "teaser", kind: "bool", label: L("Тизер для соцсетей", "Social media teaser") },
        { id: "raw", kind: "bool", label: L("Отдаём исходники", "Raw files included") },
      ],
    },
  ],

  // ─────────── Декор ───────────
  decor: [
    {
      title: L("Оформление", "Design"),
      fields: [
        {
          id: "styles",
          kind: "multi",
          label: L("Стили", "Styles"),
          short: true,
          options: [o("classic", "Классика", "Classic"), o("ethnic", "Этно", "Ethnic"), o("boho", "Бохо", "Boho"), o("minimal", "Минимализм", "Minimal"), o("luxury", "Люкс", "Luxury"), o("rustic", "Рустик", "Rustic")],
        },
        {
          id: "services",
          kind: "multi",
          label: L("Что оформляете", "What you decorate"),
          options: [
            o("stage", "Президиум / сцена", "Head table / stage"),
            o("photozone", "Фотозона", "Photo zone"),
            o("arch", "Арка регистрации", "Ceremony arch"),
            o("tables", "Столы гостей", "Guest tables"),
            o("ceiling", "Потолок", "Ceiling"),
            o("light", "Свет и гирлянды", "Lights"),
            o("entrance", "Вход и welcome-зона", "Entrance and welcome zone"),
            o("balloons", "Шары", "Balloons"),
            o("bouquet", "Букет невесты", "Bridal bouquet"),
          ],
        },
        {
          id: "flowers",
          kind: "select",
          label: L("Цветы", "Flowers"),
          options: [o("live", "Живые", "Fresh"), o("faux", "Искусственные", "Faux"), o("both", "Живые и искусственные", "Both")],
        },
        { id: "maxGuests", kind: "number", label: L("Залы до", "Venues up to"), unit: U.guests, placeholder: "500", short: L("залы до {v} гостя|залы до {v} гостей|залы до {v} гостей", "venues up to {v}") },
      ],
    },
    {
      title: L("Стоимость и сроки", "Price and timing"),
      fields: [
        { id: "minOrder", kind: "number", label: L("Минимальный заказ", "Minimum order"), unit: U.som, placeholder: "50000" },
        { id: "setup", kind: "duration", label: L("Монтаж", "Setup"), periods: ["hour"], placeholder: "4" },
        { id: "sketch", kind: "bool", label: L("3D-эскиз до события", "3D sketch before the event"), short: L("3D-эскиз", "3D sketch") },
        { id: "dismantle", kind: "bool", label: L("Демонтаж после праздника", "Dismantling after the event") },
        { id: "delivery", kind: "bool", label: L("Доставка включена", "Delivery included") },
        regions(),
      ],
    },
    {
      title: L("Аренда декора", "Decor rental"),
      fields: [
        {
          id: "rental",
          kind: "list",
          label: L("Что можно взять отдельно", "Items for rent"),
          hint: L("Арки, вазы, подсвечники, ковры — с ценой", "Arches, vases, candle holders, rugs — with prices"),
          add: L("Добавить позицию", "Add an item"),
          titleField: "name",
          countField: "count",
          item: [
            { id: "name", kind: "text", label: L("Что", "Item"), placeholder: L("Арка круглая, золото", "Round arch, gold") },
            { id: "count", kind: "number", label: L("Сколько", "Quantity"), unit: U.pcs, placeholder: "2" },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["day", "event", "piece"], placeholder: "8000" },
          ],
        },
      ],
    },
  ],

  // ─────────── Музыка ───────────
  music: [
    {
      title: L("Состав", "Line-up"),
      fields: [
        {
          id: "format",
          kind: "select",
          label: L("Формат", "Format"),
          short: true,
          options: [o("band", "Кавер-группа", "Cover band"), o("dj", "DJ", "DJ"), o("solo", "Солист", "Solo singer"), o("ensemble", "Ансамбль / квартет", "Ensemble"), o("folk", "Народные инструменты", "Folk instruments"), o("sax", "Саксофонист", "Saxophonist")],
        },
        { id: "members", kind: "number", label: L("Человек в составе", "Members"), unit: U.people, placeholder: "5", short: L("{v} человек в составе|{v} человека в составе|{v} человек в составе", "{v} member|{v} members") },
        {
          id: "genres",
          kind: "multi",
          label: L("Репертуар", "Repertoire"),
          options: [o("pop", "Поп", "Pop"), o("kyrgyz", "Кыргызская эстрада", "Kyrgyz pop"), o("folk", "Народная", "Folk"), o("jazz", "Джаз", "Jazz"), o("classic", "Классика", "Classical"), o("dance", "Танцевальная", "Dance"), o("rock", "Рок", "Rock"), o("retro", "Ретро", "Retro")],
        },
        { id: "languages", kind: "multi", label: L("Языки песен", "Song languages"), options: LANGS },
        { id: "songs", kind: "number", label: L("Песен в репертуаре", "Songs in repertoire"), unit: U.pcs, placeholder: "200" },
      ],
    },
    {
      title: L("Выступление и цена", "Performance and price"),
      fields: [
        { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["hour", "evening", "event"], placeholder: "30000" },
        { id: "live", kind: "duration", label: L("Живого звука в цене", "Live time included"), periods: ["hour"], placeholder: "3", short: L("{v} живого звука", "{v} live") },
        { id: "sets", kind: "number", label: L("Сетов", "Sets"), placeholder: "3" },
        { id: "setLength", kind: "number", label: L("Длина сета", "Set length"), unit: U.minutes, placeholder: "45" },
        overtime(),
      ],
    },
    {
      title: L("Техника", "Equipment"),
      fields: [
        { id: "gear", kind: "bool", label: L("Свой звук и свет", "Own sound and light") },
        { id: "djBreaks", kind: "bool", label: L("Музыка в перерывах", "Music between sets") },
        { id: "requests", kind: "bool", label: L("Разучим песню по заказу", "Learn a song on request") },
        { id: "stageArea", kind: "number", label: L("Нужно места на сцене", "Stage space needed"), unit: U.m2, placeholder: "12" },
        regions(),
      ],
    },
  ],

  // ─────────── Мебель ───────────
  furniture: [
    {
      title: L("Инвентарь", "Inventory"),
      fields: [
        {
          id: "inventory",
          kind: "list",
          label: L("Что сдаёте", "What you rent out"),
          hint: L("Позиции с количеством и ценой — за штуку, за день или за мероприятие", "Items with quantity and price — per piece, per day or per event"),
          add: L("Добавить позицию", "Add an item"),
          titleField: "name",
          countField: "count",
          short: L("{v} предмет|{v} предмета|{v} предметов", "{v} item|{v} items"),
          item: [
            { id: "name", kind: "text", label: L("Что", "Item"), placeholder: L("Стул кьявари", "Chiavari chair") },
            { id: "color", kind: "text", label: L("Цвет / материал", "Colour / material"), placeholder: L("золото", "gold") },
            { id: "count", kind: "number", label: L("Сколько", "Quantity"), unit: U.pcs, placeholder: "300" },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["piece", "day", "event", "set"], placeholder: "150" },
          ],
        },
      ],
    },
    {
      title: L("Условия", "Terms"),
      fields: [
        { id: "period", kind: "duration", label: L("Срок аренды в цене", "Rental period included"), periods: ["day", "hour"], placeholder: "1" },
        { id: "minOrder", kind: "number", label: L("Минимальный заказ", "Minimum order"), unit: U.som, placeholder: "10000" },
        { id: "deliveryPrice", kind: "number", label: L("Доставка по городу", "Delivery in the city"), unit: U.som, placeholder: "3000" },
        { id: "deposit", kind: "number", label: L("Залог", "Deposit"), unit: U.som, placeholder: "20000" },
        { id: "delivery", kind: "bool", label: L("Доставка", "Delivery"), short: L("доставка", "delivery") },
        { id: "assembly", kind: "bool", label: L("Расстановка и сборка", "Setup and assembly"), short: L("расстановка", "setup") },
        { id: "textile", kind: "bool", label: L("Скатерти и чехлы", "Tablecloths and covers") },
        { id: "cleaning", kind: "bool", label: L("Чистка после мероприятия включена", "Cleaning after the event included") },
      ],
    },
  ],

  // ─────────── Торты ───────────
  cakes: [
    {
      title: L("Торты", "Cakes"),
      fields: [
        { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["kg", "piece"], placeholder: "2500", short: L("{v}", "{v}") },
        { id: "minWeight", kind: "number", label: L("Вес от", "Weight from"), unit: U.kg, placeholder: "2" },
        { id: "maxWeight", kind: "number", label: L("Вес до", "Weight up to"), unit: U.kg, placeholder: "30" },
        { id: "tiers", kind: "number", label: L("До ярусов", "Up to tiers"), placeholder: "5", short: L("до {v} яруса|до {v} ярусов|до {v} ярусов", "up to {v} tier|up to {v} tiers") },
        {
          id: "fillings",
          kind: "multi",
          label: L("Начинки", "Fillings"),
          options: [o("vanilla", "Ваниль", "Vanilla"), o("chocolate", "Шоколад", "Chocolate"), o("redVelvet", "Красный бархат", "Red velvet"), o("berries", "Ягоды", "Berries"), o("honey", "Медовик", "Honey cake"), o("nuts", "Орехи", "Nuts"), o("cheese", "Чизкейк", "Cheesecake"), o("pistachio", "Фисташка", "Pistachio")],
        },
        {
          id: "decor",
          kind: "multi",
          label: L("Декор", "Decoration"),
          options: [o("flowers", "Живые цветы", "Fresh flowers"), o("fondant", "Мастика", "Fondant"), o("cream", "Крем", "Buttercream"), o("figures", "Фигурки", "Figures"), o("mirror", "Зеркальная глазурь", "Mirror glaze"), o("print", "Фотопечать", "Photo print")],
        },
        { id: "diet", kind: "bool", label: L("Без сахара / веган / без глютена", "Sugar-free / vegan / gluten-free") },
      ],
    },
    {
      title: L("Десерты и кенди-бар", "Desserts and candy bar"),
      fields: [
        {
          id: "assortment",
          kind: "list",
          label: L("Ассортимент", "Assortment"),
          hint: L("Капкейки, макаруны, эклеры, кенди-бар — с ценой", "Cupcakes, macarons, éclairs, candy bar — with prices"),
          add: L("Добавить позицию", "Add an item"),
          titleField: "name",
          item: [
            { id: "name", kind: "text", label: L("Что", "Item"), placeholder: L("Макаруны", "Macarons") },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["piece", "set", "kg", "guest"], placeholder: "120" },
            { id: "note", kind: "text", label: L("Заметка", "Note"), placeholder: L("от 24 шт", "from 24 pcs") },
          ],
        },
      ],
    },
    {
      title: L("Заказ", "Ordering"),
      fields: [
        { id: "lead", kind: "duration", label: L("Заказ заранее", "Order ahead"), periods: ["day"], placeholder: "7" },
        { id: "tasting", kind: "bool", label: L("Дегустация", "Tasting"), short: L("дегустация", "tasting") },
        { id: "delivery", kind: "bool", label: L("Доставка и установка", "Delivery and setup") },
        { id: "stand", kind: "bool", label: L("Подставка под торт в аренду", "Cake stand for rent") },
        { id: "topper", kind: "bool", label: L("Топпер с именами", "Name topper") },
      ],
    },
  ],

  // ─────────── Визаж ───────────
  beauty: [
    {
      title: L("Услуги и прайс", "Services and prices"),
      fields: [
        {
          id: "services",
          kind: "multi",
          label: L("Что делаете", "Services"),
          short: true,
          options: [o("makeup", "Макияж", "Makeup"), o("hair", "Причёска", "Hair"), o("nails", "Маникюр", "Nails"), o("brows", "Брови и ресницы", "Brows and lashes"), o("guests", "Образы для гостей", "Guest looks"), o("men", "Мужской груминг", "Men's grooming")],
        },
        {
          id: "prices",
          kind: "list",
          label: L("Прайс", "Price list"),
          add: L("Добавить услугу", "Add a service"),
          titleField: "name",
          item: [
            { id: "name", kind: "text", label: L("Услуга", "Service"), placeholder: L("Образ невесты: макияж + причёска", "Bridal look: makeup + hair") },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["look", "person", "hour"], placeholder: "12000" },
            { id: "time", kind: "number", label: L("Время", "Time"), unit: U.minutes, placeholder: "120" },
          ],
        },
        { id: "team", kind: "number", label: L("Мастеров в команде", "Artists in team"), unit: U.people, placeholder: "3", short: L("{v} мастер|{v} мастера|{v} мастеров", "{v} artist|{v} artists") },
        { id: "cosmetics", kind: "text", label: L("Косметика", "Cosmetics"), placeholder: L("MAC, Dior, Charlotte Tilbury", "MAC, Dior, Charlotte Tilbury") },
      ],
    },
    {
      title: L("Условия", "Terms"),
      fields: [
        { id: "travel", kind: "bool", label: L("Выезд к клиенту", "Comes to you"), short: L("выезд", "comes to you") },
        { id: "travelFee", kind: "number", label: L("Стоимость выезда", "Travel fee"), unit: U.som, placeholder: "2000" },
        { id: "trial", kind: "bool", label: L("Пробный образ", "Trial look") },
        { id: "early", kind: "bool", label: L("Ранние сборы (до 7:00)", "Early start (before 7 am)") },
        { id: "stay", kind: "bool", label: L("Остаёмся на празднике для поправки образа", "Stay at the event for touch-ups") },
      ],
    },
  ],

  // ─────────── Платья и костюмы ───────────
  attire: [
    {
      title: L("Ассортимент", "Collection"),
      fields: [
        {
          id: "mode",
          kind: "multi",
          label: L("Формат", "Format"),
          short: true,
          options: [o("rent", "Прокат", "Rent"), o("sale", "Продажа", "Sale"), o("tailoring", "Пошив", "Tailoring")],
        },
        {
          id: "types",
          kind: "multi",
          label: L("Что есть", "What you offer"),
          options: [o("wedding", "Свадебные платья", "Wedding dresses"), o("evening", "Вечерние платья", "Evening dresses"), o("national", "Национальные костюмы", "National costumes"), o("suits", "Мужские костюмы", "Suits"), o("kids", "Детские", "Kids"), o("plus", "Большие размеры", "Plus size")],
        },
        { id: "models", kind: "number", label: L("Моделей в наличии", "Models in stock"), unit: U.pcs, placeholder: "120", short: L("{v} модель|{v} модели|{v} моделей", "{v} model|{v} models") },
        { id: "sizes", kind: "text", label: L("Размеры", "Sizes"), placeholder: L("40–56", "40–56") },
        {
          id: "prices",
          kind: "list",
          label: L("Цены", "Prices"),
          hint: L("Категории платьев и костюмов: прокат за сутки, за несколько дней или покупка", "Price ranges: rent per day, several days or purchase"),
          add: L("Добавить категорию", "Add a category"),
          titleField: "name",
          item: [
            { id: "name", kind: "text", label: L("Что", "Item"), placeholder: L("Свадебное платье «Премиум»", "Wedding dress, premium") },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["day", "event", "piece"], placeholder: "25000" },
          ],
        },
      ],
    },
    {
      title: L("Условия", "Terms"),
      fields: [
        { id: "rentPeriod", kind: "duration", label: L("Срок проката", "Rental period"), periods: ["day"], placeholder: "3" },
        { id: "deposit", kind: "number", label: L("Залог", "Deposit"), unit: U.som, placeholder: "10000" },
        { id: "fitting", kind: "bool", label: L("Подгонка по фигуре", "Fitting included"), short: L("подгонка", "fitting") },
        { id: "tryOn", kind: "bool", label: L("Примерка по записи", "Try-on by appointment") },
        { id: "accessories", kind: "bool", label: L("Аксессуары и фата", "Accessories and veil") },
        { id: "cleaning", kind: "bool", label: L("Химчистка включена", "Dry cleaning included") },
        { id: "delivery", kind: "bool", label: L("Доставка", "Delivery") },
      ],
    },
  ],

  // ─────────── Той-атрибутика ───────────
  traditional: [
    {
      title: L("Что есть", "Items"),
      fields: [
        {
          id: "items",
          kind: "list",
          label: L("Позиции", "Items"),
          hint: L("Боз үй, чапаны, калпаки, элечеки — с количеством и ценой", "Yurts, chapans, kalpaks — with quantity and price"),
          add: L("Добавить позицию", "Add an item"),
          titleField: "name",
          countField: "count",
          short: L("{v} предмет|{v} предмета|{v} предметов", "{v} item|{v} items"),
          item: [
            { id: "name", kind: "text", label: L("Что", "Item"), placeholder: L("Боз үй на 40 гостей", "Yurt for 40 guests") },
            { id: "count", kind: "number", label: L("Сколько", "Quantity"), unit: U.pcs, placeholder: "2" },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["day", "event", "piece", "set"], placeholder: "25000" },
          ],
        },
        { id: "rentSale", kind: "multi", label: L("Формат", "Format"), options: [o("rent", "Прокат", "Rent"), o("sale", "Продажа", "Sale"), o("tailoring", "Пошив на заказ", "Made to order")] },
      ],
    },
    {
      title: L("Условия", "Terms"),
      fields: [
        { id: "montage", kind: "bool", label: L("Установка юрты", "Yurt assembly"), short: L("установка", "assembly") },
        { id: "interior", kind: "bool", label: L("Убранство юрты: шырдаки, төшөк, дасторкон", "Yurt interior: shyrdaks, toshok, dastorkon") },
        { id: "ceremony", kind: "bool", label: L("Помощь с обрядами", "Help with ceremonies") },
        { id: "delivery", kind: "bool", label: L("Доставка", "Delivery") },
        { id: "setup", kind: "duration", label: L("Установка занимает", "Setup takes"), periods: ["hour"], placeholder: "3" },
        regions(),
      ],
    },
  ],

  // ─────────── Шоу ───────────
  shows: [
    {
      title: L("Шоу", "Show"),
      fields: [
        {
          id: "types",
          kind: "multi",
          label: L("Что показываете", "Show types"),
          short: true,
          options: [o("fire", "Огненное шоу", "Fire show"), o("pyro", "Фейерверк", "Fireworks"), o("cold", "Холодные фонтаны", "Cold sparklers"), o("laser", "Лазерное шоу", "Laser show"), o("dance", "Танцевальное шоу", "Dance show"), o("smoke", "Тяжёлый дым", "Low fog"), o("bubble", "Шоу мыльных пузырей", "Bubble show")],
        },
        {
          id: "programs",
          kind: "list",
          label: L("Программы", "Programmes"),
          add: L("Добавить программу", "Add a programme"),
          titleField: "name",
          item: [
            { id: "name", kind: "text", label: L("Название", "Name"), placeholder: L("Фейерверк «Финал»", "Finale fireworks") },
            { id: "minutes", kind: "number", label: L("Длительность", "Duration"), unit: U.minutes, placeholder: "5" },
            { id: "price", kind: "price", label: L("Цена", "Price"), periods: ["show", "minute", "piece"], placeholder: "60000" },
          ],
        },
        { id: "performers", kind: "number", label: L("Артистов", "Performers"), unit: U.people, placeholder: "4" },
      ],
    },
    {
      title: L("Безопасность и площадка", "Safety and venue"),
      fields: [
        { id: "permits", kind: "bool", label: L("Разрешения на пиротехнику", "Pyrotechnics permits"), short: L("с разрешениями", "permitted") },
        { id: "indoor", kind: "bool", label: L("Можно в помещении", "Indoor-safe"), short: L("можно в зале", "indoor-safe") },
        { id: "insurance", kind: "bool", label: L("Страховка ответственности", "Liability insurance") },
        { id: "music", kind: "bool", label: L("Музыкальное сопровождение", "Music included") },
        { id: "minArea", kind: "number", label: L("Нужна площадка от", "Area needed from"), unit: U.m2, placeholder: "20" },
        { id: "minCeiling", kind: "number", label: L("Потолок от (в зале)", "Ceiling from (indoors)"), unit: U.m, placeholder: "4" },
        regions(),
      ],
    },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────

export const specFields = (category: CategoryId) => CATEGORY_SPECS[category].flatMap((g) => g.fields);

export function listTotal(f: ListField, rows: SpecItem[]) {
  return rows.reduce((s, r) => s + (f.countField ? Number(r[f.countField]) || 0 : 1), 0);
}

export function isFilled(v: SpecValue | undefined): boolean {
  if (v === undefined || v === null || v === "" || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return v > 0;
  return true;
}

export function specsProgress(category: CategoryId, specs: VendorSpecs | undefined) {
  const fields = specFields(category);
  return fields.filter((f) => isFilled(specs?.[f.id])).length / fields.length;
}

/** `{v}` → number, with «one|few|many» (ru) / «one|other» (en) forms */
export const fill = (tpl: LText, n: number): LText => ({
  ru: plural(tpl.ru, n, "ru").replace("{v}", fmtNum(n, "ru")),
  en: plural(tpl.en, n, "en").replace("{v}", fmtNum(n, "en")),
});
const fillText = (tpl: LText, v: LText): LText => ({ ru: tpl.ru.replace("{v}", v.ru), en: tpl.en.replace("{v}", v.en) });

/** Price of a field (or list row) as LText: «3 000 сом за час» */
export function priceOf(src: Record<string, unknown>, id: string): LText | null {
  const amount = Number(src[id]);
  if (!amount) return null;
  const qty = Number(src[`${id}Qty`]) || undefined;
  const per = String(src[`${id}Per`] ?? "");
  return { ru: priceText(amount, qty, per, "ru"), en: priceText(amount, qty, per, "en") };
}
/** Duration of a field as LText: «4 часа» */
export function durationOf(src: Record<string, unknown>, id: string): LText | null {
  const qty = Number(src[id]);
  if (!qty) return null;
  const per = String(src[`${id}Per`] ?? "");
  return { ru: durationLabel(qty, per, "ru"), en: durationLabel(qty, per, "en") };
}

/** Up to `max` short facts for the feed and cards: «до 300 гостей», «600 м²», «12 авто» */
export function specFacts(category: CategoryId, specs: VendorSpecs | undefined, max = 3): LText[] {
  if (!specs) return [];
  const out: LText[] = [];
  for (const f of specFields(category)) {
    if (out.length >= max) break;
    const v = specs[f.id];
    if (!isFilled(v)) continue;
    if (f.kind === "number" && f.short) out.push(fill(f.short, Number(v)));
    else if (f.kind === "bool" && f.short) out.push(f.short);
    else if (f.kind === "price" && f.short) {
      const p = priceOf(specs, f.id);
      if (p) out.push(fillText(f.short, p));
    } else if (f.kind === "duration" && f.short) {
      const d = durationOf(specs, f.id);
      if (d) out.push(fillText(f.short, d));
    } else if (f.kind === "list" && f.short) {
      const n = listTotal(f, v as SpecItem[]);
      if (n > 0) out.push(fill(f.short, n));
    } else if ((f.kind === "multi" || f.kind === "select") && f.short) {
      const ids = Array.isArray(v) ? (v as string[]) : [String(v)];
      const labels = ids.flatMap((id) => f.options.find((x) => x.id === id)?.label ?? []).slice(0, 2);
      if (labels.length) out.push({ ru: labels.map((x) => x.ru).join(" + ").toLowerCase(), en: labels.map((x) => x.en).join(" + ").toLowerCase() });
    }
  }
  return out;
}

// ── Sanitising (vendor input and AI output both pass here) ─────

const num = (x: unknown) => {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 10) / 10, 10_000_000) : undefined;
};
const int = (x: unknown) => {
  const n = num(x);
  return n ? Math.max(1, Math.round(n)) : undefined;
};

/** Copies a clean price (amount, Qty, Per) or duration (qty, Per) — only when there is a value */
function cleanPeriod(out: Record<string, unknown>, src: Record<string, unknown>, id: string, periods: PeriodId[], isPrice: boolean) {
  const value = isPrice ? num(src[id]) : int(src[id]);
  if (!value) return;
  out[id] = value;
  const per = src[`${id}Per`];
  out[`${id}Per`] = periods.includes(per as PeriodId) ? per : periods[0];
  if (isPrice) {
    const qty = int(src[`${id}Qty`]);
    if (qty && qty > 1) out[`${id}Qty`] = qty;
  }
}

function cleanItem(fields: ItemField[], row: SpecItem): SpecItem | null {
  const r: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f.id];
    if (f.kind === "number") {
      const n = num(v);
      if (n) r[f.id] = n;
    } else if (f.kind === "select") {
      if (f.options.some((x) => x.id === v)) r[f.id] = String(v);
    } else if (f.kind === "price") cleanPeriod(r, row, f.id, f.periods, true);
    else if (typeof v === "string" && v.trim()) r[f.id] = v.trim().slice(0, f.kind === "longtext" ? 1500 : 80);
  }
  return Object.keys(r).length ? (r as SpecItem) : null;
}

export function sanitizeSpecs(category: CategoryId, input: VendorSpecs): VendorSpecs {
  const out: Record<string, unknown> = {};
  const src = input as Record<string, unknown>;
  for (const f of specFields(category)) {
    const v = src[f.id];
    if (v === undefined) continue;
    if (f.kind === "number") {
      const n = num(v);
      if (n) out[f.id] = n;
    } else if (f.kind === "text" || f.kind === "longtext") {
      if (typeof v === "string" && v.trim()) out[f.id] = v.trim().slice(0, f.kind === "longtext" ? 1500 : 120);
    } else if (f.kind === "bool") {
      if (v === true) out[f.id] = true;
    } else if (f.kind === "select") {
      if (f.options.some((x) => x.id === v)) out[f.id] = String(v);
    } else if (f.kind === "multi") {
      const ids = Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string" && f.options.some((o) => o.id === x)) : [];
      if (ids.length) out[f.id] = [...new Set(ids)];
    } else if (f.kind === "price") cleanPeriod(out, src, f.id, f.periods, true);
    else if (f.kind === "duration") cleanPeriod(out, src, f.id, f.periods, false);
    else if (f.kind === "list" && Array.isArray(v)) {
      const rows = (v as SpecItem[])
        .slice(0, 50)
        .map((row) => (row && typeof row === "object" ? cleanItem(f.item, row) : null))
        .filter((r): r is SpecItem => r !== null);
      if (rows.length) out[f.id] = rows;
    }
  }
  return out as VendorSpecs;
}
