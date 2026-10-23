import { describe, expect, it } from "vitest";
import { matchesListQuery } from "./search";

describe("matchesListQuery", () => {
  it("R-LIST-8: matches a case-insensitive substring", () => {
    expect(matchesListQuery("Work Projects", "proj")).toBe(true);
  });

  it("R-LIST-8: ignores diacritics on either side", () => {
    expect(matchesListQuery("Ünïcode lists", "unicode")).toBe(true);
    expect(matchesListQuery("Cafe", "café")).toBe(true);
  });

  it("R-LIST-8: folds Cyrillic case", () => {
    expect(matchesListQuery("Дом и сад", "дом")).toBe(true);
  });

  it("R-LIST-8: stripping marks folds Cyrillic й to и (accepted trade-off)", () => {
    expect(matchesListQuery("Мой список", "мои")).toBe(true);
  });

  it("R-LIST-8: applies compatibility normalisation (ligatures, full-width)", () => {
    expect(matchesListQuery("ﬁle archive", "file")).toBe(true);
    expect(matchesListQuery("ＡＢＣ", "abc")).toBe(true);
  });

  it("R-LIST-8: a blank or whitespace-only query matches every name", () => {
    expect(matchesListQuery("Anything", "")).toBe(true);
    expect(matchesListQuery("Anything", "   \t")).toBe(true);
    expect(matchesListQuery("", "")).toBe(true);
  });

  it("R-LIST-8: the query is trimmed before matching", () => {
    expect(matchesListQuery("Unicode", "  uni  ")).toBe(true);
  });

  it("R-LIST-8: a non-matching query returns false", () => {
    expect(matchesListQuery("Groceries", "work")).toBe(false);
    expect(matchesListQuery("", "x")).toBe(false);
  });
});
