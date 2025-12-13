
import React, { useMemo, useState } from 'react';
import { AreaChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ReferenceDot } from 'recharts';
import type { SimulationPath, SimulationResult } from '../types';
import SettingsIcon from './icons/SettingsIcon';
import SnowflakeIcon from './icons/SnowflakeIcon';
import ChartSettingsModal from './modals/ChartSettingsModal';
import { formatCurrency } from '../services/formatters';

interface SimulationChartProps {
  data: SimulationPath[];
  isInflationAdjusted: boolean;
  inflationRate: number;
  comparisonResult?: SimulationResult | null;
  onToggleComparison: () => void;
  initialBenchmarkValue: number;
  initialBenchmarkExcludedValue: number;
  showSPY: boolean;
  setShowSPY: (val: boolean) => void;
  showQQQ: boolean;
  setShowQQQ: (val: boolean) => void;
  showRandomPaths: boolean;
  setShowRandomPaths: (val: boolean) => void;
  stressTestScenarioId?: string | null;
  isDynamicMode?: boolean;
  benchmarkPaths?: { spy: SimulationPath; qqq: SimulationPath }; // Passed from parent
}

const currentYear = new Date().getFullYear();

interface ProcessedDataPoint {
    year: number;
    p10: number;
    p50: number;
    p90: number;
    range75: [number, number];
    range90: [number, number];
    spy?: number;
    qqq?: number;
    comparisonP50?: number;
    [key: string]: any; 
}

const CustomTooltipContent: React.FC<{ active?: boolean; payload?: any[]; label?: string; }> = ({ active, payload, label }) => {
    if (active && payload && payload.length && label != null) {
        const data = payload[0].payload as ProcessedDataPoint;
        const displayYear = currentYear + parseInt(label, 10);
        return (
            <div className="bg-slate-700/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 shadow-lg text-sm">
                <p className="font-bold text-cyan-300 mb-2">{`Year: ${displayYear}`}</p>
                <div className="space-y-1">
                    <p className="text-slate-200"><span className="font-semibold text-cyan-400">Median:</span> {formatCurrency(data.p50)}</p>
                    {data.comparisonP50 !== undefined && (
                        <p className="text-slate-200"><span className="font-semibold text-slate-400">Comparison:</span> {formatCurrency(data.comparisonP50)}</p>
                    )}
                    {data.spy !== undefined && (
                        <p className="text-slate-200"><span className="font-semibold text-yellow-400">S&P 500:</span> {formatCurrency(data.spy)}</p>
                    )}
                    {data.qqq !== undefined && (
                        <p className="text-slate-200"><span className="font-semibold text-blue-400">Nasdaq:</span> {formatCurrency(data.qqq)}</p>
                    )}
                    <div className="pt-2 border-t border-slate-600/50 mt-2">
                        <p className="text-slate-300"><span className="font-semibold">25th - 75th:</span> {formatCurrency(data.range75[0])} - {formatCurrency(data.range75[1])}</p>
                        <p className="text-slate-400"><span className="font-semibold">10th - 90th:</span> {formatCurrency(data.range90[0])} - {formatCurrency(data.range90[1])}</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const SimulationChart: React.FC<SimulationChartProps> = ({ 
    data, 
    isInflationAdjusted, 
    inflationRate, 
    comparisonResult, 
    onToggleComparison, 
    initialBenchmarkValue,
    initialBenchmarkExcludedValue,
    showSPY, setShowSPY,
    showQQQ, setShowQQQ,
    showRandomPaths, setShowRandomPaths,
    stressTestScenarioId,
    isDynamicMode = false,
    benchmarkPaths
}) => {
  const [highlightedLine, setHighlightedLine] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const randomPaths = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const NUM_PATHS_TO_SHOW = 25;
    const paths = [];
    const dataCopy = [...data];
    const pathsToTake = Math.min(NUM_PATHS_TO_SHOW, dataCopy.length);

    for (let i = 0; i < pathsToTake; i++) {
        const randomIndex = Math.floor(Math.random() * dataCopy.length);
        paths.push(dataCopy.splice(randomIndex, 1)[0]);
    }
    return paths;
  }, [data]);

  const { chartData } = useMemo(() => {
    if (!data || data.length === 0 || data[0].length === 0) return { chartData: [] };

    const yearsLength = data[0].length;
    const processedData: ProcessedDataPoint[] = [];

    // --- Benchmark Scaling ---
    // The benchmark paths returned from simulation start at 10,000 (arbitrary base).
    // We need to scale them to match the user's initial benchmarkable portfolio value.
    const spyScaleFactor = benchmarkPaths && benchmarkPaths.spy.length > 0 && benchmarkPaths.spy[0].value > 0
        ? initialBenchmarkValue / benchmarkPaths.spy[0].value
        : 1;

    const qqqScaleFactor = benchmarkPaths && benchmarkPaths.qqq.length > 0 && benchmarkPaths.qqq[0].value > 0
        ? initialBenchmarkValue / benchmarkPaths.qqq[0].value
        : 1;


    // --- Calculate Comparison Median Paths ---
    let comparisonMedians: number[] = [];
    if (comparisonResult && comparisonResult.paths.length > 0) {
        const compYears = comparisonResult.paths[0].length;
        for (let i = 0; i < compYears; i++) {
             const values = comparisonResult.paths.map(p => p[i].value);
             values.sort((a, b) => a - b);
             const med = values[Math.floor(values.length * 0.5)];
             comparisonMedians.push(med);
        }
    }

    for (let yearIndex = 0; yearIndex < yearsLength; yearIndex++) {
        let valuesAtYear = data.map(path => path[yearIndex].value);
        const currentYearNum = data[0][yearIndex].year;
        
        let spyVal = 0;
        let qqqVal = 0;

        if (benchmarkPaths) {
            // Apply scale factor to the normalized simulation path + add the illiquid exclusion amount
            const rawSpy = benchmarkPaths.spy[yearIndex]?.value || 0;
            const rawQqq = benchmarkPaths.qqq[yearIndex]?.value || 0;
            
            spyVal = (rawSpy * spyScaleFactor) + initialBenchmarkExcludedValue;
            qqqVal = (rawQqq * qqqScaleFactor) + initialBenchmarkExcludedValue;
        }
        
        if (isInflationAdjusted) {
            const discountFactor = Math.pow(1 + inflationRate, currentYearNum);
            valuesAtYear = valuesAtYear.map(v => v / discountFactor);
            spyVal = spyVal / discountFactor;
            qqqVal = qqqVal / discountFactor;
        }

        valuesAtYear.sort((a, b) => a - b);

        const p10 = valuesAtYear[Math.floor(valuesAtYear.length * 0.1)];
        const p25 = valuesAtYear[Math.floor(valuesAtYear.length * 0.25)];
        const p50 = valuesAtYear[Math.floor(valuesAtYear.length * 0.5)]; // Median
        const p75 = valuesAtYear[Math.floor(valuesAtYear.length * 0.75)];
        const p90 = valuesAtYear[Math.floor(valuesAtYear.length * 0.9)];

        const dataPoint: ProcessedDataPoint = {
            year: currentYearNum,
            p10: p10,
            p50: p50,
            p90: p90,
            range75: [p25, p75],
            range90: [p10, p90],
        };

        if (showSPY) {
            dataPoint.spy = spyVal;
        }

        if (showQQQ) {
            dataPoint.qqq = qqqVal;
        }

        // Process Comparison Data Point
        if (comparisonMedians.length > yearIndex) {
            let compVal = comparisonMedians[yearIndex];
            if (isInflationAdjusted && comparisonResult) {
                // Use the inflation rate that was active when the comparison result was generated
                const compInflationRate = comparisonResult.paramsUsed.inflationRate;
                const compDiscountFactor = Math.pow(1 + compInflationRate, currentYearNum);
                compVal = compVal / compDiscountFactor;
            }
            dataPoint.comparisonP50 = compVal;
        }

        randomPaths.forEach((path, pathIndex) => {
            if (path && path[yearIndex]) {
                let val = path[yearIndex].value;
                if (isInflationAdjusted) {
                    const discountFactor = Math.pow(1 + inflationRate, path[yearIndex].year);
                    val = val / discountFactor;
                }
                dataPoint[`randomPath${pathIndex}`] = val;
            }
        });

        processedData.push(dataPoint);
    }
    return { chartData: processedData };
  }, [data, randomPaths, isInflationAdjusted, inflationRate, comparisonResult, showSPY, showQQQ, initialBenchmarkValue, initialBenchmarkExcludedValue, benchmarkPaths]);
  
  const yAxisMax = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return 'auto';
    }
    
    // Find max value considering enabled benchmarks and comparison
    let maxVal = Math.max(...chartData.map(d => d.p90));
    
    if (showQQQ) {
        const maxQQQ = Math.max(...chartData.map(d => d.qqq || 0));
        maxVal = Math.max(maxVal, maxQQQ);
    } else if (showSPY) {
        const maxSPY = Math.max(...chartData.map(d => d.spy || 0));
        maxVal = Math.max(maxVal, maxSPY);
    }
    
    if (comparisonResult) {
        const maxComp = Math.max(...chartData.map(d => d.comparisonP50 || 0));
        maxVal = Math.max(maxVal, maxComp);
    }

    // Add 5% padding to the top
    return Math.ceil(maxVal * 1.05);
  }, [chartData, showSPY, showQQQ, comparisonResult]);


  if (!chartData || chartData.length === 0) {
    return <p>No simulation data to display.</p>;
  }

  const finalValues = chartData[chartData.length - 1];
  
  const xAxisTickFormatter = (tick: number) => {
    const totalYears = chartData.length > 0 ? chartData.length - 1 : 0;
    if (totalYears === 0) return (currentYear + tick).toString();

    const tickInterval = Math.max(1, Math.ceil(totalYears / 10));

    if (tick % tickInterval === 0 || tick === totalYears) {
      return (currentYear + tick).toString();
    }
    
    return '';
  };
  
  const yearTicks = useMemo(() => chartData.map(p => p.year), [chartData]);
  
  return (
    <div className="w-full relative h-[400px] lg:h-[500px]">
      {isSettingsOpen && (
          <ChartSettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            showSPY={showSPY} setShowSPY={setShowSPY}
            showQQQ={showQQQ} setShowQQQ={setShowQQQ}
            showRandomPaths={showRandomPaths} setShowRandomPaths={setShowRandomPaths}
            spyCagr={0.14} // Just display value
            qqqCagr={0.20} // Just display value
          />
      )}

      {/* Chart Toolbar Button */}
      <div className="flex justify-between mb-2 -mt-4 export-hide absolute w-full top-0 z-10 px-0">
           <div className="flex space-x-2">
               <button
                    onClick={onToggleComparison}
                    className={`flex items-center space-x-1.5 text-xs font-medium px-2 py-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 backdrop-blur-sm shadow-sm ${
                        comparisonResult 
                        ? 'text-cyan-400 bg-slate-700/50 hover:bg-slate-700' 
                        : 'text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800'
                    }`}
                    title={comparisonResult ? "Clear Comparison" : "Freeze current result for comparison"}
               >
                   <SnowflakeIcon className="h-4 w-4" />
                   <span>{comparisonResult ? "Clear Comparison" : "Freeze & Compare"}</span>
               </button>
           </div>

           <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center space-x-1.5 text-xs font-medium px-2 py-1 rounded text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 backdrop-blur-sm shadow-sm"
           >
               <SettingsIcon className="h-4 w-4" />
               <span>Chart Options</span>
           </button>
      </div>

      <div className="pt-6 h-full w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
                dataKey="year"
                type="number"
                domain={['dataMin', 'dataMax']}
                ticks={yearTicks}
                tick={{ fill: '#94a3b8' }}
                stroke="#64748b"
                label={{ value: 'Year', position: 'insideBottom', offset: -15, fill: '#94a3b8' }}
                tickFormatter={xAxisTickFormatter}
                interval={0}
            />
            <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: '#94a3b8' }}
                stroke="#64748b"
                label={{ value: isInflationAdjusted ? 'Real Value (Today\'s Purchasing Power)' : 'Nominal Portfolio Value', angle: -90, position: 'insideLeft', offset: -20, fill: '#94a3b8' }}
                domain={[0, yAxisMax]}
                allowDataOverflow={true}
            />
            <Tooltip content={<CustomTooltipContent />} />
            
            <Area type="monotone" dataKey="range90" stroke="none" fill="#22d3ee" fillOpacity={0.2} name="10th-90th Percentile" isAnimationActive={false} />
            <Area type="monotone" dataKey="range75" stroke="none" fill="#22d3ee" fillOpacity={0.4} name="25th-75th Percentile" isAnimationActive={false} />
            
            {/* Highlighted Lines */}
            <Line type="monotone" dataKey="p10" stroke="#f87171" strokeWidth={highlightedLine === 'p10' ? 3 : 1} dot={false} isAnimationActive={false} name="10th Percentile" />
            <Line type="monotone" dataKey="p90" stroke="#4ade80" strokeWidth={highlightedLine === 'p90' ? 3 : 1} dot={false} isAnimationActive={false} name="90th Percentile" />
            
            {comparisonResult && (
                <Line
                    type="monotone"
                    dataKey="comparisonP50"
                    stroke="#cbd5e1" // slate-300
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                    name="Comparison Median"
                />
            )}
            
            <Line
                type="monotone"
                dataKey="p50"
                stroke="#67e8f9"
                strokeWidth={highlightedLine === 'p50' ? 4 : 2}
                dot={false}
                activeDot={{ r: 5, fill: '#67e8f9', stroke: '#083344', strokeWidth: 2 }}
                isAnimationActive={false}
                name="Median"
            />
            
            {showSPY && (
                <Line
                    type="monotone"
                    dataKey="spy"
                    stroke="#eab308" // yellow-500
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                    name="S&P 500"
                />
            )}

            {showQQQ && (
                <Line
                    type="monotone"
                    dataKey="qqq"
                    stroke="#3b82f6" // blue-500
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                    name="Nasdaq"
                />
            )}
            
            {showRandomPaths && randomPaths.map((_, index) => (
                <Line
                key={`random-${index}`}
                type="monotone"
                dataKey={`randomPath${index}`}
                stroke="#fff"
                strokeOpacity={0.3}
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                />
            ))}

            <Legend
                verticalAlign="bottom"
                height={60}
                content={() => (
                    <div className="text-center text-sm text-slate-400 mt-6 grid grid-cols-3 gap-4">
                        <div className="cursor-pointer" onMouseEnter={() => setHighlightedLine('p10')} onMouseLeave={() => setHighlightedLine(null)}>
                             <div className="text-lg font-bold text-red-400">{formatCurrency(finalValues?.p10 || 0)}</div>
                             <div className="flex justify-center items-center">
                                 <span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-2"></span>
                                 Worst Case (10th)
                             </div>
                        </div>
                        <div className="cursor-pointer" onMouseEnter={() => setHighlightedLine('p50')} onMouseLeave={() => setHighlightedLine(null)}>
                             <div className="text-lg font-bold text-cyan-400">{formatCurrency(finalValues?.p50 || 0)}</div>
                             <div className="flex justify-center items-center">
                                 <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 mr-2"></span>
                                 Median (50th)
                            </div>
                        </div>
                        <div className="cursor-pointer" onMouseEnter={() => setHighlightedLine('p90')} onMouseLeave={() => setHighlightedLine(null)}>
                            <div className="text-lg font-bold text-green-400">{formatCurrency(finalValues?.p90 || 0)}</div>
                            <div className="flex justify-center items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                                Best Case (90th)
                            </div>
                        </div>
                    </div>
                )}
            />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationChart;
