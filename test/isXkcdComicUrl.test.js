const { isXkcdComicUrl } = require("../content.js");

describe("isXkcdComicUrl", () => {
  test("matches a bare xkcd.com comic URL", () => {
    expect(isXkcdComicUrl("https://xkcd.com/353/")).toBe(true);
  });

  test("matches www. and no-trailing-slash variants", () => {
    expect(isXkcdComicUrl("https://www.xkcd.com/353")).toBe(true);
  });

  test("rejects the home page", () => {
    expect(isXkcdComicUrl("https://xkcd.com/")).toBe(false);
  });

  test("rejects non-comic subpaths", () => {
    expect(isXkcdComicUrl("https://xkcd.com/archive/")).toBe(false);
  });

  test("rejects http (non-https) URLs", () => {
    expect(isXkcdComicUrl("http://xkcd.com/353/")).toBe(false);
  });
});
