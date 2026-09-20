const { isXkcdComicUrl } = require("../content.js");

describe("isXkcdComicUrl", () => {
  test("matches a bare xkcd.com comic URL", () => {
    expect(isXkcdComicUrl("https://xkcd.com/353/")).toBe(true);
  });

  test("matches www. and no-trailing-slash variants", () => {
    expect(isXkcdComicUrl("https://www.xkcd.com/353")).toBe(true);
  });

  test("matches the home page (it serves the latest comic)", () => {
    expect(isXkcdComicUrl("https://xkcd.com/")).toBe(true);
  });

  test("matches the www home page with no trailing slash", () => {
    expect(isXkcdComicUrl("https://www.xkcd.com")).toBe(false);
  });

  test("rejects non-comic subpaths", () => {
    expect(isXkcdComicUrl("https://xkcd.com/archive/")).toBe(false);
  });

  test("rejects http (non-https) URLs", () => {
    expect(isXkcdComicUrl("http://xkcd.com/353/")).toBe(false);
  });
});
