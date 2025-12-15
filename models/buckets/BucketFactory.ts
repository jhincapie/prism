import { Bucket, BucketData } from './Bucket';
import { CashBucket } from './CashBucket';
import { StockBucket } from './StockBucket';
import { RealEstateBucket } from './RealEstateBucket';
import { BitcoinBucket } from './BitcoinBucket';
import { OtherBucket } from './OtherBucket';

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
