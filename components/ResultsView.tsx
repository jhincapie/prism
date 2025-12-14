import React, { useRef, useState, useEffect } from 'react';
import SimulationChart from './SimulationChart';
import StatisticsDisplay from './StatisticsDisplay';
import EconomicContext from './EconomicContext';
import MilestoneAnalysis from './MilestoneAnalysis';
import FireAnalysis from './FireAnalysis';
import GeminiIcon from './icons/GeminiIcon';
import DownloadIcon from './icons/DownloadIcon';
import TargetIcon from './icons/TargetIcon';
import FireIcon from './icons/FireIcon';
import { SimulationResult, SimulationParams, EconomicAnalysis, FISettings } from '../types';
import { LoadingSkeleton } from './Skeletons';
import { formatCurrency } from '../services/formatters';

interface ResultsViewProps {
    simulationResult: SimulationResult | null;
    isLoading: boolean;
    error: string | null;
    params: SimulationParams | null;
    totalInitialValue: number;
    benchmarkInitialValue: number;
    benchmarkExcludedValue: number;
    comparisonResult: SimulationResult | null;
    toggleComparison: (isActive: boolean) => void;
    onExport: () => void;
    resultsRef: React.RefObject<HTMLDivElement | null>;
}

const ResultsView: React.FC<ResultsViewProps> = ({
    simulationResult,
    isLoading,
    error,
    params,
    totalInitialValue,
    benchmarkInitialValue,
    benchmarkExcludedValue,
    comparisonResult,
    toggleComparison,
    onExport,
    resultsRef
}) => {
    // Local State
    const [activeResultsTab, setActiveResultsTab] = useState<'simulation' | 'milestone' | 'fire' | 'context'>('simulation');
    const [isInflationAdjusted, setIsInflationAdjusted] = useState<boolean>(false);

    // Chart Persistent State
    const [showSPY, setShowSPY] = useState<boolean>(false);
    const [showQQQ, setShowQQQ] = useState<boolean>(false);
    const [showRandomPaths, setShowRandomPaths] = useState<boolean>(false);

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState<Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'> | null>(null);
    const [analysisIsLoading, setAnalysisIsLoading] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [country, setCountry] = useState<string>('United States');
    const analysisCache = useRef<Map<string, Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'>>>(new Map());

    // Milestone & FI State
    const [milestoneTarget, setMilestoneTarget] = useState<number | null>(null);
    const [fiSettings, setFiSettings] = useState<FISettings>({
        targetMonthlyIncome: 15000,
        safeWithdrawalRate: 0.04,
        isEnabled: true
    });

    // Reset AI analysis when params change significantly or manually cleared
    // Note: In the original App.tsx, this was cleared on runSimulation.
    // We can assume if simulationResult changes completely, we might want to refresh,
    // but the original logic had it bound to the run button.
    // For now, we will rely on the effect below to fetch if missing.
    // If specific clear-on-run logic is needed, it can be passed as a prop trigger,
    // but React's keying or just dependency checking is usually enough.

    // --- AI Analysis Effect ---
    useEffect(() => {
        if (!simulationResult || activeResultsTab !== 'context') return;

        // Construct a unique key for the cache based on country and the result's median (to detect data changes)
        const median = simulationResult.statistics.median;
        const cacheKey = `${country}-${median.toFixed(2)}`;

        if (analysisCache.current.has(cacheKey)) {
            setAiAnalysis(analysisCache.current.get(cacheKey)!);
            setAnalysisIsLoading(false);
            setAnalysisError(null);
            return;
        }

        const fetchAnalysis = async () => {
            const median = simulationResult.statistics.median;
            if (median === 0) {
                setAiAnalysis(null);
                setAnalysisError("Cannot generate analysis for a portfolio with zero median value.");
                return;
            }

            setAnalysisIsLoading(true);
            setAnalysisError(null);

            try {
                // Dynamic import to keep bundle small if not used
                const { getEconomicAnalysis } = await import('../services/economicAnalysis');
                const result = await getEconomicAnalysis(median, simulationResult.paramsUsed.years, country);
                analysisCache.current.set(cacheKey, result);
                setAiAnalysis(result);
            } catch (e) {
                setAnalysisError(e instanceof Error ? e.message : 'An unexpected error occurred.');
                setAiAnalysis(null);
            } finally {
                setAnalysisIsLoading(false);
            }
        };
        fetchAnalysis();
    }, [simulationResult, country, activeResultsTab]);

    const bucketColors = params?.buckets.reduce((acc, bucket) => {
        acc[bucket.name] = bucket.color;
        return acc;
    }, {} as Record<string, string>) || {};

    return (
        <div ref={resultsRef} className="p-4 md:p-6 bg-slate-800/50 rounded-xl border border-slate-700 h-full relative">
            {/* PDF Summary (Hidden) */}
            <div id="pdf-summary" className="hidden mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-cyan-400">PRISM Configuration</h2>
                        <p className="text-slate-400 text-sm mt-1">Initial parameters used for this projection.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs">Total Initial Value</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(totalInitialValue)}</p>
                    </div>
                </div>
                {params && (
                <>
                    <div className="grid grid-cols-4 gap-4 mb-6 text-sm border-b border-slate-700 pb-6">
                        <div>
                            <span className="block text-slate-500 text-xs uppercase tracking-wider">Time Horizon</span>
                            <span className="text-slate-200 font-semibold">{params.years} Years</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase tracking-wider">Simulations</span>
                            <span className="text-slate-200 font-semibold">{params.simulations.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase tracking-wider">Inflation</span>
                            <span className="text-slate-200 font-semibold">{(params.inflationRate * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase tracking-wider">Mode</span>
                            <span className="text-slate-200 font-semibold">
                                {params.stressTestScenarioId
                                    ? `Stress: ${params.stressTestScenarioId}`
                                    : params.isDynamicMode ? 'Dynamic (Crisis)' : 'Standard'}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {params.buckets.map((b, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-700/50">
                                <div className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: b.color }}></span>
                                    <span className="text-slate-200 font-medium">{b.name}</span>
                                </div>
                                <span className="text-slate-200 font-mono">{formatCurrency(b.initialValue)}</span>
                            </div>
                        ))}
                    </div>
                </>
                )}
            </div>

            {isLoading && <LoadingSkeleton />}
            {error && (
                <div className="text-center text-red-400 mt-8 w-full">
                <p><strong>Error:</strong> {error}</p>
                </div>
            )}

            {!isLoading && !error && simulationResult && params && (
                <div className="w-full flex flex-col gap-8">
                    <div className="export-hide border-b border-slate-700 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 pb-0">
                        <nav className="flex -mb-px space-x-6 overflow-x-auto max-w-full" aria-label="Tabs">
                            <button
                                onClick={() => setActiveResultsTab('simulation')}
                                className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                                activeResultsTab === 'simulation' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                Simulation Results
                            </button>
                            <button
                                onClick={() => setActiveResultsTab('milestone')}
                                className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                                activeResultsTab === 'milestone' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                <TargetIcon className="h-4 w-4" />
                                <span>Milestones</span>
                            </button>
                            <button
                                onClick={() => setActiveResultsTab('fire')}
                                className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                                activeResultsTab === 'fire' ? 'border-orange-400 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                <FireIcon className="h-4 w-4" />
                                <span>FIRE</span>
                            </button>
                            <button
                                onClick={() => setActiveResultsTab('context')}
                                className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                                activeResultsTab === 'context' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                <GeminiIcon className={`h-4 w-4 transition-all duration-300 ${analysisIsLoading ? 'animate-spin' : ''} ${analysisCache.current.size === 0 ? 'grayscale opacity-60' : ''}`} />
                                <span>AI Analysis</span>
                            </button>
                        </nav>
                        <div className="flex items-center space-x-4 mb-2 sm:mb-1">
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs font-medium ${!isInflationAdjusted ? 'text-cyan-400' : 'text-slate-500'}`}>Nominal</span>
                            <button
                                    onClick={() => setIsInflationAdjusted(!isInflationAdjusted)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${isInflationAdjusted ? 'bg-cyan-600' : 'bg-slate-700'}`}
                            >
                                    <span className={`${isInflationAdjusted ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`} />
                            </button>
                            <span className={`text-xs font-medium ${isInflationAdjusted ? 'text-cyan-400' : 'text-slate-500'}`}>Real (Adjusted)</span>
                        </div>
                        </div>
                    </div>

                    {activeResultsTab === 'simulation' && (
                    <>
                        <SimulationChart
                            data={simulationResult.paths}
                            isInflationAdjusted={isInflationAdjusted}
                            inflationRate={params.inflationRate}
                            comparisonResult={comparisonResult}
                            onToggleComparison={toggleComparison}
                            initialBenchmarkValue={benchmarkInitialValue}
                            initialBenchmarkExcludedValue={benchmarkExcludedValue}
                            stressTestScenarioId={params.stressTestScenarioId}
                            isDynamicMode={params.isDynamicMode}
                            showSPY={showSPY}
                            setShowSPY={setShowSPY}
                            showQQQ={showQQQ}
                            setShowQQQ={setShowQQQ}
                            showRandomPaths={showRandomPaths}
                            setShowRandomPaths={setShowRandomPaths}
                            benchmarkPaths={simulationResult.benchmarkPaths}
                        />
                        <StatisticsDisplay
                        statistics={simulationResult.statistics}
                        totalSimulations={params.simulations}
                        paths={simulationResult.paths}
                        finalCompositions={simulationResult.finalCompositions}
                        activeBucketNames={simulationResult.activeBucketNames}
                        isInflationAdjusted={isInflationAdjusted}
                        inflationRate={params.inflationRate}
                        years={params.years}
                        bucketColors={bucketColors}
                        />
                        <div className="flex justify-center pt-8 pb-4 export-hide">
                            <button
                                onClick={onExport}
                                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 font-medium py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-lg"
                            >
                                <DownloadIcon className="h-5 w-5" />
                                <span>Download PDF Report</span>
                            </button>
                        </div>
                    </>
                )}

                {activeResultsTab === 'milestone' && (
                    <MilestoneAnalysis
                        paths={simulationResult.paths}
                        years={simulationResult.paramsUsed.years}
                        isInflationAdjusted={isInflationAdjusted}
                        inflationRate={params.inflationRate}
                        totalSimulations={params.simulations}
                        initialTotalValue={totalInitialValue}
                        savedTargetAmount={milestoneTarget}
                        onTargetAmountChange={setMilestoneTarget}
                    />
                )}

                {activeResultsTab === 'fire' && (
                    <FireAnalysis
                        liquidPaths={simulationResult.liquidPaths}
                        fiSettings={fiSettings}
                        setFiSettings={setFiSettings}
                        isInflationAdjusted={isInflationAdjusted}
                        inflationRate={params.inflationRate}
                        withdrawalReturn={params.withdrawalReturn}
                        years={params.years}
                    />
                )}

                {activeResultsTab === 'context' && (
                    <EconomicContext
                    statistics={simulationResult.statistics}
                    years={simulationResult.paramsUsed.years}
                    aiAnalysis={aiAnalysis}
                    isLoading={analysisIsLoading}
                    error={analysisError}
                    country={country}
                    setCountry={setCountry}
                    cachedCountries={Array.from(analysisCache.current.keys())}
                    isInflationAdjusted={isInflationAdjusted}
                    inflationRate={params.inflationRate}
                    withdrawalReturn={params.withdrawalReturn}
                    />
                )}

                <div className="export-hide mt-8 pt-4 border-t border-slate-700/50 text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Generated by PRISM</p>
                </div>
                </div>
            )}

            {!isLoading && !error && !simulationResult && (
                <div className="text-center text-slate-500 mt-8 w-full">
                <p className="text-lg">Your portfolio projection will appear here.</p>
                <p>Adjust the settings and run the simulation to begin.</p>
                </div>
            )}
        </div>
    );
};

export default ResultsView;
