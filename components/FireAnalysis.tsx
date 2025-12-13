
import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import type { SimulationPath, FISettings } from '../types';
import FireIcon from './icons/FireIcon';
import InfoIcon from './icons/InfoIcon';
import { formatCurrency } from '../services/formatters';

interface FireAnalysisProps {
    liquidPaths: SimulationPath[];
    fiSettings: FISettings;
    setFiSettings: React.Dispatch<React.SetStateAction<FISettings>>;
    isInflationAdjusted: boolean;
    inflationRate: number;
    withdrawalReturn: number;
    years: number;
}

const INCOME_BENCHMARKS = [
    { label: 'US Median', value: 6250, desc: '~$75k/yr' },
    { label: 'Top 10%', value: 16700, desc: '~$200k/yr' },
    { label: 'Top 1%', value: 54000, desc: '~$650k/yr' }
];

const CustomFireTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-800/95 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-xl text-sm z-50 min-w-[200px]">
                <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">Year: {data.year}</p>
                <div className="space-y-3">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-0.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-300 font-medium">{entry.name}</span>
                            </div>
                            <div className="pl-5">
                                <span className="text-lg font-bold text-slate-100 block leading-tight">
                                    {formatCurrency(entry.value)}
                                </span>
                                {entry.dataKey === 'fiTarget' && (
                                    <span className="text-xs text-orange-400/80 font-mono mt-0.5 block">
                                        Income: ${Math.round(data.targetMonthlyIncome).toLocaleString()}/mo
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const FireAnalysis: React.FC<FireAnalysisProps> = ({ 
    liquidPaths, 
    fiSettings, 
    setFiSettings, 
    isInflationAdjusted,
    inflationRate,
    withdrawalReturn,
    years
}) => {
    const currentYear = new Date().getFullYear();
    const lastSimulatedMedianRef = useRef<number>(0);

    // 1. Calculate the Raw (Nominal) Final Median Liquid Value independent of display settings
    //    We need this to calculate the "Present Value" for the default setting logic.
    const rawFinalMedianLiquid = useMemo(() => {
        if (!liquidPaths || liquidPaths.length === 0) return 0;
        const lastIndex = liquidPaths[0].length - 1;
        const finalValues = liquidPaths.map(p => p[lastIndex].value);
        finalValues.sort((a, b) => a - b);
        return finalValues[Math.floor(finalValues.length * 0.5)];
    }, [liquidPaths]);

    // 2. Default Value Logic: Set target income to what is achievable at the end
    useEffect(() => {
        if (rawFinalMedianLiquid > 0) {
            // Check if the simulation result has changed significantly (new run)
            if (rawFinalMedianLiquid !== lastSimulatedMedianRef.current) {
                lastSimulatedMedianRef.current = rawFinalMedianLiquid;
                
                // Calculate Real (Present Value) achievable monthly income
                // PV = FV / (1+r)^n
                const discountFactor = Math.pow(1 + inflationRate, years);
                const realFinalValue = rawFinalMedianLiquid / discountFactor;
                
                // Monthly Income = (Principal * SWR) / 12
                const achievableMonthly = (realFinalValue * fiSettings.safeWithdrawalRate) / 12;
                
                // Floor to nearest integer (conservative estimate)
                const roundedAchievable = Math.floor(achievableMonthly);

                setFiSettings(prev => ({
                    ...prev,
                    targetMonthlyIncome: roundedAchievable
                }));
            }
        }
    }, [rawFinalMedianLiquid, inflationRate, years, fiSettings.safeWithdrawalRate, setFiSettings]); 

    // 3. Process Chart Data
    const { chartData, freedomYear, medianLiquidValueForDisplay } = useMemo(() => {
        if (!liquidPaths || liquidPaths.length === 0) return { chartData: [], freedomYear: null, medianLiquidValueForDisplay: 0 };
        
        const dataLength = liquidPaths[0].length;
        const processedData = [];
        
        // Target Monthly Income is treated as "Present Value" (Real Dollars)
        // If chart is Inflation Adjusted (Real): Target Line is constant.
        // If chart is Nominal: Target Line must inflate.
        const requiredCapitalReal = (fiSettings.targetMonthlyIncome * 12) / fiSettings.safeWithdrawalRate;
        
        let freedomYearFound: number | null = null;
        let finalMedianDisplay = 0;

        for (let i = 0; i < dataLength; i++) {
             const valuesAtYear = liquidPaths.map(p => p[i].value);
             valuesAtYear.sort((a, b) => a - b);
             
             let median = valuesAtYear[Math.floor(valuesAtYear.length * 0.5)];
             const currentYearNum = liquidPaths[0][i].year;

             // Determine Target Line Value for this year
             let fiTargetVal = requiredCapitalReal; // Base is Real
             let monthlyIncomeVal = fiSettings.targetMonthlyIncome; // Base is Real

             if (!isInflationAdjusted) {
                 // If displaying nominal, inflate the target
                 const inflationFactor = Math.pow(1 + inflationRate, currentYearNum);
                 fiTargetVal = requiredCapitalReal * inflationFactor;
                 monthlyIncomeVal = fiSettings.targetMonthlyIncome * inflationFactor;
             } else {
                 // If displaying real, deflate the median asset value
                 const discountFactor = Math.pow(1 + inflationRate, currentYearNum);
                 median = median / discountFactor;
             }

             if (freedomYearFound === null && median >= fiTargetVal && i > 0) {
                 freedomYearFound = currentYear + currentYearNum;
             }
             
             if (i === dataLength - 1) {
                 finalMedianDisplay = median;
             }

             processedData.push({
                 year: currentYear + currentYearNum,
                 liquidMedian: median,
                 fiTarget: fiTargetVal,
                 targetMonthlyIncome: monthlyIncomeVal
             });
        }

        return { chartData: processedData, freedomYear: freedomYearFound, medianLiquidValueForDisplay: finalMedianDisplay };

    }, [liquidPaths, fiSettings.targetMonthlyIncome, fiSettings.safeWithdrawalRate, isInflationAdjusted, inflationRate, currentYear]);

    // 4. Handle Chart Clicks
    const handleChartClick = useCallback((data: any) => {
        if (!data) return;

        let payload = null;

        // Priority 1: activePayload (Standard Recharts click on active area)
        if (data.activePayload && data.activePayload.length > 0) {
            payload = data.activePayload[0].payload;
        } 
        // Priority 2: activeLabel lookup (Fallback when activePayload is missing but we have a label/year)
        // This often happens when clicking on the grid lines or background
        else if (data.activeLabel !== undefined) {
             // Look up the data point from chartData using the year (activeLabel)
             payload = chartData.find(d => d.year === data.activeLabel);
        }
        // Priority 3: Direct payload (e.g. direct dot click props)
        else if (data.payload) {
             payload = data.payload;
        }

        if (payload) {
            const clickedYear = payload.year;
            // The chart plots 'liquidMedian'. 
            // If isInflationAdjusted is TRUE, this value is Real.
            // If isInflationAdjusted is FALSE, this value is Nominal.
            const chartValue = payload.liquidMedian;
            
            let realAssetValue = chartValue;
            
            // Convert to Real (Present Value) Assets if currently nominal
            if (!isInflationAdjusted) {
                 const yearsElapsed = clickedYear - new Date().getFullYear();
                 const discountFactor = Math.pow(1 + inflationRate, yearsElapsed);
                 realAssetValue = chartValue / discountFactor;
            }
            
            // Calculate Sustainable Monthly Income based on SWR
            // Monthly Income = (RealAssets * SWR) / 12
            // We use the current safeWithdrawalRate from dependencies
            const newMonthlyIncome = (realAssetValue * fiSettings.safeWithdrawalRate) / 12;
            
            // Update settings (allow 0, floor to integer)
            const safeIncome = Math.max(0, Math.floor(newMonthlyIncome));

            setFiSettings(prev => {
                if (Math.abs(prev.targetMonthlyIncome - safeIncome) < 1) {
                    return prev;
                }
                return {
                    ...prev,
                    targetMonthlyIncome: safeIncome
                };
            });
        }
   }, [chartData, isInflationAdjusted, inflationRate, fiSettings.safeWithdrawalRate, setFiSettings]);

    // 5. Derived Annual Income Calculations based on Final Display Value
    const incomeCalculations = useMemo(() => {
        // Recalculate Real Final Median purely for the bottom cards
        const discountFactor = Math.pow(1 + inflationRate, years);
        const realFinalMedian = rawFinalMedianLiquid / discountFactor;

        // Safe Spend (4% rule)
        const fourPercentRule = realFinalMedian * fiSettings.safeWithdrawalRate;
        
        // Perpetual Annuity
        const realReturn = Math.max(0, withdrawalReturn - inflationRate);
        const perpetualAnnuity = realFinalMedian * realReturn;
        
        return { fourPercentRule, perpetualAnnuity };
    }, [rawFinalMedianLiquid, fiSettings.safeWithdrawalRate, withdrawalReturn, inflationRate, years]);
    
    // Y-Axis scaling
    const yAxisMax = useMemo(() => {
        if (!chartData.length) return 'auto';
        const maxVal = Math.max(
            ...chartData.map(d => Math.max(d.liquidMedian, d.fiTarget))
        );
        return Math.ceil(maxVal * 1.1);
    }, [chartData]);
    
    // Intersection for Dot
    const intersectionPoint = useMemo(() => {
        if (!freedomYear) return null;
        const pt = chartData.find(d => d.year === freedomYear);
        return pt ? { x: pt.year, y: pt.liquidMedian } : null;
    }, [freedomYear, chartData]);

    const handleIncomeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            setFiSettings(prev => ({...prev, targetMonthlyIncome: val}));
        } else if (e.target.value === '') {
             setFiSettings(prev => ({...prev, targetMonthlyIncome: 0}));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            
            {/* Top Section: Settings Panel */}
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-2 text-orange-400 mb-6 border-b border-slate-700 pb-4">
                    <FireIcon className="h-6 w-6" />
                    <h3 className="text-lg font-bold">FIRE Strategy Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Target Income Slider */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Monthly Income (Present Value)</label>
                        <div className="flex items-center space-x-4 mb-3">
                            <div className="flex-grow">
                                <input
                                    type="range"
                                    min="0"
                                    max="50000"
                                    step="10"
                                    value={fiSettings.targetMonthlyIncome}
                                    onChange={(e) => setFiSettings(prev => ({...prev, targetMonthlyIncome: parseFloat(e.target.value)}))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                            <div className="relative min-w-[100px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 font-mono text-sm">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={fiSettings.targetMonthlyIncome}
                                    onChange={handleIncomeInputChange}
                                    className="w-full text-base font-mono text-orange-400 bg-slate-800 py-1.5 pl-6 pr-2 rounded-md border border-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none text-center appearance-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {INCOME_BENCHMARKS.map((benchmark) => {
                                // Use tolerance for floating point comparisons
                                const isSelected = Math.abs(fiSettings.targetMonthlyIncome - benchmark.value) < 1;
                                return (
                                    <button
                                        key={benchmark.label}
                                        onClick={() => setFiSettings(prev => ({...prev, targetMonthlyIncome: benchmark.value}))}
                                        className={`flex-1 py-1.5 px-2 border rounded text-xs transition-colors flex flex-col items-center justify-center gap-0.5 ${
                                            isSelected 
                                            ? 'bg-orange-600 border-orange-500 text-white shadow-md' 
                                            : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-400 hover:text-orange-300'
                                        }`}
                                        title={`Set target to ${benchmark.label} household income`}
                                    >
                                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{benchmark.label}</span>
                                        <span className={`text-[10px] ${isSelected ? 'text-orange-100 opacity-90' : 'opacity-75'}`}>{benchmark.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Withdrawal Rate Slider */}
                    <div>
                        <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                            Safe Withdrawal Rate
                            <span className="ml-2 group relative">
                                <InfoIcon />
                                <span className="absolute bottom-full mb-2 w-56 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-10 pointer-events-none border border-slate-600 shadow-xl">
                                    The percentage of your portfolio you withdraw annually. 4% is standard.
                                </span>
                            </span>
                        </label>
                        <div className="flex items-center space-x-4 mb-3">
                            <div className="flex-grow">
                                <input
                                    type="range"
                                    min="0.02"
                                    max="0.06"
                                    step="0.001"
                                    value={fiSettings.safeWithdrawalRate}
                                    onChange={(e) => setFiSettings(prev => ({...prev, safeWithdrawalRate: parseFloat(e.target.value)}))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                            <span className="text-base font-mono text-orange-400 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
                                {(fiSettings.safeWithdrawalRate * 100).toFixed(1)}%
                            </span>
                        </div>
                         <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Required Portfolio</span>
                            <span className="text-sm font-bold text-slate-200">
                                {formatCurrency((fiSettings.targetMonthlyIncome * 12) / fiSettings.safeWithdrawalRate)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Chart */}
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 flex flex-col">
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Investable Assets vs FI Target</h3>
                        <p className="text-sm text-slate-400">Comparing your projected investable assets against the capital required for Financial Independence. Click on the chart to adjust the target income.</p>
                    </div>
                    <div className="text-right bg-slate-800/80 p-3 rounded-lg border border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Projected Freedom Date</p>
                        <p className={`text-2xl font-bold ${freedomYear ? 'text-orange-400' : 'text-slate-600'}`}>
                            {freedomYear ? freedomYear : 'Not Reached'}
                        </p>
                    </div>
                    </div>

                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} onClick={handleChartClick}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                                dataKey="year" 
                                stroke="#94a3b8" 
                                tick={{fill: '#94a3b8'}}
                            />
                            <YAxis 
                                tickFormatter={formatCurrency} 
                                stroke="#94a3b8"
                                tick={{fill: '#94a3b8'}}
                                domain={[0, yAxisMax]}
                            />
                            <Tooltip content={<CustomFireTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }} />
                            <ReferenceLine y={0} stroke="#475569" />
                            
                            {/* FI Target Line */}
                            <Line 
                                type={isInflationAdjusted ? "step" : "monotone"}
                                dataKey="fiTarget" 
                                stroke="#fb923c" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="FI Target"
                                isAnimationActive={false}
                            />

                            {/* Liquid Assets Line */}
                            <Line 
                                type="monotone" 
                                dataKey="liquidMedian" 
                                stroke="#818cf8" // indigo-400
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 8, fill: '#818cf8', stroke: '#fff', cursor: 'pointer' }}
                                name="Median Investable Assets"
                                isAnimationActive={false}
                                cursor="pointer"
                            />
                            
                            {intersectionPoint && (
                                <ReferenceDot
                                    x={intersectionPoint.x}
                                    y={intersectionPoint.y}
                                    r={6}
                                    fill="#fb923c"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    label={{
                                        value: 'FI Achieved',
                                        position: 'top',
                                        fill: '#fb923c',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        offset: 10
                                    }}
                                />
                            )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-4 p-3 bg-slate-800/50 rounded text-xs text-slate-400 flex items-start gap-2 border border-slate-700/50">
                    <InfoIcon />
                    <p>
                        <strong>Investable Assets Note:</strong> This chart excludes Real Estate assets (like your primary residence) and uses only liquid investments to calculate readiness. 
                        The "FI Target" line represents the capital needed to generate your desired monthly income indefinitely.
                    </p>
                    </div>
            </div>

            {/* Bottom Section: Potential Income Cards */}
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
                            Projected Income Potential (Year {currentYear + years})
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Based on projected liquid assets in today's purchasing power (Real Value).</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-slate-300">Safe Withdrawal ({(fiSettings.safeWithdrawalRate * 100).toFixed(1)}%)</span>
                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">Standard Rule</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-bold text-white">{formatCurrency(incomeCalculations.fourPercentRule / 12)}</span>
                             <span className="text-sm text-slate-400">/mo</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {formatCurrency(incomeCalculations.fourPercentRule)} per year
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-slate-300">Perpetual Annuity</span>
                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">Interest Only</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-bold text-white">{formatCurrency(incomeCalculations.perpetualAnnuity / 12)}</span>
                             <span className="text-sm text-slate-400">/mo</span>
                        </div>
                         <div className="mt-1 text-xs text-slate-500">
                            {formatCurrency(incomeCalculations.perpetualAnnuity)} per year
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FireAnalysis;
