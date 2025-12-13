
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SimulationPath } from '../types';
import InfoIcon from './icons/InfoIcon';
import { formatCurrency } from '../services/formatters';

interface MilestoneAnalysisProps {
    paths: SimulationPath[];
    years: number;
    isInflationAdjusted: boolean;
    inflationRate: number;
    totalSimulations: number;
    initialTotalValue: number;
    savedTargetAmount: number | null;
    onTargetAmountChange: (value: number) => void;
}

const MilestoneAnalysis: React.FC<MilestoneAnalysisProps> = ({ 
    paths, 
    years, 
    isInflationAdjusted, 
    inflationRate,
    initialTotalValue,
    savedTargetAmount,
    onTargetAmountChange
}) => {
    // Determine a default target based on the next order of magnitude
    const defaultCalculatedTarget = useMemo(() => {
        if (initialTotalValue <= 0) return 1000000;
        const orderOfMagnitude = Math.floor(Math.log10(initialTotalValue));
        return Math.pow(10, orderOfMagnitude + 1);
    }, [initialTotalValue]);

    // The effective target is what the user has saved, or the default if nothing saved
    const effectiveTarget = useMemo(() => {
        return savedTargetAmount !== null ? savedTargetAmount : defaultCalculatedTarget;
    }, [savedTargetAmount, defaultCalculatedTarget]);

    // Calculate intermediate steps based on the DEFAULT target to ensure buttons don't jump around
    // when the user clicks them (which updates effectiveTarget).
    const intermediateTargets = useMemo(() => {
        const targetBasis = defaultCalculatedTarget;
        
        if (targetBasis <= initialTotalValue) return [];

        const diff = targetBasis - initialTotalValue;
        
        // Calculate roughly 1/3 and 2/3 points
        const raw1 = initialTotalValue + (diff * 0.333);
        const raw2 = initialTotalValue + (diff * 0.666);

        // Rounding function for clean numbers
        const roundToNice = (val: number) => {
            if (val < 1000) return Math.round(val / 10) * 10;
            if (val < 10000) return Math.round(val / 100) * 100;
            if (val < 100000) return Math.round(val / 1000) * 1000;
            if (val < 1000000) return Math.round(val / 10000) * 10000;
            return Math.round(val / 50000) * 50000;
        };

        const t1 = roundToNice(raw1);
        const t2 = roundToNice(raw2);

        // Ensure strictly increasing, unique, and within bounds
        // Include targetBasis as requested
        const targets = [t1, t2, targetBasis]
            .filter(t => t > initialTotalValue && t <= targetBasis)
            .filter((val, index, self) => self.indexOf(val) === index)
            .sort((a, b) => a - b);

        return targets;
    }, [defaultCalculatedTarget, initialTotalValue]);

    const currentYear = new Date().getFullYear();

    const analysisData = useMemo(() => {
        if (!paths || paths.length === 0) {
            return { chartData: [], medianAchievedYear: null };
        }

        const dataPoints = [];
        const numPaths = paths.length;
        let medianAchievedYear: number | null = null;

        // Iterate through each year (column)
        for (let y = 0; y <= years; y++) {
            let successCount = 0;
            const discountFactor = isInflationAdjusted ? Math.pow(1 + inflationRate, y) : 1;

            // Check every path at this year
            for (let i = 0; i < numPaths; i++) {
                const pathValue = paths[i][y].value;
                const adjustedValue = pathValue / discountFactor;
                
                if (adjustedValue >= effectiveTarget) {
                    successCount++;
                }
            }

            const probability = (successCount / numPaths) * 100;
            
            // Determine median achievement year (first year crossing 50%)
            if (medianAchievedYear === null && probability >= 50) {
                medianAchievedYear = currentYear + y;
            }

            dataPoints.push({
                year: currentYear + y,
                probability: probability,
                isProjected: y > 0
            });
        }

        return { chartData: dataPoints, medianAchievedYear };
    }, [paths, years, effectiveTarget, isInflationAdjusted, inflationRate, currentYear]);

    const { chartData, medianAchievedYear } = analysisData;
    const finalProbability = chartData.length > 0 ? chartData[chartData.length - 1].probability : 0;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            onTargetAmountChange(val);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 md:col-span-1">
                    <h3 className="text-lg font-bold text-cyan-400 mb-4">Milestone Goal</h3>
                    <div className="mb-6">
                        <label htmlFor="targetAmount" className="block text-sm font-medium text-slate-300 mb-2">
                            Target Amount {isInflationAdjusted ? '(Real)' : '(Nominal)'}
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-slate-400 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                name="targetAmount"
                                id="targetAmount"
                                className="block w-full rounded-md border-0 bg-slate-700 py-3 pl-7 pr-4 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 sm:text-lg sm:leading-6 font-mono"
                                placeholder="1000000"
                                value={effectiveTarget}
                                onChange={handleAmountChange}
                                step={10000}
                            />
                        </div>

                        {/* Intermediate Target Buttons */}
                        {intermediateTargets.length > 0 && (
                             <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="text-xs text-slate-500 mr-1">Suggestions:</span>
                                {intermediateTargets.map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => onTargetAmountChange(val)}
                                        className="px-2 py-1 text-xs font-medium text-cyan-500 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                                    >
                                        {formatCurrency(val)}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-slate-500 mt-3">
                            Enter your financial goal to see the odds of reaching it.
                        </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-700">
                        <div>
                             <p className="text-sm text-slate-400">Likelihood by {currentYear + years}</p>
                             <p className={`text-3xl font-bold ${finalProbability >= 75 ? 'text-emerald-400' : finalProbability >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {finalProbability.toFixed(1)}%
                             </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 flex items-center">
                                Median Time to Goal
                                <span className="ml-1.5 group relative">
                                    <InfoIcon />
                                    <span className="absolute bottom-full mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                        The first year where more than 50% of simulations reached the target.
                                    </span>
                                </span>
                            </p>
                            <p className="text-xl font-semibold text-slate-200">
                                {medianAchievedYear ? `Year ${medianAchievedYear}` : 'Not likely in timeframe'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 md:col-span-2 flex flex-col">
                    <h3 className="text-lg font-bold text-cyan-400 mb-1">Probability of Success Over Time</h3>
                    <p className="text-sm text-slate-400 mb-6">Percentage of simulations reaching {formatCurrency(effectiveTarget)} by each year.</p>
                    
                    <div className="flex-grow h-[400px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                                <XAxis 
                                    dataKey="year" 
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis 
                                    domain={[0, 100]} 
                                    tickFormatter={(val) => `${val}%`}
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                                    labelFormatter={(label) => `Year: ${label}`}
                                />
                                <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                                <Area 
                                    type="monotone" 
                                    dataKey="probability" 
                                    stroke="#22d3ee" 
                                    fillOpacity={1} 
                                    fill="url(#colorProb)" 
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Context Message */}
            <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="text-slate-400 text-sm">
                    {finalProbability > 80 
                        ? "You have a very high likelihood of achieving this goal with your current strategy."
                        : finalProbability > 50
                        ? "You are on track to likely achieve this goal, though market volatility plays a role."
                        : "This goal is aggressive for your current allocation and timeframe. Consider increasing savings or adjusting risk."
                    }
                </p>
            </div>
        </div>
    );
};

export default MilestoneAnalysis;
