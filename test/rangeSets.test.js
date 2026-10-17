/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const {
  parseRangeList,
  encodeRanges,
  decodeRanges,
  rangesToSet,
  setToRanges,
  favoriteNeighbor,
  unreadNeighbor
} = require("../content.js");

describe("parseRangeList", () => {
  test("accepts a-b, a..b and single numbers, ends included", () => {
    expect(parseRangeList("1-117\n160..190\n200").ranges).toEqual([
      [1, 117],
      [160, 190],
      [200, 200]
    ]);
  });

  test("ignores trailing text, blank lines and CRLF", () => {
    const { ranges, invalid } = parseRangeList("979..1011 (33 missing)\r\n\r\n 5 \r\n");
    expect(ranges).toEqual([[5, 5], [979, 1011]]);
    expect(invalid).toEqual([]);
  });

  test("merges overlapping and adjacent ranges and fixes reversed ones", () => {
    expect(parseRangeList("10-20\n21-30\n25-40\n60..50").ranges).toEqual([
      [10, 40],
      [50, 60]
    ]);
  });

  test("reports lines that are not ranges", () => {
    const { ranges, invalid } = parseRangeList("1-5\nhello\n0-3");
    expect(ranges).toEqual([[1, 5]]);
    expect(invalid).toEqual(["hello", "0-3"]);
  });
});

describe("range encoding", () => {
  test("round-trips through the compact string", () => {
    const ranges = [[1, 117], [160, 160], [200, 210]];
    expect(encodeRanges(ranges)).toBe("1-117,160,200-210");
    expect(decodeRanges("1-117,160,200-210")).toEqual(ranges);
  });

  test("decodes empty or missing values as no ranges", () => {
    expect(decodeRanges("")).toEqual([]);
    expect(decodeRanges(undefined)).toEqual([]);
  });

  test("converts between sets and ranges", () => {
    const set = rangesToSet([[1, 3], [7, 7]]);
    expect([...set]).toEqual([1, 2, 3, 7]);
    expect(setToRanges(set)).toEqual([[1, 3], [7, 7]]);
  });
});

describe("favoriteNeighbor", () => {
  const favorites = new Set([10, 50, 300]);

  test("finds the closest favorite on each side, even from a non-favorite", () => {
    expect(favoriteNeighbor(favorites, 100, 1)).toBe(300);
    expect(favoriteNeighbor(favorites, 100, -1)).toBe(50);
    expect(favoriteNeighbor(favorites, 50, 1)).toBe(300);
  });

  test("returns null when there is none in that direction", () => {
    expect(favoriteNeighbor(favorites, 300, 1)).toBeNull();
    expect(favoriteNeighbor(favorites, 10, -1)).toBeNull();
  });
});

describe("unreadNeighbor", () => {
  const seen = rangesToSet([[1, 117], [160, 190]]);

  test("skips over read ranges", () => {
    expect(unreadNeighbor(seen, 117, 1)).toBe(118);
    expect(unreadNeighbor(seen, 159, 1)).toBe(191);
    expect(unreadNeighbor(seen, 190, -1)).toBe(159);
    expect(unreadNeighbor(seen, 160, -1)).toBe(159);
  });

  test("returns null before the first comic", () => {
    expect(unreadNeighbor(seen, 118, -1)).toBeNull();
  });

  test("stops at the latest known comic", () => {
    expect(unreadNeighbor(seen, 190, 1, 190)).toBeNull();
    expect(unreadNeighbor(seen, 190, 1, 191)).toBe(191);
  });
});
