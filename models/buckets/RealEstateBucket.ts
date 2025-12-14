import { BucketData } from './Bucket';
import { InvestmentBucket } from './InvestmentBucket';

export class RealEstateBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'RealEstate' }); }
}
