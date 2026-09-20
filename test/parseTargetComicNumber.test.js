const { parseTargetComicNumber } = require("../content.js");

describe("parseTargetComicNumber", () => {
  test("parses a valid numeric string", () => {
    expect(parseTargetComicNumber("42")).toBe(42);
  });

  test("trims surrounding whitespace", () => {
    expect(parseTargetComicNumber("  353  ")).toBe(353);
  });

  test("returns null when the prompt was cancelled", () => {
    expect(parseTargetComicNumber(null)).toBeNull();
  });

  test("returns null for an empty string", () => {
    expect(parseTargetComicNumber("")).toBeNull();
  });

  test("returns null for non-numeric input", () => {
    expect(parseTargetComicNumber("abc")).toBeNull();
  });

  test("returns null for a decimal number", () => {
    expect(parseTargetComicNumber("12.5")).toBeNull();
  });

  test("returns null for a negative number", () => {
    expect(parseTargetComicNumber("-5")).toBeNull();
  });

  test("clamps 0 up to comic 1", () => {
    expect(parseTargetComicNumber("0")).toBe(1);
  });
});
