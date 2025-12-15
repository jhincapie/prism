import { BucketData } from './Bucket';
import { InvestmentBucket } from './InvestmentBucket';

export class StockBucket extends InvestmentBucket {
    constructor(data: BucketData) { super({ ...data, type: 'Stocks' }); }
}
