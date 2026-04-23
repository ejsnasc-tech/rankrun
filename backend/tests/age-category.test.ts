import { calculateAgeForEvent } from "../src/utils/time";

describe("category by age", () => {
  it("should calculate age for event date", () => {
    const age = calculateAgeForEvent(new Date("2026-06-01"), new Date("2000-06-10"));
    expect(age).toBe(25);
  });
});
