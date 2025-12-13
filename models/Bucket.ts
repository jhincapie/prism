
import { randomNorm } from '../services/math';

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

/**
 * Cash Bucket
 * Low volatility, usually 0 real return or strictly nominal interest.
 */
export class CashBucket extends Bucket {
    // Cash might have a small interest rate, but often treated as 0 in simple models or match inflation
    // For this app's existing logic, cash had 0 mean, 0 stdDev.
    public readonly meanReturn: number = 0; 
    public readonly stdDev: number = 0;

    constructor(data: BucketData) {
        super({ ...data, type: 'Cash' });
        // Allow overriding if user really wants high yield savings logic
        if (data.meanReturn !== undefined) this.meanReturn = data.meanReturn;
        if (data.stdDev !== undefined) this.stdDev = data.stdDev;
    }

    getAnnualReturnRate(currentCalendarYear: number): number {
        return this.meanReturn + this.stdDev * randomNorm();
    }

    update(changes: Partial<BucketData>): Bucket {
        if (changes.type && changes.type !== 'Cash') {
            return BucketFactory.create({ ...this, ...changes });
        }
        return new CashBucket({ ...this, ...changes });
    }
}

/**
 * Standard Investment Bucket (Stocks, Real Estate, Other)
 * Uses Geometric Brownian Motion.
 */
export class InvestmentBucket extends Bucket {
    public readonly meanReturn: number;
    public readonly stdDev: number;

    constructor(data: BucketData) {
        super(data);
        this.meanReturn = data.meanReturn ?? 0.08;
        this.stdDev = data.stdDev ?? 0.15;
    }

    getAnnualReturnRate(currentCalendarYear: number): number {
        return this.meanReturn + this.stdDev * randomNorm();
    }

    update(changes: Partial<BucketData>): Bucket {
        // If type changes, we need the factory, but for internal updates:
        if (changes.type && changes.type !== this.type) {
             return BucketFactory.create({ ...this, ...changes });
        }
        return new (this.constructor as any)({ ...this, ...changes });
    }
}

export class StockBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'Stocks' }); }
}

export class RealEstateBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'RealEstate' }); }
}

export class OtherBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'Other' }); }
}

/**
 * Bitcoin Bucket
 * Specialized logic for appreciation strategies.
 */
export class BitcoinBucket extends InvestmentBucket {
    public readonly appreciationStrategy: 'fixed' | 'btcConservative' | 'btcPowerLaw';

    public static readonly CONSERVATIVE_RATES = [0.1892, 0.1892, 0.1892, 0.1892, 0.1892, 0.1892, 0.1892, 0.1892, 0.1892, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1700, 0.1400, 0.1400, 0.1400, 0.1400, 0.1400, 0.1400];
    public static readonly POWER_LAW_RATES = [0.3950, 0.3701, 0.3492, 0.3285, 0.3111, 0.2954, 0.2820, 0.2682, 0.2565, 0.2457, 0.2365, 0.2266, 0.2181, 0.2103, 0.2036, 0.1961, 0.1898, 0.1838, 0.1787, 0.1729, 0.1679, 0.1632, 0.1592, 0.1545, 0.1505];
    public static readonly RATES_START_YEAR = 2026;

    constructor(data: BucketData) {
        // Pass defaults for Bitcoin if not present in data
        super({ 
            ...data, 
            type: 'Bitcoin',
            meanReturn: data.meanReturn ?? 0.14,
            stdDev: data.stdDev ?? 0.30
        });
        this.appreciationStrategy = data.appreciationStrategy ?? 'btcConservative';
    }

    getAnnualReturnRate(currentCalendarYear: number): number {
        if (this.appreciationStrategy !== 'fixed') {
            const strategyRates = this.appreciationStrategy === 'btcConservative' 
                ? BitcoinBucket.CONSERVATIVE_RATES 
                : BitcoinBucket.POWER_LAW_RATES;
            
            const rateIndex = currentCalendarYear - BitcoinBucket.RATES_START_YEAR;

            if (rateIndex >= 0 && rateIndex < strategyRates.length) {
                const projectedMean = strategyRates[rateIndex];
                return projectedMean + this.stdDev * randomNorm();
            }
        }
        
        // Fallback to standard GBM (InvestmentBucket logic)
        return super.getAnnualReturnRate(currentCalendarYear);
    }

    // No need to implement update() here; it inherits the polymorphic update() from InvestmentBucket
}

/**
 * Factory to hydrate objects from JSON/Data and switch types.
 */
export class BucketFactory {
    static create(data: BucketData): Bucket {
        switch (data.type) {
            case 'Cash':
                return new CashBucket(data);
            case 'Stocks':
                return new StockBucket(data);
            case 'RealEstate':
                return new RealEstateBucket(data);
            case 'Bitcoin':
                return new BitcoinBucket(data);
            case 'Other':
                return new OtherBucket(data);
            default:
                // Default fallback
                return new OtherBucket(data);
        }
    }
}
