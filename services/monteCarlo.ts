
import type { SimulationParams, SimulationPath, BucketType } from '../types';
import { SCENARIOS_MAP } from './scenarios';
import { Regime, getNextRegime, getPanicParams, calculateCorrelatedRandom } from './regimes';
import { getProjectedMean, generateScenarioJitter } from './simulationUtils';

// Helper to calculate the median path from a set of paths
const calculateMedianPath = (paths: number[][], years: number): SimulationPath => {
    const medianPath: SimulationPath = new Array(years + 1);
    const numSims = paths.length;
    
    for (let y = 0; y <= years; y++) {
        const valuesAtYear = new Float64Array(numSims);
        for (let i = 0; i < numSims; i++) {
            valuesAtYear[i] = paths[i][y];
        }
        valuesAtYear.sort();
        const medianVal = valuesAtYear[Math.floor(numSims * 0.5)];
        medianPath[y] = { year: y, value: medianVal };
    }
    return medianPath;
};

export const runMonteCarloSimulation = async (
  params: SimulationParams,
  onProgress: (completed: number) => void
): Promise<{
  paths: SimulationPath[];
  liquidPaths: SimulationPath[];
  finalCompositions: number[][];
  activeBucketNames: string[];
  benchmarkPaths: { spy: SimulationPath; qqq: SimulationPath };
}> => {
  const { years, simulations, isDynamicMode, stressTestScenarioId } = params;
  const activeBuckets = params.buckets.filter(b => b.enabled);

  if (simulations <= 0 || years <= 0) {
    throw new Error("Number of simulations and years must be positive.");
  }
  
  // Benchmark Configuration
  // SPY: ~14% Nominal (0.14), ~16% Vol
  // QQQ: ~20% Nominal (0.20), ~22% Vol
  const SPY_MEAN = 0.14; 
  const SPY_VOL = 0.16;
  const QQQ_MEAN = 0.20;
  const QQQ_VOL = 0.22;

  // We track raw values for benchmarks to compute the median path later
  // Using Float64Array for memory efficiency if possible, but array of arrays is easier for median transpose
  const spyResults: number[][] = new Array(simulations);
  const qqqResults: number[][] = new Array(simulations);

  if (activeBuckets.length === 0) {
    const zeroPath: SimulationPath = Array.from({ length: years + 1 }, (_, i) => ({ year: i, value: 0 }));
    onProgress(simulations);
    return {
      paths: Array(simulations).fill(zeroPath),
      liquidPaths: Array(simulations).fill(zeroPath),
      finalCompositions: Array(simulations).fill([]),
      activeBucketNames: [],
      benchmarkPaths: { spy: zeroPath, qqq: zeroPath }
    };
  }

  const startYear = new Date().getFullYear();
  const results: SimulationPath[] = new Array(simulations);
  const liquidResults: SimulationPath[] = new Array(simulations);
  const finalCompositions: number[][] = new Array(simulations);
  const numBuckets = activeBuckets.length;

  // --- PRE-CALCULATION PHASE ---
  const totalYears = years + 1;
  const meansFlat = new Float32Array(totalYears * numBuckets);
  const stdDevsFlat = new Float32Array(numBuckets);
  const initialValuesFlat = new Float64Array(numBuckets);
  const isLiquidFlat = new Float32Array(numBuckets);
  
  // Dynamic Mode Pre-calcs
  const panicMeansFlat = new Float32Array(numBuckets);
  const panicVolMultFlat = new Float32Array(numBuckets);
  const crisisBetaFlat = new Float32Array(numBuckets);
  const bucketTypes: BucketType[] = activeBuckets.map(b => b.type);

  // Populate Means & Flags
  for (let y = 0; y < totalYears; y++) {
      for (let b = 0; b < numBuckets; b++) {
          meansFlat[y * numBuckets + b] = getProjectedMean(activeBuckets[b], y, startYear);
      }
  }

  // Populate Static Bucket Data & Panic Params
  for (let b = 0; b < numBuckets; b++) {
      initialValuesFlat[b] = activeBuckets[b].initialValue;
      const baseVol = (activeBuckets[b] as any).stdDev ?? 0;
      stdDevsFlat[b] = baseVol;
      isLiquidFlat[b] = activeBuckets[b].type !== 'RealEstate' ? 1.0 : 0.0;

      if (isDynamicMode) {
          const panicParams = getPanicParams(activeBuckets[b].type, meansFlat[0 * numBuckets + b], baseVol);
          panicMeansFlat[b] = panicParams.mean;
          panicVolMultFlat[b] = panicParams.volMultiplier;
          crisisBetaFlat[b] = panicParams.crisisBeta;
      }
  }

  // Pre-calc Benchmark Panic Params
  // SPY behaves like 'Stocks'
  const spyPanic = getPanicParams('Stocks', SPY_MEAN, SPY_VOL);
  // QQQ behaves like 'Stocks' but higher beta/vol
  const qqqPanic = { mean: -0.30, volMultiplier: 2.0, crisisBeta: 1.2 };

  const BATCH_SIZE = 250; 
  const initialTotal = initialValuesFlat.reduce((a, b) => a + b, 0);
  
  let initialLiquidTotal = 0;
  for(let b=0; b<numBuckets; b++) {
      if(isLiquidFlat[b] === 1.0) initialLiquidTotal += initialValuesFlat[b];
  }

  // Identify Active Stress Scenario
  const activeScenario = stressTestScenarioId ? SCENARIOS_MAP[stressTestScenarioId] : null;

  // --- HOT LOOP ---
  for (let i = 0; i < simulations; i++) {
    if (i % BATCH_SIZE === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
      onProgress(i);
    }

    const path: SimulationPath = new Array(years + 1);
    const liquidPath: SimulationPath = new Array(years + 1);
    
    // Benchmark Arrays (Values only to save memory)
    const spyPathVals = new Float64Array(years + 1);
    const qqqPathVals = new Float64Array(years + 1);
    
    path[0] = { year: 0, value: initialTotal };
    liquidPath[0] = { year: 0, value: initialLiquidTotal };
    spyPathVals[0] = 10000; // Normalized start for internal calc, scaled later or just used for return calc
    qqqPathVals[0] = 10000;

    const currentValues = new Float64Array(initialValuesFlat); 
    
    // Initial Regime is usually Calm or Volatile. Let's start Calm.
    let currentRegime = Regime.Calm; 

    for (let year = 1; year <= years; year++) {
      let yearTotal = 0;
      let yearLiquidTotal = 0;
      const meanOffset = year * numBuckets;

      // 1. Check for Scripted Stress Scenario
      let isStressYear = false;
      let scenarioReturns = null;
      if (activeScenario && year <= activeScenario.steps.length) {
          isStressYear = true;
          scenarioReturns = activeScenario.steps[year - 1];
      }

      // 2. Determine Regime for this year (if not stressed, or if dynamic mode is active in later years)
      if (isDynamicMode && !isStressYear) {
          currentRegime = getNextRegime(currentRegime);
      }

      // 3. Generate Systemic Shock (if Panic and not Stress Year)
      let systemicShock = 0;
      if (isDynamicMode && currentRegime === Regime.Panic && !isStressYear) {
          systemicShock = (() => {
               let u = 0, v = 0;
               while (u === 0) u = Math.random();
               while (v === 0) v = Math.random();
               return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          })();
      }

      // --- SIMULATE USER BUCKETS ---
      for (let j = 0; j < numBuckets; j++) {
        let returnRate = 0;

        if (isStressYear && scenarioReturns) {
            const bType = bucketTypes[j];
            const baseReturn = scenarioReturns[bType];
            returnRate = baseReturn + generateScenarioJitter();
        } 
        else {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const randSelf = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

            if (!isDynamicMode) {
                // Standard GBM
                const mu = meansFlat[meanOffset + j];
                const sigma = stdDevsFlat[j];
                returnRate = mu + sigma * randSelf;
            } else {
                // Dynamic Regime Math
                const baseMu = meansFlat[meanOffset + j];
                const baseSigma = stdDevsFlat[j];

                if (currentRegime === Regime.Calm) {
                    let meanMult = 1.1;
                    if (bucketTypes[j] === 'Bitcoin') meanMult = 1.3;
                    returnRate = (baseMu * meanMult) + (baseSigma * 0.7 * randSelf);

                } else if (currentRegime === Regime.Volatile) {
                    returnRate = baseMu + baseSigma * randSelf;

                } else if (currentRegime === Regime.Panic) {
                    const panicMu = panicMeansFlat[j];
                    const panicVol = baseSigma * panicVolMultFlat[j];
                    const beta = crisisBetaFlat[j];
                    
                    const weightedRandom = calculateCorrelatedRandom(systemicShock, randSelf, beta);
                    returnRate = panicMu + (panicVol * weightedRandom);
                }
            }
        }
        
        // Update value
        const val = currentValues[j] * (1 + returnRate);
        const clampedVal = val > 0 ? val : 0;
        currentValues[j] = clampedVal;
        
        yearTotal += clampedVal;
        
        if (isLiquidFlat[j] === 1.0) {
            yearLiquidTotal += clampedVal;
        }
      }

      // --- SIMULATE BENCHMARKS (SPY / QQQ) ---
      // They follow the exact same physics/stress logic
      const simulateBenchmark = (prevVal: number, mean: number, vol: number, panicConfig: any, scenarioKey: string) => {
        let ret = 0;
        if (isStressYear && scenarioReturns) {
            // SPY uses 'Stocks', QQQ uses 'Stocks' but we add a multiplier for beta approximation if not explicitly defined
            // Ideally scenarioReturns would have 'Nasdaq', but we map to 'Stocks' for now
            const base = scenarioReturns['Stocks']; 
            // If it's QQQ (scenarioKey === 'qqq'), assume 1.1x beta on the drop/rise
            const multiplier = scenarioKey === 'qqq' ? 1.1 : 1.0; 
            ret = (base * multiplier) + generateScenarioJitter();
        } else {
             let u = 0, v = 0;
             while (u === 0) u = Math.random();
             while (v === 0) v = Math.random();
             const randSelf = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

             if (!isDynamicMode) {
                 ret = mean + vol * randSelf;
             } else {
                 if (currentRegime === Regime.Calm) {
                     ret = (mean * 1.1) + (vol * 0.7 * randSelf);
                 } else if (currentRegime === Regime.Volatile) {
                     ret = mean + vol * randSelf;
                 } else {
                     // Panic
                     const weightedRandom = calculateCorrelatedRandom(systemicShock, randSelf, panicConfig.crisisBeta);
                     ret = panicConfig.mean + ((vol * panicConfig.volMultiplier) * weightedRandom);
                 }
             }
        }
        return Math.max(0, prevVal * (1 + ret));
      };

      spyPathVals[year] = simulateBenchmark(spyPathVals[year-1], SPY_MEAN, SPY_VOL, spyPanic, 'spy');
      qqqPathVals[year] = simulateBenchmark(qqqPathVals[year-1], QQQ_MEAN, QQQ_VOL, qqqPanic, 'qqq');
      
      path[year] = { year, value: yearTotal };
      liquidPath[year] = { year, value: yearLiquidTotal };
    }
    
    results[i] = path;
    liquidResults[i] = liquidPath;
    spyResults[i] = Array.from(spyPathVals); // Convert Float64 to Array
    qqqResults[i] = Array.from(qqqPathVals);
    
    finalCompositions[i] = [...currentValues];
  }
  
  // Calculate Median Paths for Benchmarks
  const spyMedianPath = calculateMedianPath(spyResults, years);
  const qqqMedianPath = calculateMedianPath(qqqResults, years);

  onProgress(simulations);

  return {
    paths: results,
    liquidPaths: liquidResults,
    finalCompositions,
    activeBucketNames: activeBuckets.map(b => b.name),
    benchmarkPaths: {
        spy: spyMedianPath,
        qqq: qqqMedianPath
    }
  };
};
