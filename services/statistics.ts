import type { SimulationPath, SimulationStatistics } from '../types';

/**
 * Calculates detailed statistics from a set of Monte Carlo simulation paths.
 * @param {SimulationPath[]} paths - The array of simulation paths.
 * @param {number[][]} finalCompositions - The final bucket values for each path.
 * @param {string[]} activeBucketNames - The names of the active buckets.
 * @returns {SimulationStatistics} An object containing key statistics and histogram data.
 */
export const calculateStatistics = (
  paths: SimulationPath[],
  finalCompositions: number[][],
  activeBucketNames: string[],
): SimulationStatistics => {
  if (!paths || paths.length === 0) {
    // Return a default or empty state if there's no data
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p1: 0,
      p2: 0,
      p98: 0,
      p99: 0,
      histogramData: [],
      medianComposition: [],
    };
  }

  const finalValues = paths.map(path => path[path.length - 1].value);
  const sortedFinalValues = [...finalValues].sort((a, b) => a - b);

  const n = finalValues.length;

  // --- Calculate Percentiles and Extrema ---
  const p1 = sortedFinalValues[Math.floor(n * 0.01)];
  const p2 = sortedFinalValues[Math.floor(n * 0.02)];
  const p50 = sortedFinalValues[Math.floor(n * 0.50)]; // Median
  const p98 = sortedFinalValues[Math.floor(n * 0.98)];
  const p99 = sortedFinalValues[Math.floor(n * 0.99)];
  const min = sortedFinalValues[0];
  const max = sortedFinalValues[n - 1];

  // --- Calculate Mean ---
  const sum = finalValues.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // --- Calculate Standard Deviation ---
  const variance = finalValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1); // Use n-1 for sample std dev
  const stdDev = Math.sqrt(variance);
  
  // --- Calculate the average composition of paths around the median (45th-55th percentile) ---
  let medianComposition: { name: string; value: number }[] = [];
  if (activeBucketNames.length > 0 && n > 0) {
      const indexedFinalValues = finalValues.map((value, index) => ({ value, originalIndex: index }));
      indexedFinalValues.sort((a, b) => a.value - b.value);
  
      const startIndex = Math.floor(n * 0.45);
      const endIndex = Math.floor(n * 0.55);
  
      // Ensure there's a meaningful range to average over, otherwise just use the single median path.
      if (startIndex < endIndex) {
          const subsetIndices = indexedFinalValues.slice(startIndex, endIndex + 1).map(item => item.originalIndex);
          const numBuckets = activeBucketNames.length;
          const totalCompositionValues = Array(numBuckets).fill(0);
  
          for (const originalIndex of subsetIndices) {
              const composition = finalCompositions[originalIndex];
              if (composition) {
                  for (let i = 0; i < numBuckets; i++) {
                      totalCompositionValues[i] += composition[i] || 0;
                  }
              }
          }
  
          const averageCompositionValues = totalCompositionValues.map(sum => sum / subsetIndices.length);
  
          medianComposition = activeBucketNames.map((name, index) => ({
              name,
              value: averageCompositionValues[index] || 0,
          }));
  
      } else {
          // Fallback to the single median path if the percentile range is too small (e.g., low simulation count)
          const medianOriginalIndex = indexedFinalValues[Math.floor(n * 0.50)].originalIndex;
          const composition = finalCompositions[medianOriginalIndex];
          if (composition) {
              medianComposition = activeBucketNames.map((name, index) => ({
                  name,
                  value: composition[index] || 0,
              }));
          }
      }
  }

  // --- Generate Histogram Data (scoped to 2nd-98th percentile) ---
  const numBins = 25;
  const rangeMin = p2;
  const rangeMax = p98;
  
  const valuesForHistogram = finalValues.filter(v => v >= rangeMin && v <= rangeMax);
  
  const binWidth = (rangeMax - rangeMin) / numBins;
  const bins = Array(numBins).fill(0);
  const binRanges = Array.from({ length: numBins }, (_, i) => rangeMin + i * binWidth);

  for (const value of valuesForHistogram) {
    if (binWidth === 0) {
      bins[0]++;
      continue;
    }
    let binIndex = Math.floor((value - rangeMin) / binWidth);
    if (binIndex === numBins) {
      binIndex = numBins - 1;
    }
    if (binIndex >= 0 && binIndex < numBins) {
      bins[binIndex]++;
    }
  }

  const histogramData = binRanges.map((rangeStart, i) => ({
    value: rangeStart,
    count: bins[i],
  }));


  return {
    mean,
    median: p50,
    stdDev,
    min,
    max,
    p1,
    p2,
    p98,
    p99,
    histogramData,
    medianComposition,
  };
};