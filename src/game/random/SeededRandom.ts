export interface RandomSource {
  next(): number;
  range(minimum: number, maximum: number): number;
  normal(mean?: number, standardDeviation?: number): number;
}

/** A compact, deterministic PRNG with a full 32-bit state. */
export class SeededRandom implements RandomSource {
  private state: number;
  private spareNormal: number | null = null;

  public constructor(seed: number = SeededRandom.freshSeed()) {
    const finiteSeed = Number.isFinite(seed) ? seed : 0x6d2b79f5;
    this.state = (Math.trunc(finiteSeed) >>> 0) || 0x6d2b79f5;
  }

  public next(): number {
    // Mulberry32. The unsigned conversion keeps behaviour identical in JS
    // engines and makes snapshots/simulations portable.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  public range(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }

  public normal(mean = 0, standardDeviation = 1): number {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return mean + value * standardDeviation;
    }

    // Polar Box-Muller avoids log(0) and gives us two samples per transform.
    let u: number;
    let v: number;
    let radiusSquared: number;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      radiusSquared = u * u + v * v;
    } while (radiusSquared === 0 || radiusSquared >= 1);

    const scale = Math.sqrt((-2 * Math.log(radiusSquared)) / radiusSquared);
    this.spareNormal = v * scale;
    return mean + u * scale * standardDeviation;
  }

  private static freshSeed(): number {
    const time = Date.now() >>> 0;
    const noise = Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
    return (time ^ noise) >>> 0;
  }
}
