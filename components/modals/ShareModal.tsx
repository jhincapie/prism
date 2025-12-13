
import React, { useState } from 'react';
import CloseIcon from '../icons/CloseIcon';
import LockIcon from '../icons/LockIcon';
import { SimulationParams } from '../../types';
import { encryptWithPassword } from '../../services/crypto';

interface ShareModalProps {
    onClose: () => void;
    params: SimulationParams;
    excludeIlliquid: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({ onClose, params, excludeIlliquid }) => {
    const [password, setPassword] = useState('');
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prepare data to encrypt
        // We strip buckets of heavy computed props if necessary, but Bucket objects serialize well usually.
        // We must include the "excludeIlliquid" setting as it's separate from params in state.
        const dataToSerialize = {
            ...params,
            excludeIlliquidFromBenchmark: excludeIlliquid
        };
        
        const jsonString = JSON.stringify(dataToSerialize);
        const encrypted = encryptWithPassword(jsonString, password);

        if (encrypted) {
            const baseUrl = window.location.origin + window.location.pathname;
            const qParams = new URLSearchParams();
            qParams.set('payload', encrypted.payload);
            qParams.set('salt', encrypted.salt);
            
            setGeneratedUrl(`${baseUrl}?${qParams.toString()}`);
            setCopied(false);
        }
    };

    const handleCopy = () => {
        if (generatedUrl) {
            navigator.clipboard.writeText(generatedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <LockIcon className="h-5 w-5 text-cyan-400" />
                        Secure Share
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                
                {!generatedUrl ? (
                    <div className="space-y-6">
                        <p className="text-sm text-slate-400">
                            Create a password-protected link for this simulation. <br/>
                            The data will be encrypted in your browser before generating the URL.
                        </p>
                        
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Set Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter a secure password"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!password}
                                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Secure Link
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-center">
                            <p className="text-emerald-400 font-medium text-sm">Link Generated Successfully</p>
                            <p className="text-xs text-slate-400 mt-1">Don't forget to share the password!</p>
                        </div>
                        
                        <div>
                            <p className="text-xs text-slate-400 mb-1.5 font-medium">Encrypted URL:</p>
                            <div 
                                className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-slate-300 text-xs break-all cursor-pointer hover:border-slate-600 transition-colors"
                                onClick={handleCopy}
                            >
                                {generatedUrl}
                            </div>
                        </div>
                        
                        <button
                            onClick={handleCopy}
                            className={`w-full py-2.5 font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                        >
                            {copied ? 'Copied to Clipboard' : 'Copy Link'}
                        </button>
                        
                        <button
                            onClick={() => { setGeneratedUrl(null); setPassword(''); }}
                            className="w-full text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                            Generate New Link
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareModal;
