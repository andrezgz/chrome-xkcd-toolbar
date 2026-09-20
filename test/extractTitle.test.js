const { extractTitle } = require("../content.js");

describe("extractTitle", () => {
  test("returns null when there is no image", () => {
    expect(extractTitle(null)).toBeNull();
  });

  test("returns the title attribute (the hover text)", () => {
    const img = document.createElement("img");
    img.setAttribute("title", "the hover text");
    img.setAttribute("alt", "the alt text");
    expect(extractTitle(img)).toBe("the hover text");
  });

  test("does not fall back to alt when title is missing", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "the alt text");
    expect(extractTitle(img)).toBe("");
  });

  test("trims whitespace", () => {
    const img = document.createElement("img");
    img.setAttribute("title", "  padded  ");
    expect(extractTitle(img)).toBe("padded");
  });

  test("returns an empty string when the title attribute is missing", () => {
    const img = document.createElement("img");
    expect(extractTitle(img)).toBe("");
  });
});
