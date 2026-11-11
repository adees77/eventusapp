import { describe, expect, it } from "vitest";
import {
  type Answers,
  choiceAnswer,
  clearStep,
  currentStep,
  filledSteps,
  mergeAnswers,
  parseAnswer,
  parseStory,
  progress,
  sanitizeAiFields,
  skipAnswer,
} from "../script";

const NOW = new Date("2026-11-09T10:00:00");

function answer(a: Answers, text: string): Answers {
  const patch = parseAnswer(currentStep(a), text, a, NOW);
  if (!patch) throw new Error(`not parsed: ${text}`);
  return mergeAnswers(a, patch);
}

describe("client path", () => {
  it("walks every step to the summary", () => {
    let a: Answers = { name: "Айгерим" };
    expect(currentStep(a)).toBe("role");
    a = mergeAnswers(a, choiceAnswer("role", "client"));
    expect(currentStep(a)).toBe("eventType");
    a = answer(a, "свадьба");
    a = answer(a, "15 августа");
    a = answer(a, "Бишкек");
    a = answer(a, "200");
    a = answer(a, "2 млн");
    expect(currentStep(a)).toBe("priorities");
    a = mergeAnswers(a, skipAnswer("priorities"));
    expect(currentStep(a)).toBe("summary");
    expect(progress(a)).toBeGreaterThan(0.8);
  });

  it("fills several steps from one message", () => {
    const a0: Answers = { name: "Айгерим", role: "client" };
    const a = answer(a0, "Свадьба 15 августа, человек 200, в Бишкеке");
    expect(a).toMatchObject({ eventType: "wedding", date: "2027-08-15", guests: 200, city: "bishkek" });
    expect(filledSteps(a0, a)).toEqual(["eventType", "date", "city", "guests"]);
    expect(currentStep(a)).toBe("budget");
  });

  it("picks up the event when answering the role in words", () => {
    const a = answer({ name: "Тимур" }, "планируем свадьбу 3 декабря");
    expect(a).toMatchObject({ role: "client", eventType: "wedding", date: "2026-12-03" });
  });

  it("does not overwrite answered steps", () => {
    const a: Answers = { name: "A", role: "client", eventType: "wedding", date: "2027-01-10" };
    const b = answer(a, "Ош");
    expect(b.date).toBe("2027-01-10");
    expect(b.city).toBe("osh");
  });

  it("edit from the summary re-asks just that step", () => {
    const a: Answers = {
      name: "A",
      role: "client",
      eventType: "wedding",
      date: "2027-01-10",
      city: "osh",
      guests: 100,
      budget: 0,
      priorities: [],
    };
    expect(currentStep(a)).toBe("summary");
    expect(currentStep(clearStep(a, "city"))).toBe("city");
  });
});

describe("vendor path", () => {
  it("asks vendor steps and allows skipping the phone", () => {
    let a: Answers = mergeAnswers({ name: "Бакыт" }, choiceAnswer("role", "vendor"));
    expect(currentStep(a)).toBe("bizName");
    a = answer(a, "Алтын Кортеж");
    a = answer(a, "кортежи и лимузины");
    expect(a.category).toBe("cars");
    a = answer(a, "Бишкек");
    expect(currentStep(a)).toBe("phone");
    a = mergeAnswers(a, skipAnswer("phone"));
    a = answer(a, "Кортежи премиум-класса с водителями в костюмах");
    expect(currentStep(a)).toBe("offerTitle");
    a = answer(a, "Кортеж G-Class на 4 часа — 12 000 сом");
    expect(a.offerTitle).toBe("Кортеж G-Class на 4 часа");
    expect(a.offerPrice).toBe(12000);
    expect(currentStep(a)).toBe("summary");
  });

  it("asks the price separately when it wasn't mentioned", () => {
    let a: Answers = {
      name: "B",
      role: "vendor",
      bizName: "X",
      category: "cars",
      city: "bishkek",
      phone: null,
      tagline: "Лучшие машины города",
    };
    a = answer(a, "Свадебный кортеж");
    expect(currentStep(a)).toBe("offerPrice");
    a = answer(a, "15 тыс");
    expect(a.offerPrice).toBe(15000);
  });

  it("ignores client fields on the vendor path", () => {
    const a = mergeAnswers({ name: "B", role: "vendor" }, { guests: 100, bizName: "X" });
    expect(a.guests).toBeUndefined();
    expect(a.bizName).toBe("X");
  });
});

describe("sanitizeAiFields", () => {
  it("keeps valid fields and drops junk", () => {
    const out = sanitizeAiFields(
      { date: "2027-08-15", guests: 180, city: "Bishkek", budget: -5, category: "rockets", priorities: ["halls", "x"] },
      NOW,
    );
    expect(out).toEqual({ date: "2027-08-15", guests: 180, city: "bishkek", priorities: ["halls"] });
    expect(sanitizeAiFields({ date: "2020-01-01" }, NOW)).toEqual({});
    expect(sanitizeAiFields(null)).toEqual({});
  });
});

describe("parseStory", () => {
  it("picks everything from one message", () => {
    const a = parseStory("Меня зовут Айгерим, у нас свадьба 14 июня в Бишкеке, человек 150, бюджет 1,5 млн, нужен ведущий и фотограф", NOW);
    expect(a.name).toBe("Айгерим");
    expect(a.role).toBe("client");
    expect(a.eventType).toBe("wedding");
    expect(a.city).toBe("bishkek");
    expect(a.guests).toBe(150);
    expect(a.budget).toBe(1_500_000);
    expect(a.date).toMatch(/-06-14$/);
    expect(a.priorities).toEqual(expect.arrayContaining(["hosts", "photo"]));
    // the chat continues with only what's missing
    expect(currentStep(mergeAnswers({}, a))).toBe("summary");
  });

  it("recognises a vendor", () => {
    const a = parseStory("Я фотограф, снимаю свадьбы в Оше, у меня своя студия", NOW);
    expect(a.role).toBe("vendor");
    expect(a.city).toBe("osh");
    expect(a.category).toBe("photo");
    expect(currentStep(mergeAnswers({}, a))).toBe("name");
  });

  it("recognises a vendor without «я …»", () => {
    expect(parseStory("Свадебный фотограф из Бишкека", NOW)).toMatchObject({ role: "vendor", category: "photo", city: "bishkek" });
    expect(parseStory("У нас банкетный зал в Бишкеке на 300 гостей", NOW)).toMatchObject({ role: "vendor", category: "halls" });
    expect(parseStory("Прокат лимузинов, Ош, +996 555 123 456", NOW)).toMatchObject({ role: "vendor", category: "cars", phone: "+996 555 123 456" });
  });

  it("keeps a client's wish list on the client path", () => {
    expect(parseStory("Свадьба 14 июня в Бишкеке, 150 гостей, ведущий и фотограф", NOW).role).toBe("client");
    expect(parseStory("Юбилей мамы в августе, 60 человек, нужен ресторан и ведущий", NOW).role).toBe("client");
  });

  it("the chosen path wins over the wording", () => {
    const a = parseStory("Свадьбы и юбилеи в Бишкеке", NOW, "vendor");
    expect(a).toMatchObject({ role: "vendor", city: "bishkek" });
    expect(a.eventType).toBeUndefined();
  });

  it("returns little for small talk", () => {
    expect(parseStory("привет", NOW)).toEqual({});
  });
});
