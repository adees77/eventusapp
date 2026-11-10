import { describe, expect, it } from "vitest";
import {
  type Answers,
  choiceAnswer,
  clearStep,
  currentStep,
  filledSteps,
  mergeAnswers,
  parseAnswer,
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
      name: "A", role: "client", eventType: "wedding", date: "2027-01-10", city: "osh", guests: 100, budget: 0, priorities: [],
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
    expect(currentStep(a)).toBe("summary");
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
