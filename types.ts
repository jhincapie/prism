
import { Bucket } from './models/Bucket';

export type { BucketType, BucketData } from './models/Bucket';
export { Bucket, InvestmentBucket, CashBucket, StockBucket, RealEstateBucket, BitcoinBucket, OtherBucket, BucketFactory } from './models/Bucket';

export interface SimulationParams {
  years: number;
  simulations: number;
  inflationRate: number;
  withdrawalReturn: number;
  buckets: Bucket[];
  isDynamicMode?: boolean; // Flag for Regime Switching
  stressTestScenarioId?: string | null; // ID for specific historical/hypothetical stress tests
}

export interface DataPoint {
  year: number;
  value: number;
}

export type SimulationPath = DataPoint[];

export interface SimulationStatistics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p1: number;
  p2: number;
  p98: number;
  p99: number;
  histogramData: { value: number; count: number }[];
  medianComposition: { name: string; value: number }[];
}

export interface SimulationResult {
  paths: SimulationPath[];
  liquidPaths: SimulationPath[]; 
  statistics: SimulationStatistics;
  paramsUsed: SimulationParams;
  finalCompositions: number[][];
  activeBucketNames: string[];
  benchmarkPaths?: {
      spy: SimulationPath;
      qqq: SimulationPath;
  };
}

export interface EconomicAnalysis {
  inflationAdjustedValue: number;
  netWorthPercentile: {
    percentile: number;
    explanation: string;
  };
  summary: string;
  currencyInfo?: {
    code: string; // e.g., 'COP', 'EUR', 'SEK'
    rate: number; // e.g., 4800 (1 USD = 4800 COP)
  };
  retirementIncome?: {
    perpetualAnnuity: number;
    fourPercentRule: number;
  };
}

export interface FISettings {
    targetMonthlyIncome: number;
    safeWithdrawalRate: number;
    isEnabled?: boolean;
}
