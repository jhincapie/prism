import { Bucket, BucketData } from './Bucket';
import { BucketFactory } from './BucketFactory';
import { randomNorm } from '../../services/math';

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
