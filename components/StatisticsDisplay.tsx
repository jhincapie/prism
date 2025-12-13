
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SimulationStatistics, SimulationPath } from '../types';
import ChevronIcon from './icons/ChevronIcon';
import { formatCurrency } from '../services/formatters';

const StatCard: React.FC<{ label: string; value: string; tooltip: string; }> = ({ label, value, tooltip }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg group relative">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-200 truncate">{value}</p>
        <span className="absolute bottom-full mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-10">
            {tooltip}
        </span>
    </div>
);

const CustomHistogramTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: number; data?: any[] }> = ({ active, payload, label, data = [] }) => {
    if (active && payload && payload.length && typeof label === 'number') {
      const binStart = label;
      const count = payload[0].value;
      
      const currentIndex = data.findIndex(d => d.value === binStart);
      const binEnd = currentIndex < data.length - 1 
        ? data[currentIndex + 1].value 
        : binStart + (data[1]?.value - data[0]?.value);

      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 shadow-lg text-sm">
          <p className="font-semibold text-cyan-300 mb-1">
            Range: {formatCurrency(binStart)} - {formatCurrency(binEnd)}
          </p>
          <p className="text-slate-200">
            <span className="font-semibold">Simulations:</span> {count}
          </p>
        </div>
      );
    }
    return null;
};

const PortfolioCompositionChart: React.FC<{ composition: { name: string; value: number }[], order: string[], bucketColors: Record<string, string> }> = ({ composition, order, bucketColors }) => {
  const totalValue = composition.reduce((sum, item) => sum + item.value, 0);

  if (totalValue === 0) {
    return (
      <div className="text-center text-slate-400 p-4">
        The median portfolio has a value of $0.
      </div>
    );
  }

  const orderedComposition = useMemo(() => {
    const compositionMap = new Map(composition.map(item => [item.name, item]));
    return order
        .map(name => compositionMap.get(name))
        .filter((item): item is { name: string; value: number } => !!item);
  }, [composition, order]);

  return (
    <div className="space-y-4">
      <div className="w-full flex h-8 rounded-lg overflow-hidden" role="progressbar" aria-label="Portfolio composition bar">
        {orderedComposition.map(({ name, value }) => {
          const percentage = (value / totalValue) * 100;
          const color = bucketColors[name] || '#64748b'; // Default to slate-500 if undefined
          return (
            <div
              key={name}
              className="group relative h-full transition-all duration-300 ease-out hover:scale-y-110 origin-bottom"
              style={{ width: `${percentage}%`, backgroundColor: color }}
              title={`${name}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`}
            >
              <span className="absolute bottom-full mb-2 w-max bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                {`${name}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
        {orderedComposition.map(({ name, value }) => {
           if (value <= 0) return null;
           const percentage = (value / totalValue) * 100;
           const color = bucketColors[name] || '#64748b';
           return (
             <li key={name} className="flex items-center justify-between">
                <div className="flex items-center overflow-hidden mr-2">
                    <span 
                        className="w-3 h-3 rounded-sm mr-2 flex-shrink-0" 
                        style={{ backgroundColor: color }}
                    ></span>
                    <span className="text-slate-300 font-medium truncate" title={name}>{name}</span>
                </div>
                <div className="font-mono text-right flex-shrink-0">
                    <span className="text-slate-200">{formatCurrency(value)}</span>
                    <span className="text-slate-400 text-xs ml-1">({percentage.toFixed(1)}%)</span>
                </div>
             </li>
           );
        })}
      </ul>
    </div>
  );
};


interface StatisticsDisplayProps {
    statistics: SimulationStatistics;
    totalSimulations: number;
    paths: SimulationPath[];
    finalCompositions: number[][];
    activeBucketNames: string[];
    isInflationAdjusted: boolean;
    inflationRate: number;
    years: number;
    bucketColors: Record<string, string>;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ 
    statistics: rawStatistics, 
    totalSimulations, 
    paths, 
    finalCompositions, 
    activeBucketNames,
    isInflationAdjusted,
    inflationRate,
    years,
    bucketColors
}) => {
    
    // Scale statistics if inflation adjustment is enabled
    const statistics = useMemo(() => {
        if (!isInflationAdjusted) return rawStatistics;

        const discountFactor = Math.pow(1 + inflationRate, years);
        
        return {
            ...rawStatistics,
            mean: rawStatistics.mean / discountFactor,
            median: rawStatistics.median / discountFactor,
            stdDev: rawStatistics.stdDev / discountFactor,
            min: rawStatistics.min / discountFactor,
            max: rawStatistics.max / discountFactor,
            p1: rawStatistics.p1 / discountFactor,
            p2: rawStatistics.p2 / discountFactor,
            p98: rawStatistics.p98 / discountFactor,
            p99: rawStatistics.p99 / discountFactor,
            histogramData: rawStatistics.histogramData.map(bin => ({
                ...bin,
                value: bin.value / discountFactor
            })),
            medianComposition: rawStatistics.medianComposition.map(c => ({
                ...c,
                value: c.value / discountFactor
            }))
        };
    }, [rawStatistics, isInflationAdjusted, inflationRate, years]);


    const { mean, median, stdDev, p1, p99, histogramData, medianComposition, p98 } = statistics;

    const [displayComposition, setDisplayComposition] = useState(medianComposition);
    const [compositionTitle, setCompositionTitle] = useState('Median Final Portfolio Composition');
    const [hoveredBinIndex, setHoveredBinIndex] = useState<number | null>(null);
    const [bucketOrder, setBucketOrder] = useState<string[]>([]);
    const [isHistogramExpanded, setIsHistogramExpanded] = useState<boolean>(true);

    useEffect(() => {
        setDisplayComposition(statistics.medianComposition);
        setCompositionTitle('Median Final Portfolio Composition');
        setHoveredBinIndex(null);
        
        const initialSortedOrder = [...statistics.medianComposition]
            .sort((a, b) => b.value - a.value)
            .map(item => item.name);
        setBucketOrder(initialSortedOrder);
    }, [statistics]);

    const cagr = useMemo(() => {
        const initialValue = paths.length > 0 && paths[0].length > 0 ? paths[0][0].value : 0;
        if (initialValue <= 0 || years <= 0) return 0;
        
        const safeMedian = Math.max(0, median);
        return Math.pow(safeMedian / initialValue, 1 / years) - 1;
    }, [median, paths, years]);


    const handleChartHover = (state: any) => {
        if (!state || state.activeTooltipIndex == null || state.activeTooltipIndex < 0) {
            handleChartLeave();
            return;
        }

        const activeBinIndex = state.activeTooltipIndex;

        if (!histogramData || activeBinIndex >= histogramData.length) {
            handleChartLeave();
            return;
        }
        
        const currentBin = histogramData[activeBinIndex];
        if (!currentBin) {
            handleChartLeave();
            return;
        }

        if (activeBinIndex === hoveredBinIndex) return;
        
        setHoveredBinIndex(activeBinIndex);
        
        const discountFactor = isInflationAdjusted ? Math.pow(1 + inflationRate, years) : 1;
        
        const binStart = currentBin.value;
        const nextBin = histogramData[activeBinIndex + 1];
        const binEnd = nextBin ? nextBin.value : p98;

        const relevantIndices: number[] = [];
        paths.forEach((path, index) => {
            if (!path || path.length === 0) return;
            const lastPoint = path[path.length - 1];
            if (!lastPoint) return;

            const finalValue = lastPoint.value / discountFactor;
            if (finalValue >= binStart && finalValue < binEnd) {
                relevantIndices.push(index);
            }
        });

        if (relevantIndices.length > 0) {
            const numBuckets = activeBucketNames.length;
            const totalCompositionValues = Array(numBuckets).fill(0);

            for (const originalIndex of relevantIndices) {
                const composition = finalCompositions[originalIndex];
                if (composition) {
                    for (let i = 0; i < numBuckets; i++) {
                        totalCompositionValues[i] += (composition[i] || 0) / discountFactor;
                    }
                }
            }
            const averageCompositionValues = totalCompositionValues.map(sum => sum / relevantIndices.length);
            const newComposition = activeBucketNames.map((name, index) => ({
                name,
                value: averageCompositionValues[index] || 0,
            }));
            
            setDisplayComposition(newComposition);
            setCompositionTitle(`Avg. Composition for ${formatCurrency(binStart)} - ${formatCurrency(binEnd)}`);
        } else {
            handleChartLeave();
        }
    };
    
    const handleChartLeave = () => {
        if (hoveredBinIndex !== null) {
            setHoveredBinIndex(null);
            setDisplayComposition(medianComposition);
            setCompositionTitle('Median Final Portfolio Composition');
        }
    };
    
    return (
        <div className="space-y-8 pt-4 border-t border-slate-700">
            <div className="text-center">
                <h2 className="text-xl font-bold text-cyan-400">Statistical Analysis</h2>
                <p className="text-sm text-slate-400">
                    A deeper look into the range of potential outcomes.
                    {isInflationAdjusted && <span className="block text-cyan-500 font-medium mt-1">Showing Inflation-Adjusted Values (Real Terms)</span>}
                </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <StatCard label="Mean Average" value={formatCurrency(mean)} tooltip="The average of all simulation outcomes." />
                <StatCard label="Median" value={formatCurrency(median)} tooltip="The 50th percentile outcome, where half of the results are higher and half are lower." />
                <StatCard label="Volatility" value={formatCurrency(stdDev)} tooltip="Standard Deviation: A measure of how spread out the final values are from the average." />
                <StatCard label="Best Case (99th)" value={formatCurrency(p99)} tooltip="A very optimistic scenario, better than 99% of all outcomes." />
                <StatCard label="Worst Case (1st)" value={formatCurrency(p1)} tooltip="A very pessimistic scenario, worse than 99% of all outcomes." />
                <StatCard 
                    label={isInflationAdjusted ? "Real CAGR" : "Nominal CAGR"} 
                    value={`${(cagr * 100).toFixed(2)}%`} 
                    tooltip={`The Compound Annual Growth Rate of the median outcome${isInflationAdjusted ? ', adjusted for inflation' : ''}.`} 
                />
            </div>

            {medianComposition && medianComposition.length > 0 && (
              <div className="space-y-3">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-cyan-400">{compositionTitle}</h3>
                    <p className="text-sm text-slate-400">
                        {hoveredBinIndex === null
                          ? "The average asset breakdown for simulations that finished near the median outcome (45th-55th percentile)."
                          : "Hover over the distribution chart below to explore compositions for different outcome ranges."}
                    </p>
                </div>
                <PortfolioCompositionChart composition={displayComposition} order={bucketOrder} bucketColors={bucketColors} />
              </div>
            )}
            
            <div className="border-t border-slate-700 pt-4 mt-8">
                <button
                    onClick={() => setIsHistogramExpanded(!isHistogramExpanded)}
                    className="w-full flex items-center justify-between text-left focus:outline-none group"
                >
                    <div>
                        <h3 className="text-lg font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">Distribution of Final Values</h3>
                        <p className="text-sm text-slate-400">Frequency of outcomes (2nd - 98th percentile)</p>
                    </div>
                    <ChevronIcon isExpanded={isHistogramExpanded} />
                </button>
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isHistogramExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    {isHistogramExpanded && (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart
                                    data={histogramData}
                                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                    barCategoryGap="10%"
                                    onMouseMove={handleChartHover}
                                    onMouseLeave={handleChartLeave}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                    <XAxis 
                                        dataKey="value" 
                                        tickFormatter={formatCurrency}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        stroke="#64748b"
                                    />
                                    <YAxis 
                                        allowDecimals={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        stroke="#64748b"
                                        label={{ value: 'Frequency', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8' }}
                                    />
                                    <Tooltip content={<CustomHistogramTooltip data={histogramData} />} cursor={{ fill: 'rgba(34, 211, 238, 0.1)' }}/>
                                    <Bar dataKey="count" fill="#22d3ee" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsDisplay;
