
import { Bucket, BitcoinBucket } from '../models/Bucket';

/**
 * Calculates the projected mean return for a bucket for a specific year.
 * Handles specialized logic like Bitcoin's power law or conservative decay curves.
 */
export const getProjectedMean = (bucket: Bucket, yearIndex: number, startYear: number): number => {
    // For BitcoinBucket logic
    if (bucket instanceof BitcoinBucket && bucket.appreciationStrategy && bucket.appreciationStrategy !== 'fixed') {
        const strategyRates = bucket.appreciationStrategy === 'btcConservative' 
            ? BitcoinBucket.CONSERVATIVE_RATES 
            : BitcoinBucket.POWER_LAW_RATES;
            
        const currentCalendarYear = startYear + yearIndex;
        const rateIndex = currentCalendarYear - BitcoinBucket.RATES_START_YEAR;

        if (rateIndex >= 0 && rateIndex < strategyRates.length) {
            return strategyRates[rateIndex];
        }
        // Fallback to standard mean if outside projected range
        return bucket.meanReturn ?? 0.08;
    }
    
    // For standard buckets
    return (bucket as any).meanReturn ?? 0;
};

/**
 * Generates a small jitter for deterministic scenario lines so they don't look artificial.
 */
export const generateScenarioJitter = (): number => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const rand = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return rand * 0.005; // 0.5% standard deviation jitter
};
