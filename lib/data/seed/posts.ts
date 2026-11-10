import { subDays, subHours } from "date-fns";
import { hash } from "../availability";
import type { CategoryId, LText, Offer, Post, Vendor } from "../types";
import { PHOTOS, unsplash } from "./photos";
import type { SeedVendor } from "./vendors";

/** Captions per category: short, human, the way vendors actually post */
const CAPTIONS: Record<CategoryId, LText[]> = {
  cars: [
    { ru: "Утро свадьбы: машины вымыты, ленты завязаны, водители в костюмах.", en: "Wedding morning: cars washed, ribbons tied, chauffeurs suited up." },
    { ru: "Кортеж на шесть машин для семьи из Чолпон-Аты. Спасибо за доверие!", en: "A six-car motorcade for a family from Cholpon-Ata. Thank you for trusting us!" },
    { ru: "Белые пионы на капоте — самая частая просьба этой весной.", en: "White peonies on the bonnet — the most requested touch this spring." },
    { ru: "Подача к ЗАГСу ровно в 10:00. Пунктуальность — наше всё.", en: "At the registry office at 10:00 sharp. Punctuality is everything." },
  ],
  halls: [
    { ru: "Зал после рассадки на 220 гостей. Свет тёплый, сцена открыта.", en: "The hall set for 220 guests. Warm light, open stage." },
    { ru: "Белый зал в мягком вечернем свете — до прихода гостей 40 минут.", en: "The white hall in soft evening light — 40 minutes before guests arrive." },
    { ru: "Новая люстра в главном зале. Приходите посмотреть вживую.", en: "A new chandelier in the main hall. Come and see it in person." },
    { ru: "Летняя терраса открыта: ужин под открытым небом до 60 человек.", en: "The summer terrace is open: dinner under the sky for up to 60 people." },
  ],
  furniture: [
    { ru: "Стулья Chiavari в золоте — 300 штук на складе, доставим и расставим.", en: "Gold Chiavari chairs — 300 in stock, delivered and set up." },
    { ru: "Длинные столы для дасторкона: собрали за два часа.", en: "Long dastorkon tables, set up in two hours." },
    { ru: "Комплект для выездной церемонии: арка, скамьи, дорожка.", en: "An outdoor ceremony set: arch, benches, aisle runner." },
  ],
  hosts: [
    { ru: "Вечер, на котором танцевали даже бабушки. Лучший комплимент для ведущего.", en: "An evening where even grandmothers danced. The best compliment for a host." },
    { ru: "Провели той на двух языках — без пауз и неловких моментов.", en: "Hosted a toi in two languages — no pauses, no awkward moments." },
    { ru: "Сценарий под каждую пару: встречаемся заранее и придумываем вместе.", en: "A script for every couple: we meet beforehand and plan it together." },
  ],
  photo: [
    { ru: "Золотой час в предгорьях. Двадцать минут, которые останутся навсегда.", en: "Golden hour in the foothills. Twenty minutes that last forever." },
    { ru: "Репортаж без постановки: живые эмоции гостей.", en: "Unposed reportage: real emotions of the guests." },
    { ru: "Отдали полную галерею через 10 дней — 640 кадров.", en: "Delivered the full gallery in 10 days — 640 frames." },
    { ru: "Детали, которые никто не заметил, кроме камеры.", en: "Details nobody noticed except the camera." },
  ],
  decor: [
    { ru: "Арка из живых цветов: пионы, эвкалипт и немного золота.", en: "A fresh-flower arch: peonies, eucalyptus and a touch of gold." },
    { ru: "Оформили президиум в пастельных тонах по эскизу невесты.", en: "Styled the head table in pastels, following the bride's sketch." },
    { ru: "Свечи, ткань и тёплый свет — декор, который не спорит с гостями.", en: "Candles, fabric and warm light — decor that lets guests shine." },
    { ru: "Монтаж за ночь, к утру зал не узнать.", en: "Set up overnight — by morning the hall is unrecognisable." },
  ],
  music: [
    { ru: "Живой звук на свадьбе — совсем другое настроение.", en: "Live sound at a wedding sets a completely different mood." },
    { ru: "Первый танец под струнный квартет. Мурашки у всего зала.", en: "First dance to a string quartet. Goosebumps across the hall." },
    { ru: "Собрали плейлист вместе с парой: от каракоз до джаза.", en: "Built the playlist with the couple: from karakoz to jazz." },
  ],
  cakes: [
    { ru: "Пятиярусный торт с сахарными пионами. Внутри — фисташка и малина.", en: "A five-tier cake with sugar peonies. Pistachio and raspberry inside." },
    { ru: "Минималистичный белый торт для камерной свадьбы.", en: "A minimal white cake for an intimate wedding." },
    { ru: "Дегустация по субботам — запишитесь заранее.", en: "Tastings on Saturdays — book in advance." },
  ],
  beauty: [
    { ru: "Лёгкий образ, который держится с утра до последнего танца.", en: "A light look that lasts from morning until the last dance." },
    { ru: "Пробный макияж за неделю до свадьбы — чтобы в день Х не было сюрпризов.", en: "A trial make-up a week before — no surprises on the day." },
    { ru: "Причёска для кыз узатуу: традиция и современность.", en: "A kyz uzatuu hairstyle: tradition meets modern." },
  ],
  attire: [
    { ru: "Новая коллекция платьев уже в салоне. Примерка по записи.", en: "The new dress collection is in the salon. Fittings by appointment." },
    { ru: "Подогнали костюм за три дня — сидит идеально.", en: "Tailored a suit in three days — a perfect fit." },
    { ru: "Платье с длинным шлейфом для выездной церемонии.", en: "A long-train gown for an outdoor ceremony." },
  ],
  traditional: [
    { ru: "Боз үй на берегу Иссык-Куля — собрали за полдня.", en: "A boz uy on the shore of Issyk-Kul — set up in half a day." },
    { ru: "Чапан и калпак для сватов: шьём по меркам.", en: "Chapans and kalpaks for the in-laws, made to measure." },
    { ru: "Традиционный дасторкон для 80 гостей.", en: "A traditional dastorkon for 80 guests." },
  ],
  shows: [
    { ru: "Финал вечера: фейерверк над озером, 4 минуты.", en: "The evening finale: four minutes of fireworks over the lake." },
    { ru: "Огненное шоу под живые барабаны.", en: "A fire show to live drums." },
    { ru: "Холодные фонтаны на первый танец — безопасно даже в зале.", en: "Cold fountains for the first dance — safe even indoors." },
  ],
};

const RATIOS = [1.25, 1.5, 1, 1.33, 0.8, 1.4, 1.2];

/**
 * Builds the feed from vendor portfolios. Every photo becomes the first photo
 * of at most one post, so the masonry never shows the same picture twice.
 */
export function buildPosts(seedVendors: SeedVendor[], vendors: Vendor[], offers: Offer[], now: Date): Post[] {
  const used = new Set<string>();
  const posts: Post[] = [];
  seedVendors.forEach((sv, vi) => {
    const vendor = vendors[vi];
    const pool = [...PHOTOS[sv.photoSet], ...(sv.extraSet ? PHOTOS[sv.extraSet].slice(0, 3) : [])];
    const rot = vi % pool.length;
    const ordered = [...pool.slice(rot), ...pool.slice(0, rot)];
    const vOffers = offers.filter((o) => o.vendorId === vendor.id);
    const captions = CAPTIONS[sv.category];
    let n = 0;
    for (const id of ordered) {
      if (n >= 6) break;
      if (used.has(id)) continue;
      used.add(id);
      const h = hash(`${sv.slug}:${id}`);
      const ratio = RATIOS[h % RATIOS.length];
      const extra = ordered.filter((x) => x !== id).slice(n, n + (h % 3));
      const photos = [id, ...extra].map((pid) => unsplash(pid, 900, Math.round(900 * ratio)));
      posts.push({
        id: `p-${sv.slug}-${n}`,
        vendorId: vendor.id,
        photos,
        caption: captions[(h >>> 4) % captions.length],
        category: sv.category,
        offerId: vOffers.length ? vOffers[(h >>> 7) % vOffers.length].id : undefined,
        baseLikes: 12 + (h % 480),
        ratio,
        createdAt: subHours(subDays(now, (h >>> 9) % 60), (h >>> 3) % 20).toISOString(),
      });
      n++;
    }
  });
  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
