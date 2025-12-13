

import React, { useState, useEffect } from 'react';
import type { SimulationStatistics, EconomicAnalysis } from '../types';
import InfoIcon from './icons/InfoIcon';
import ChevronIcon from './icons/ChevronIcon';
import GeminiIcon from './icons/GeminiIcon';

interface EconomicContextProps {
  statistics: SimulationStatistics;
  years: number;
  aiAnalysis: Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'> | null;
  isLoading: boolean;
  error: string | null;
  country: string;
  setCountry: (country: string) => void;
  cachedCountries: string[];
  isInflationAdjusted: boolean;
  inflationRate: number;
  withdrawalReturn: number;
}

const COUNTRIES = [
    'United States',
    'Colombia',
    'Sweden',
    'Albania',
    'Andorra',
    'Argentina',
    'Australia',
    'Austria',
    'Belarus',
    'Belgium',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Brazil',
    'Bulgaria',
    'Canada',
    'Chile',
    'China',
    'Croatia',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Ecuador',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Guyana',
    'Hungary',
    'Iceland',
    'India',
    'Ireland',
    'Italy',
    'Japan',
    'Latvia',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Malta',
    'Mexico',
    'Moldova',
    'Monaco',
    'Montenegro',
    'Netherlands',
    'North Macedonia',
    'Norway',
    'Paraguay',
    'Peru',
    'Poland',
    'Portugal',
    'Romania',
    'Russia',
    'San Marino',
    'Serbia',
    'Slovakia',
    'Slovenia',
    'South Korea',
    'Spain',
    'Suriname',
    'Switzerland',
    'Ukraine',
    'United Kingdom',
    'Uruguay',
    'Venezuela'
];

const formatUsdCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

const ContextCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 h-full">
        <h3 className="text-lg font-bold text-cyan-400 mb-3">{title}</h3>
        {children}
    </div>
);

const AnalysisSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {/* Config Section Placeholder */}
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
             <div className="h-6 w-1/3 bg-slate-700 rounded"></div>
        </div>

        {/* Financial Summary Card Placeholder */}
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-3">
            <div className="h-6 w-1/3 bg-slate-700 rounded mb-2"></div> {/* Title */}
            <div className="h-9 w-1/2 bg-slate-700 rounded"></div> {/* Large Number */}
            <div className="h-4 w-full bg-slate-700 rounded mt-2"></div> {/* Text Line 1 */}
            <div className="h-4 w-5/6 bg-slate-700 rounded"></div> {/* Text Line 2 */}
        </div>

        {/* Net Worth Ranking Card Placeholder */}
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-4">
            <div className="h-6 w-1/2 bg-slate-700 rounded"></div> {/* Title */}
            <div className="flex justify-center items-center py-4">
                <div className="h-16 w-1/3 bg-slate-700 rounded"></div> {/* Large percentile number */}
            </div>
            <div className="h-4 w-full bg-slate-700 rounded"></div> {/* Explanation line 1 */}
            <div className="h-4 w-4/5 bg-slate-700 rounded"></div> {/* Explanation line 2 */}
        </div>
    </div>
);

const EconomicContext: React.FC<EconomicContextProps> = ({ 
    statistics, 
    years, 
    aiAnalysis, 
    isLoading, 
    error, 
    country, 
    setCountry, 
    cachedCountries,
    isInflationAdjusted,
    inflationRate,
    withdrawalReturn
}) => {
  const [analysis, setAnalysis] = useState<EconomicAnalysis | null>(null);
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);

  // Effect to perform client-side calculations when AI data or config sliders change
  useEffect(() => {
    if (!aiAnalysis) {
      setAnalysis(null);
      return;
    }

    const sourceValue = statistics.median;
    
    // We always calculate both values to have them ready, but the display depends on isInflationAdjusted
    const inflationAdjustedValue = sourceValue / Math.pow(1 + inflationRate, years);

    // Determine which value to use for income calculations based on the global toggle.
    // If user is viewing in "Real Terms" (Inflation Adjusted), we use that value for income calcs too.
    const principalForIncome = isInflationAdjusted 
        ? inflationAdjustedValue
        : sourceValue;
    
    const realReturnRate = withdrawalReturn - inflationRate;
    const perpetualAnnuity = principalForIncome * (realReturnRate > 0 ? realReturnRate : 0);
    const fourPercentRule = principalForIncome * 0.04;

    setAnalysis({
      ...aiAnalysis,
      inflationAdjustedValue,
      retirementIncome: {
        perpetualAnnuity,
        fourPercentRule,
      },
    });
  }, [aiAnalysis, inflationRate, withdrawalReturn, statistics.median, years, isInflationAdjusted]);


  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8">
        <p><strong>Error:</strong> {error}</p>
        <p className="mt-2 text-sm text-slate-400">Could not retrieve AI analysis. Please ensure the API key is configured correctly and try running the simulation again.</p>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center text-slate-400 p-8">No analysis data available.</div>;
  }
  
  // The display value is driven by the global view mode
  const displayValue = isInflationAdjusted ? analysis.inflationAdjustedValue : statistics.median;

  const formatLocalCurrency = (usdValue: number) => {
    if (country === 'United States' || !analysis.currencyInfo || !analysis.currencyInfo.rate || analysis.currencyInfo.code === 'USD') {
        return formatUsdCurrency(usdValue);
    }
    
    const { code, rate } = analysis.currencyInfo;
    const localValue = usdValue * rate;

    const formattedLocal = `${localValue.toLocaleString(undefined, {maximumFractionDigits: 0})} ${code}`;
    const formattedUsd = `(US ${formatUsdCurrency(usdValue)})`;

    return `${formattedLocal} ${formattedUsd}`;
  };

  const targetYear = new Date().getFullYear() + years;

  return (
    <div className="space-y-6">
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
            <button
                className="w-full flex justify-between items-center text-left"
                onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                aria-expanded={isConfigExpanded}
                aria-controls="economic-config-panel"
            >
                <h3 className="font-semibold text-cyan-400">Analysis Configuration</h3>
                <ChevronIcon isExpanded={isConfigExpanded} />
            </button>
             <div
                id="economic-config-panel"
                className={`pt-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${isConfigExpanded ? 'max-h-[20rem] opacity-100' : 'max-h-0 opacity-0'}`}
             >
                <div>
                    <label htmlFor="country-select" className="flex items-center text-sm font-medium text-slate-300 mb-2">
                        Country for Analysis
                    </label>
                    <select
                        id="country-select"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full bg-slate-700 text-white rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}{cachedCountries.includes(c) ? ' ✓' : ''}</option>)}
                    </select>
                </div>
            </div>
             {!isConfigExpanded && (
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-start flex-wrap gap-x-4 gap-y-1 px-1">
                    <span>
                        <span className="text-slate-500">Country: </span>
                        <span className="font-medium text-slate-300">{country}</span>
                    </span>
                     <span>
                        <span className="text-slate-500">Global Inflation: </span>
                        <span className="font-medium text-slate-300">{(inflationRate * 100).toFixed(1)}%</span>
                    </span>
                    <span>
                        <span className="text-slate-500">Withdrawal Return: </span>
                        <span className="font-medium text-slate-300">{(withdrawalReturn * 100).toFixed(1)}%</span>
                    </span>
                </div>
            )}
        </div>

      <ContextCard title="Financial Summary">
          <p className="text-3xl font-bold text-slate-100 mb-2">{formatLocalCurrency(displayValue)}</p>
          <p className="text-sm text-slate-400 mb-4">
            {!isInflationAdjusted
              ? `Median projected portfolio value for the year ${targetYear}.`
              : `Estimated value of your median outcome (${formatUsdCurrency(statistics.median)}) in today's US dollars, adjusted for ${(inflationRate * 100).toFixed(1)}% annual inflation.`
            }
          </p>
          <p className="text-slate-300">{analysis.summary}</p>
      </ContextCard>

      <div className="space-y-6">
            <ContextCard title={`${country} Net Worth Ranking`}>
                <div className="text-center">
                    <p className="text-5xl font-bold text-teal-400">{analysis.netWorthPercentile.percentile.toFixed(1)}<span className="text-3xl">%</span></p>
                    <p className="text-sm text-slate-400 mt-2">Projected Percentile in {country}, {targetYear}</p>
                </div>
                <p className="text-sm text-slate-400 mt-4">{analysis.netWorthPercentile.explanation}</p>
            </ContextCard>
      </div>

       <div className="mt-6 p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-lg flex items-start gap-3">
          <GeminiIcon className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-indigo-300">AI-Generated Analysis:</span> This content is generated by an AI model based on the simulation parameters and projections. It is intended for informational and entertainment purposes only. It assumes specific economic conditions that may not reflect reality. This is not financial advice; always consult a qualified professional before making investment decisions.
          </p>
       </div>
    </div>
  );
};

export default EconomicContext;
