import { describe, expect, it } from "vitest";
import { SeededRandom } from "./SeededRandom";

describe("SeededRandom", () => {
  it("repeats the same uniform and normal sequence for one seed", () => {
    const first = new SeededRandom(42);
    const second = new SeededRandom(42);
    const firstSequence = [
      first.next(),
      first.range(-3, 7),
      first.normal(),
      first.normal(5, 2),
    ];
    const secondSequence = [
      second.next(),
      second.range(-3, 7),
      second.normal(),
      second.normal(5, 2),
    ];
    expect(firstSequence).toEqual(secondSequence);
  });

  it("always emits half-open unit interval values", () => {
    const random = new SeededRandom(7);
    for (let index = 0; index < 1_000; index += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
