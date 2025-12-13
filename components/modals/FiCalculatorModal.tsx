import React from 'react';
import type { FISettings } from '../../types';
import FireIcon from '../icons/FireIcon';
import CloseIcon from '../icons/CloseIcon';
import InfoIcon from '../icons/InfoIcon';
import { formatCurrency } from '../../services/formatters';

interface FiCalculatorModalProps {
    onClose: () => void;
    fiSettings: FISettings;
    onFiSettingsChange: (settings: FISettings) => void;
}

const INCOME_BENCHMARKS = [
    { label: 'US Median', value: 6250, desc: '~$75k/yr' },
    { label: 'Top 10%', value: 16700, desc: '~$200k/yr' },
    { label: 'Top 1%', value: 54000, desc: '~$650k/yr' }
];

const FiCalculatorModal: React.FC<FiCalculatorModalProps> = ({ onClose, fiSettings, onFiSettingsChange }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div 
            className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2 text-orange-400">
                    <FireIcon className="h-6 w-6" />
                    <h3 className="text-lg font-bold">FI Calculator</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                        <span className="font-medium text-slate-200">Show on Chart</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fiSettings.isEnabled ? 'bg-orange-500' : 'bg-slate-600'}`}>
                            <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={fiSettings.isEnabled} 
                            onChange={(e) => onFiSettingsChange({...fiSettings, isEnabled: e.target.checked})} 
                            />
                            <span className={`${fiSettings.isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </div>
                    </label>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-700/50">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Target Monthly Income</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="range"
                            min="2000"
                            max="75000"
                            step="250"
                            value={fiSettings.targetMonthlyIncome}
                            onChange={(e) => onFiSettingsChange({...fiSettings, targetMonthlyIncome: parseFloat(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-mono text-orange-400 bg-slate-700 px-2 py-1 rounded min-w-[80px] text-center">
                            ${fiSettings.targetMonthlyIncome.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between gap-2 mt-3">
                        {INCOME_BENCHMARKS.map((benchmark) => (
                            <button
                                key={benchmark.label}
                                onClick={() => onFiSettingsChange({...fiSettings, targetMonthlyIncome: benchmark.value})}
                                className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-xs text-slate-300 transition-colors flex flex-col items-center justify-center gap-0.5"
                                title={`Set target to ${benchmark.label} household income`}
                            >
                                <span className="font-medium text-orange-400/90">{benchmark.label}</span>
                                <span className="opacity-75 text-[10px]">{benchmark.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                        <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                        Safe Withdrawal Rate
                        <span className="ml-2 group relative">
                            <InfoIcon />
                            <span className="absolute bottom-full mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                                The percentage of your portfolio you withdraw annually. 4% is standard.
                            </span>
                        </span>
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                min="0.01"
                                max="0.10"
                                step="0.001"
                                value={fiSettings.safeWithdrawalRate}
                                onChange={(e) => onFiSettingsChange({...fiSettings, safeWithdrawalRate: parseFloat(e.target.value)})}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <span className="text-sm font-mono text-orange-400 bg-slate-700 px-2 py-1 rounded">
                                {(fiSettings.safeWithdrawalRate * 100).toFixed(1)}%
                            </span>
                        </div>
                </div>

                <div className="pt-2 border-t border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Required Portfolio</p>
                    <p className="text-xl font-bold text-slate-200">
                        {formatCurrency((fiSettings.targetMonthlyIncome * 12) / fiSettings.safeWithdrawalRate)}
                    </p>
                </div>
                </div>
            </div>
        </div>
    </div>
);

export default FiCalculatorModal;