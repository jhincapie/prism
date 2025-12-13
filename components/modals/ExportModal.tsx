import React, { useState } from 'react';
import CloseIcon from '../icons/CloseIcon';
import LockIcon from '../icons/LockIcon';
import DownloadIcon from '../icons/DownloadIcon';

interface ExportModalProps {
    onClose: () => void;
    onConfirm: (password: string | null) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onConfirm }) => {
    const [isProtected, setIsProtected] = useState<boolean>(true);
    const [password, setPassword] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const handleConfirm = () => {
        setIsGenerating(true);
        // If protected, use the password. If not, pass null to signal public/unprotected mode.
        onConfirm(isProtected ? password : null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <DownloadIcon className="h-5 w-5 text-cyan-400" />
                        Export Report
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                        <p className="text-yellow-400 font-medium text-sm flex items-center gap-2">
                            <span className="text-lg">⚠️</span> Data Privacy Warning
                        </p>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            This PDF report contains a <strong>live link</strong> to restore this simulation. 
                            {isProtected 
                                ? " With password protection enabled, both the PDF file and the data link will be encrypted."
                                : " Without protection, anyone with this PDF can view your financial data."
                            }
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${isProtected ? 'bg-slate-700/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'}`}>
                            <input 
                                type="radio" 
                                name="exportType"
                                checked={isProtected}
                                onChange={() => setIsProtected(true)}
                                className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 bg-slate-700 border-slate-600"
                            />
                            <div className="flex-grow">
                                <span className="block text-sm font-medium text-slate-200">Password Protected PDF</span>
                                <span className="block text-xs text-slate-500">Encrypts both the PDF file and the restore link.</span>
                            </div>
                            <LockIcon className="h-5 w-5 text-cyan-500" />
                        </label>

                        <label className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${!isProtected ? 'bg-slate-700/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'}`}>
                            <input 
                                type="radio" 
                                name="exportType"
                                checked={!isProtected}
                                onChange={() => setIsProtected(false)}
                                className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 bg-slate-700 border-slate-600"
                            />
                            <div className="flex-grow">
                                <span className="block text-sm font-medium text-slate-200">Unprotected / Public</span>
                                <span className="block text-xs text-slate-500">Standard PDF. Link opens without a password.</span>
                            </div>
                        </label>
                    </div>

                    {isProtected && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Set Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter a secure password"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProtected && !password}
                            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isGenerating ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;