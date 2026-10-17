/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const {
  adjacentComicNumbers,
  extractComicImageSource,
  preloadComicImage,
  prefetchAdjacentComics
} = require("../content.js");

function parse(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

const comicPage = `<div id="comic"><img src="//imgs.xkcd.com/comics/a.png"
  srcset="//imgs.xkcd.com/comics/a_2x.png 2x" title="joke"></div>`;

describe("adjacentComicNumbers", () => {
  test("returns the previous and next comic", () => {
    expect(adjacentComicNumbers(353)).toEqual([352, 354]);
  });

  test("has no previous comic for comic 1", () => {
    expect(adjacentComicNumbers(1)).toEqual([2]);
  });
});

describe("extractComicImageSource", () => {
  test("reads src and srcset from the comic image", () => {
    expect(extractComicImageSource(parse(comicPage))).toEqual({
      src: "//imgs.xkcd.com/comics/a.png",
      srcset: "//imgs.xkcd.com/comics/a_2x.png 2x"
    });
  });

  test("returns a null srcset when the image has none", () => {
    const doc = parse('<div id="comic"><img src="/a.png"></div>');
    expect(extractComicImageSource(doc)).toEqual({ src: "/a.png", srcset: null });
  });

  test("returns null when there is no comic image", () => {
    expect(extractComicImageSource(parse("<p>nothing</p>"))).toBeNull();
  });
});

describe("preloadComicImage", () => {
  test("adds a preload link carrying src and srcset", () => {
    const link = preloadComicImage({
      src: "//imgs.xkcd.com/comics/a.png",
      srcset: "//imgs.xkcd.com/comics/a_2x.png 2x"
    });

    expect(link.parentElement).toBe(document.head);
    expect(link.rel).toBe("preload");
    expect(link.getAttribute("as")).toBe("image");
    expect(link.getAttribute("href")).toBe("//imgs.xkcd.com/comics/a.png");
    expect(link.getAttribute("imagesrcset")).toBe("//imgs.xkcd.com/comics/a_2x.png 2x");
  });

  test("omits imagesrcset when the image has none", () => {
    const link = preloadComicImage({ src: "/a.png", srcset: null });

    expect(link.hasAttribute("imagesrcset")).toBe(false);
  });
});

describe("prefetchAdjacentComics", () => {
  const preloads = () => document.head.querySelectorAll('link[rel="preload"]');

  test("fetches both neighbours and preloads their images", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(comicPage) })
    );

    await prefetchAdjacentComics(353);

    expect(global.fetch).toHaveBeenCalledWith("https://xkcd.com/352/");
    expect(global.fetch).toHaveBeenCalledWith("https://xkcd.com/354/");
    expect(preloads()).toHaveLength(2);
  });

  test("skips the previous comic on comic 1", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(comicPage) })
    );

    await prefetchAdjacentComics(1);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("https://xkcd.com/2/");
  });

  test("ignores a missing page (next of the latest comic)", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));

    await prefetchAdjacentComics(353);

    expect(preloads()).toHaveLength(0);
  });

  test("swallows network errors", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("offline")));

    await expect(prefetchAdjacentComics(353)).resolves.toBeDefined();
  });
});
