import { BucketFactory } from './BucketFactory';
import { Bucket, BucketData } from './Bucket';
import { randomNorm } from '../../services/math';

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
