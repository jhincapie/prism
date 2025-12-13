
export type ScenarioStep = {
    Stocks: number;
    RealEstate: number;
    Bitcoin: number;
    Cash: number;
    Other: number;
};

export type ScenarioDefinition = {
    steps: ScenarioStep[];
};

export interface StressScenarioOption {
    id: string;
    label: string;
    desc: string;
}

// UI Options for the Dropdown
export const STRESS_SCENARIO_OPTIONS: StressScenarioOption[] = [
    { 
        id: '', 
        label: 'None (Standard/Probabilistic)',
        desc: 'Uses Monte Carlo randomness from year 1.' 
    },
    { 
        id: 'depression_1929', 
        label: 'The Great Depression (1929)', 
        desc: 'Forces 4 years of deflationary collapse. Stocks -80%.' 
    },
    { 
        id: 'dotcom_2000', 
        label: 'Dot-Com Bust (2000)', 
        desc: 'Tech crash simulation. 3 years of Nasdaq drawdown.' 
    },
    { 
        id: 'gfc_2008', 
        label: 'Global Financial Crisis (2008)', 
        desc: 'Systemic failure. Real Estate and Stocks crash together.' 
    },
    { 
        id: 'currency_collapse', 
        label: 'Currency Collapse (Future)', 
        desc: 'Hyperinflation scenario. Cash crushed, hard assets fly.' 
    }
];

// The mathematical definitions for the engine
export const SCENARIOS_MAP: Record<string, ScenarioDefinition> = {
    'depression_1929': {
        // Source: Historical DJIA 1929-1932. Real Estate estimated illiquidity drop.
        steps: [
            { Stocks: -0.17, RealEstate: -0.05, Bitcoin: -0.25, Cash: 0.04, Other: -0.10 }, // Year 1 (1929)
            { Stocks: -0.33, RealEstate: -0.10, Bitcoin: -0.50, Cash: 0.04, Other: -0.20 }, // Year 2 (1930)
            { Stocks: -0.52, RealEstate: -0.15, Bitcoin: -0.70, Cash: 0.04, Other: -0.30 }, // Year 3 (1931 - Brutal)
            { Stocks: -0.23, RealEstate: -0.10, Bitcoin: -0.20, Cash: 0.04, Other: -0.10 }, // Year 4 (1932 - Bottom)
        ]
    },
    'dotcom_2000': {
        // Source: Nasdaq 2000-2002. RE was safe.
        steps: [
            { Stocks: -0.39, RealEstate: 0.05, Bitcoin: -0.40, Cash: 0.06, Other: -0.15 }, // Year 1 (2000)
            { Stocks: -0.21, RealEstate: 0.06, Bitcoin: -0.20, Cash: 0.04, Other: -0.10 }, // Year 2 (2001)
            { Stocks: -0.31, RealEstate: 0.08, Bitcoin: -0.30, Cash: 0.02, Other: -0.15 }, // Year 3 (2002)
        ]
    },
    'gfc_2008': {
        // Source: S&P 500 2008. RE Crash.
        steps: [
            { Stocks: -0.38, RealEstate: -0.20, Bitcoin: -0.60, Cash: 0.01, Other: -0.25 }, // Year 1 (2008)
            { Stocks: 0.23, RealEstate: -0.10, Bitcoin: 1.00, Cash: 0.00, Other: 0.10 },    // Year 2 (2009 - Rebound starts, RE lags)
        ]
    },
    'currency_collapse': {
        // Hypothetical Hyperinflation. Cash dies. Hard assets fly.
        // Nominal Returns shown here (Real return of cash is negative).
        steps: [
            { Stocks: 0.10, RealEstate: 0.30, Bitcoin: 1.00, Cash: -0.10, Other: 0.30 }, // Year 1
            { Stocks: 0.20, RealEstate: 0.50, Bitcoin: 1.50, Cash: -0.20, Other: 0.50 }, // Year 2
            { Stocks: 0.30, RealEstate: 0.80, Bitcoin: 2.00, Cash: -0.30, Other: 0.80 }, // Year 3
        ]
    }
};
