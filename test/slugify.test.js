const { slugify } = require("../content.js");

describe("slugify", () => {
  test("lowercases and hyphenates words", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("strips accents", () => {
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });

  test("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("a!!b??c")).toBe("a-b-c");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  test("returns an empty string for input with no alphanumerics", () => {
    expect(slugify("???")).toBe("");
  });
});
