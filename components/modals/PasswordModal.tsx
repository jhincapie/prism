
import React, { useState } from 'react';
import LockIcon from '../icons/LockIcon';

interface PasswordModalProps {
    onUnlock: (password: string, remember: boolean) => void;
    error: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onUnlock, error }) => {
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUnlock(password, remember);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-slate-700 rounded-full text-cyan-400 mb-4">
                        <LockIcon className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">Restricted Access</h2>
                    <p className="text-sm text-slate-400 text-center mt-2">
                        This simulation is password protected. <br/>
                        Please enter the credentials to decrypt the data.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className={`w-full bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-400 mt-2">Invalid password or corrupted data.</p>
                        )}
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={remember} 
                            onChange={(e) => setRemember(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember on this device</span>
                    </label>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        Unlock Simulation
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;
