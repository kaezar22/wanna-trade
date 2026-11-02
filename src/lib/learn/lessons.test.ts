import { describe, expect, it } from "vitest";
import { LESSONS, getLesson, lessonText } from "./lessons";

describe("ruta de aprendizaje", () => {
  it("tiene slugs únicos y niveles consecutivos", () => {
    expect(new Set(LESSONS.map((l) => l.slug)).size).toBe(LESSONS.length);
    expect(LESSONS.map((l) => l.level)).toEqual(LESSONS.map((_, i) => i + 1));
  });

  it("cada pregunta del quiz tiene una respuesta válida y explicación", () => {
    for (const l of LESSONS) {
      expect(l.quiz.length).toBeGreaterThanOrEqual(3);
      for (const q of l.quiz) {
        expect(q.answer, `${l.slug}: ${q.q}`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${l.slug}: ${q.q}`).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.why.length).toBeGreaterThan(20);
      }
    }
  });

  it("las misiones y herramientas apuntan a rutas de la app", () => {
    const routes = ["/analizar", "/simular"];
    for (const l of LESSONS) {
      expect(routes.some((r) => l.mission.href.startsWith(r)), l.mission.href).toBe(true);
      for (const b of l.blocks) {
        if (b.t === "tool") expect(b.href.startsWith("/analizar")).toBe(true);
      }
    }
  });

  it("las negritas están balanceadas", () => {
    for (const l of LESSONS) {
      for (const b of l.blocks) {
        const texts = b.t === "list" ? b.items : "text" in b ? [b.text] : [];
        for (const t of texts) expect((t.match(/\*\*/g) ?? []).length % 2, t).toBe(0);
      }
    }
  });

  it("el texto para el tutor incluye el contenido sin marcas", () => {
    const text = lessonText(getLesson("fundamentos")!);
    expect(text).toContain("interés compuesto");
    expect(text).not.toContain("**");
    expect(getLesson("no-existe")).toBeNull();
  });
});
