
import type { BucketType } from '../types';

export enum Regime {
    Calm = 0,
    Volatile = 1,
    Panic = 2
}

// Transition Matrix CDF (Cumulative Probability)
// [To Calm threshold, To Volatile threshold]
// Logic: r = Math.random(). if r < index0 -> Calm. else if r < index1 -> Volatile. else -> Panic.
export const TRANSITIONS = {
    [Regime.Calm]: [0.80, 1.00],      // 80% Stay Calm, 20% -> Volatile, 0% -> Panic
    [Regime.Volatile]: [0.45, 0.95],  // 45% -> Calm, 50% Stay Volatile, 5% -> Panic
    [Regime.Panic]: [0.00, 0.60]      // 0% -> Calm (sticky), 60% -> Volatile, 40% Stay Panic
};

export interface PanicParams {
    mean: number;
    volMultiplier: number;
    crisisBeta: number;
}

// Define how each asset type behaves during a Systemic Panic
export const getPanicParams = (type: BucketType, baselineMean: number, baselineVol: number): PanicParams => {
    switch (type) {
        case 'Stocks': 
            // -20% Crash, Double Volatility, Perfect Correlation
            return { mean: -0.20, volMultiplier: 2.0, crisisBeta: 1.0 };
        case 'RealEstate':
            // -10% Dip, Higher Vol, High Correlation
            return { mean: -0.10, volMultiplier: 1.5, crisisBeta: 0.6 };
        case 'Bitcoin':
            // -40% Crash, Triple Vol, Hyper Correlation (Liquidity Valve)
            return { mean: -0.40, volMultiplier: 3.0, crisisBeta: 1.5 };
        case 'Cash':
            // Safe Haven. Uncorrelated.
            return { mean: baselineMean, volMultiplier: 1.0, crisisBeta: 0.0 };
        default:
            // "Other" / Alternative Assets. Low correlation catch-all.
            return { mean: 0.0, volMultiplier: 1.0, crisisBeta: 0.2 };
    }
};

/**
 * Determines the next regime state based on current state and a random probability.
 */
export const getNextRegime = (currentRegime: Regime): Regime => {
    const r = Math.random();
    const thresholds = TRANSITIONS[currentRegime];
    if (r < thresholds[0]) return Regime.Calm;
    if (r < thresholds[1]) return Regime.Volatile;
    return Regime.Panic;
};

/**
 * Generates a random variable that blends global systemic shock with idiosyncratic risk
 * based on the asset's correlation (beta) to the crisis.
 */
export const calculateCorrelatedRandom = (systemicShock: number, idiosyncraticRandom: number, crisisBeta: number): number => {
    // Clamp correlation between -0.99 and 0.99 to avoid math errors
    const rho = Math.min(0.99, Math.max(-0.99, crisisBeta));
    return (systemicShock * rho) + (idiosyncraticRandom * Math.sqrt(1 - rho * rho));
};
