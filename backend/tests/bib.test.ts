import { nextBib } from "../src/utils/bib";

describe("unique bib generation", () => {
  it("should return the smallest available sequential bib", () => {
    expect(nextBib([1, 2, 4, 7])).toBe(3);
  });
});
