
export type BucketType = 'Cash' | 'RealEstate' | 'Stocks' | 'Bitcoin' | 'Other';

export interface BucketData {
    id: string;
    name: string;
    type: BucketType;
    initialValue: number;
    enabled: boolean;
    color?: string;
    meanReturn?: number;
    stdDev?: number;
    appreciationStrategy?: 'fixed' | 'btcConservative' | 'btcPowerLaw';
}

const getRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Abstract Base Class for all Investment Buckets
 */
export abstract class Bucket {
    public readonly id: string;
    public readonly name: string;
    public readonly type: BucketType;
    public readonly initialValue: number;
    public readonly enabled: boolean;
    public readonly color: string;

    constructor(data: BucketData) {
        this.id = data.id;
        this.name = data.name ?? 'Asset';
        this.type = data.type ?? 'Other';
        this.initialValue = data.initialValue ?? 0;
        this.enabled = data.enabled ?? true;
        this.color = data.color || getRandomColor();
    }

    /**
     * Calculates the return rate for a single simulation year.
     * @param currentCalendarYear The actual calendar year (e.g., 2026)
     */
    abstract getAnnualReturnRate(currentCalendarYear: number): number;

    /**
     * Creates a new instance of this bucket with updated fields.
     * Used for React immutability.
     */
    abstract update(changes: Partial<BucketData>): Bucket;
}
