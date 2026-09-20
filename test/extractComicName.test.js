const { extractComicName } = require("../content.js");

function heading(text) {
  const el = document.createElement("div");
  el.id = "ctitle";
  el.textContent = text;
  return el;
}

function image({ alt, title } = {}) {
  const img = document.createElement("img");
  if (alt !== undefined) img.setAttribute("alt", alt);
  if (title !== undefined) img.setAttribute("title", title);
  return img;
}

describe("extractComicName", () => {
  test("prefers the #ctitle heading", () => {
    expect(extractComicName(heading("Python"), image({ alt: "Other" }))).toBe("Python");
  });

  test("falls back to the image alt when there is no heading", () => {
    expect(extractComicName(null, image({ alt: "Python" }))).toBe("Python");
  });

  test("falls back to the image alt when the heading is blank", () => {
    expect(extractComicName(heading("   "), image({ alt: "Python" }))).toBe("Python");
  });

  test("never uses the image title attribute (the hover text)", () => {
    expect(extractComicName(null, image({ title: "the hover joke" }))).toBe("");
  });

  test("trims whitespace", () => {
    expect(extractComicName(heading("  Python  "), null)).toBe("Python");
  });

  test("returns an empty string when neither source is available", () => {
    expect(extractComicName(null, null)).toBe("");
  });
});
