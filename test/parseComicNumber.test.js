const { parseComicNumber } = require("../content.js");

describe("parseComicNumber", () => {
  test("parses a numeric pathname", () => {
    expect(parseComicNumber("/353/")).toBe(353);
  });

  test("parses a pathname without a trailing slash", () => {
    expect(parseComicNumber("/353")).toBe(353);
  });

  test("returns null for the archive root", () => {
    expect(parseComicNumber("/")).toBeNull();
  });

  test("returns null for non-numeric paths", () => {
    expect(parseComicNumber("/archive/")).toBeNull();
  });
});
