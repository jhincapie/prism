import { BucketData } from './Bucket';
import { InvestmentBucket } from './InvestmentBucket';

export class OtherBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'Other' }); }
}
