
import React from 'react';
import CloseIcon from '../icons/CloseIcon';
import InfoIcon from '../icons/InfoIcon';

interface ChartSettingsModalProps {
    onClose: () => void;
    showSPY: boolean;
    setShowSPY: (val: boolean) => void;
    showQQQ: boolean;
    setShowQQQ: (val: boolean) => void;
    showRandomPaths: boolean;
    setShowRandomPaths: (val: boolean) => void;
    spyCagr: number;
    qqqCagr: number;
}

const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({ 
    onClose, 
    showSPY, setShowSPY, 
    showQQQ, setShowQQQ, 
    showRandomPaths, setShowRandomPaths,
    spyCagr, qqqCagr
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div 
            className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-200">Chart Settings</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
            
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Benchmarks</h4>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showSPY}
                                    onChange={() => setShowSPY(!showSPY)}
                                    className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-yellow-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-yellow-500 cursor-pointer"
                                />
                                <span className="ml-3 text-slate-200 group-hover:text-white transition-colors">S&P 500</span>
                            </div>
                            <div className="group relative">
                                <InfoIcon />
                                <span className="absolute bottom-full right-0 mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg border border-slate-600 z-10">
                                    Historical Nominal CAGR: {(spyCagr * 100).toFixed(1)}%
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showQQQ}
                                    onChange={() => setShowQQQ(!showQQQ)}
                                    className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="ml-3 text-slate-200 group-hover:text-white transition-colors">Nasdaq</span>
                            </div>
                            <div className="group relative">
                                <InfoIcon />
                                <span className="absolute bottom-full right-0 mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg border border-slate-600 z-10">
                                        Historical Nominal CAGR: {(qqqCagr * 100).toFixed(1)}%
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Visualization</h4>
                    <label className="flex items-center cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={showRandomPaths}
                            onChange={() => setShowRandomPaths(!showRandomPaths)}
                            className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="ml-3 text-slate-200 group-hover:text-white transition-colors">Show sample simulation paths</span>
                    </label>
                </div>
            </div>
        </div>
    </div>
);

export default ChartSettingsModal;
