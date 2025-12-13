
import React, { useState } from 'react';
import type { BucketData, BucketType } from '../types';
import { Bucket, CashBucket, InvestmentBucket, BitcoinBucket } from '../types';
import ChevronIcon from './icons/ChevronIcon';
import TrashIcon from './icons/TrashIcon';
import InfoIcon from './icons/InfoIcon';
import InputField from './InputField';

const formatCurrency = (value: number) => `${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface BucketInputProps {
    bucket: Bucket;
    onChange: (id: string, updates: Partial<BucketData>) => void;
    onRemove: (id: string) => void;
    disabled: boolean;
}

const BucketInput: React.FC<BucketInputProps> = ({ bucket, onChange, onRemove, disabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Check instance types for rendering logic
    const isCash = bucket instanceof CashBucket;
    const isBitcoin = bucket instanceof BitcoinBucket;
    const isInvestment = bucket instanceof InvestmentBucket;

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(bucket.id, { enabled: e.target.checked });
    };

    // Show sliders if it's a standard investment (Stocks/RE/Other) OR if it's Bitcoin with 'Fixed' strategy.
    // Note: BitcoinBucket extends InvestmentBucket, so we must explicitly exclude Bitcoin from the first check.
    const showFixedSettings = (isInvestment && !isBitcoin) || (isBitcoin && (bucket as BitcoinBucket).appreciationStrategy === 'fixed');

    const strategyLabels: Record<string, string> = {
        fixed: 'Fixed',
        btcConservative: 'BTC Conserv.',
        btcPowerLaw: 'BTC Power Law',
    };

    const bucketTypes: BucketType[] = ['Cash', 'RealEstate', 'Stocks', 'Bitcoin', 'Other'];

    return (
        <div className={`p-4 border border-slate-700 rounded-lg bg-slate-800 transition-opacity duration-300 ${!bucket.enabled ? 'opacity-80' : ''}`} style={{ borderLeftColor: bucket.color, borderLeftWidth: '4px' }}>
            {/* Header Row */}
            <div 
                className="w-full flex justify-between items-center cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-3 flex-grow">
                    <input
                        type="checkbox"
                        checked={bucket.enabled}
                        onChange={handleCheckboxChange}
                        onClick={(e) => e.stopPropagation()} 
                        className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                        disabled={disabled}
                        aria-label={`Enable ${bucket.name} bucket`}
                    />
                    <div className="flex-grow max-w-[160px] sm:max-w-xs overflow-hidden">
                         <span className="block text-cyan-400 font-semibold px-1 truncate">
                            {bucket.name}
                        </span>
                        <p className="text-xs text-slate-500 px-1">{bucket.type}</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    <div className="text-slate-400">
                        <ChevronIcon isExpanded={isExpanded} />
                    </div>
                </div>
            </div>
            
            {/* Expanded Content */}
            <div 
                id={`bucket-content-${bucket.id}`}
                className={`mt-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[60rem] opacity-100 border-t border-slate-700 pt-4' : 'max-h-0 opacity-0'}`}
            >
                {/* Name and Color Row */}
                <div className="flex gap-4">
                    <div className="flex-grow">
                        <label htmlFor={`${bucket.id}-name-input`} className="flex items-center text-sm font-medium text-slate-300 mb-2">
                           Name
                        </label>
                        <input
                            id={`${bucket.id}-name-input`}
                            type="text"
                            value={bucket.name}
                            onChange={(e) => onChange(bucket.id, { name: e.target.value })}
                            className="w-full bg-slate-700 text-white rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                            disabled={disabled}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${bucket.id}-color-input`} className="flex items-center text-sm font-medium text-slate-300 mb-2">
                            Color
                        </label>
                        <input
                            id={`${bucket.id}-color-input`}
                            type="color"
                            value={bucket.color}
                            onChange={(e) => onChange(bucket.id, { color: e.target.value })}
                            className="h-10 w-16 bg-slate-700 rounded-md p-1 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div>
                     <label htmlFor={`${bucket.id}-type`} className="flex items-center text-sm font-medium text-slate-300 mb-2">
                        Asset Type
                    </label>
                    <select
                        id={`${bucket.id}-type`}
                        value={bucket.type}
                        onChange={(e) => onChange(bucket.id, { type: e.target.value as BucketType })}
                        className="w-full bg-slate-700 text-white rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={disabled || !bucket.enabled}
                    >
                        {bucketTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <InputField
                    id={`${bucket.id}-initialValue`}
                    label="Initial Value"
                    value={bucket.initialValue}
                    onChange={(e) => onChange(bucket.id, { initialValue: parseFloat(e.target.value) })}
                    step={1000}
                    format={formatCurrency}
                    disabled={disabled || !bucket.enabled}
                />
                 {isBitcoin && (
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-slate-300">
                            Appreciation Strategy
                            <span className="ml-2 group relative">
                                <InfoIcon />
                                <span className="absolute bottom-full mb-2 w-56 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                    'Fixed' uses the slider below. BTC models use pre-defined annual returns for ~25 years, then revert to the 'Fixed' value.
                                </span>
                            </span>
                        </label>
                        <div className="flex items-center space-x-2 rounded-lg bg-slate-900 p-1">
                            {Object.keys(strategyLabels).map(strategy => (
                                <label key={strategy} className="flex-1 text-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`${bucket.id}-strategy`}
                                        value={strategy}
                                        checked={(bucket as BitcoinBucket).appreciationStrategy === strategy}
                                        onChange={e => onChange(bucket.id, { appreciationStrategy: e.target.value as any })}
                                        className="sr-only"
                                        disabled={disabled || !bucket.enabled}
                                    />
                                    <span className={`block px-2 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                        (bucket as BitcoinBucket).appreciationStrategy === strategy
                                        ? 'bg-cyan-600 text-white shadow-md'
                                        : 'text-slate-300 hover:bg-slate-700/50'
                                    }`}>
                                        {strategyLabels[strategy]}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                
                {showFixedSettings && (
                    <>
                        <InputField
                            id={`${bucket.id}-meanReturn`}
                            label="Expected Annual Return"
                            value={(bucket as InvestmentBucket | BitcoinBucket).meanReturn}
                            onChange={(e) => onChange(bucket.id, { meanReturn: parseFloat(e.target.value) })}
                            type="range"
                            step={0.001}
                            min={0}
                            max={0.4}
                            isPercentage
                            disabled={disabled || !bucket.enabled}
                        />
                        <InputField
                            id={`${bucket.id}-stdDev`}
                            label="Annual Volatility"
                            value={(bucket as InvestmentBucket | BitcoinBucket).stdDev}
                            onChange={(e) => onChange(bucket.id, { stdDev: parseFloat(e.target.value) })}
                            type="range"
                            step={0.005}
                            min={0}
                            max={0.5}
                            isPercentage
                            disabled={disabled || !bucket.enabled}
                        />
                    </>
                )}

                <div className="flex justify-end pt-4">
                     <button
                        onClick={() => onRemove(bucket.id)}
                        disabled={disabled}
                        className="flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors focus:outline-none"
                        title="Remove Bucket"
                    >
                        <TrashIcon className="h-4 w-4" />
                        <span>Remove Asset</span>
                    </button>
                </div>
            </div>
            {!isExpanded && (
                <div className="mt-2 text-xs text-slate-400 px-1">
                    <div className="mb-1">
                         <span className="text-slate-500">Value: </span>
                         <span className="font-medium text-slate-300">{formatCurrency(bucket.initialValue)}</span>
                    </div>
                    {!isCash && (
                        <div className="flex items-center flex-wrap gap-x-3">
                            <span>
                                <span className="text-slate-500">
                                    {isBitcoin && (bucket as BitcoinBucket).appreciationStrategy && (bucket as BitcoinBucket).appreciationStrategy !== 'fixed' ? 'Strategy: ' : 'Return: '}
                                </span>
                                <span className="font-medium text-slate-300">
                                {isBitcoin && (bucket as BitcoinBucket).appreciationStrategy && (bucket as BitcoinBucket).appreciationStrategy !== 'fixed'
                                    ? strategyLabels[(bucket as BitcoinBucket).appreciationStrategy!]
                                    : `${((bucket as any).meanReturn * 100).toFixed(1)}%`
                                }
                                </span>
                            </span>
                            {showFixedSettings && (
                                <span>
                                    <span className="text-slate-500">Vol: </span>
                                    <span className="font-medium text-slate-300">
                                    {((bucket as any).stdDev * 100).toFixed(1)}%
                                    </span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BucketInput;
