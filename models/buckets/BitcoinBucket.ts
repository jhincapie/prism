import { BucketData } from './Bucket';
import { InvestmentBucket } from './InvestmentBucket';
import { randomNorm } from '../../services/math';

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
