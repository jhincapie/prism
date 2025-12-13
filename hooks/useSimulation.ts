
import { useState, useCallback, useRef } from 'react';
import { runMonteCarloSimulation } from '../services/monteCarlo';
import { calculateStatistics } from '../services/statistics';
import { SimulationParams, SimulationResult } from '../types';

interface UseSimulationReturn {
  simulationResult: SimulationResult | null;
  comparisonResult: SimulationResult | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  runSimulation: (params: SimulationParams) => Promise<void>;
  toggleComparison: () => void;
  resetSimulation: () => void;
}

export const useSimulation = (): UseSimulationReturn => {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const runSimulation = useCallback(async (params: SimulationParams) => {
    if (!params) return;

    setIsLoading(true);
    setError(null);
    setSimulationResult(null);
    setProgress(0);
    
    // Yield immediately to ensure UI updates before heavy lifting begins
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
      const { paths, liquidPaths, finalCompositions, activeBucketNames, benchmarkPaths } = await runMonteCarloSimulation(params, setProgress);
      const statistics = calculateStatistics(paths, finalCompositions, activeBucketNames);
      
      setSimulationResult({ 
        paths,
        liquidPaths,
        statistics, 
        paramsUsed: params, 
        finalCompositions, 
        activeBucketNames,
        benchmarkPaths
      });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message || 'An unknown error occurred during simulation.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleComparison = useCallback(() => {
      if (comparisonResult) {
          setComparisonResult(null);
      } else if (simulationResult) {
          setComparisonResult(simulationResult);
      }
  }, [comparisonResult, simulationResult]);

  const resetSimulation = useCallback(() => {
    setSimulationResult(null);
    setComparisonResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    simulationResult,
    comparisonResult,
    isLoading,
    error,
    progress,
    runSimulation,
    toggleComparison,
    resetSimulation
  };
};
