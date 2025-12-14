import { useState, useCallback, useEffect } from 'react';
import { SimulationParams, BucketData, BucketFactory, CashBucket, StockBucket, RealEstateBucket, BitcoinBucket, OtherBucket } from '../types';
import { decryptWithPassword, PUBLIC_SECRET, PUBLIC_SALT } from '../services/crypto';

const STORAGE_KEY = 'economic_simulator_params';
const PASSWORD_STORAGE_KEY = 'simulation_password';
const STORAGE_TIMESTAMP_KEY = 'economic_simulator_last_saved';
const STORAGE_TTL = 4 * 60 * 60 * 1000; // 4 Hours

const defaultParams: SimulationParams = {
  years: 25,
  simulations: 10000,
  inflationRate: 0.03,
  withdrawalReturn: 0.10,
  isDynamicMode: true,
  stressTestScenarioId: null,
  buckets: [
    new CashBucket({ id: 'cash', name: 'Cash', type: 'Cash', initialValue: 10000, enabled: true, color: '#0ea5e9' }),
    new StockBucket({ id: 'pension', name: 'Pension', type: 'Stocks', initialValue: 50000, meanReturn: 0.14, stdDev: 0.15, enabled: true, color: '#6366f1' }),
    new RealEstateBucket({ id: 'realEstate', name: 'Real Estate', type: 'RealEstate', initialValue: 20000, meanReturn: 0.048, stdDev: 0.03, enabled: true, color: '#10b981' }),
    new StockBucket({ id: 'lowRisk', name: 'Low Risk', type: 'Stocks', initialValue: 15000, meanReturn: 0.20, stdDev: 0.20, enabled: true, color: '#14b8a6' }),
    new BitcoinBucket({ id: 'highRisk', name: 'High Risk', type: 'Bitcoin', initialValue: 5000, meanReturn: 0.10, stdDev: 0.30, enabled: true, appreciationStrategy: 'btcConservative', color: '#f43f5e' }),
    new OtherBucket({ id: 'venture', name: 'Venture', type: 'Other', initialValue: 0, meanReturn: 0.20, stdDev: 0.50, enabled: true, color: '#f59e0b' }),
  ],
};

export const useAppPersistence = () => {
    const [params, setParams] = useState<SimulationParams | null>(null);
    const [excludeIlliquidFromBenchmark, setExcludeIlliquidFromBenchmark] = useState<boolean>(true);
    const [isInitializing, setIsInitializing] = useState<boolean>(true);

    // Security State
    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [encryptedData, setEncryptedData] = useState<{payload: string, salt: string} | null>(null);
    const [unlockError, setUnlockError] = useState<boolean>(false);
    const [hasSavedPassword, setHasSavedPassword] = useState<boolean>(false);
    const [hasCustomData, setHasCustomData] = useState<boolean>(false);

    // Button Animation
    const [exitState, setExitState] = useState<'idle' | 'animating' | 'done'>('idle');

    // Helper to process JSON into Params
    const processDecryptedJson = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            let excludeIlliquid = true;

            if (parsed.excludeIlliquidFromBenchmark !== undefined) {
                excludeIlliquid = parsed.excludeIlliquidFromBenchmark;
                delete parsed.excludeIlliquidFromBenchmark;
            }

            // Hydrate buckets
            if (parsed.buckets && Array.isArray(parsed.buckets)) {
                parsed.buckets = parsed.buckets.map((b: BucketData) => BucketFactory.create(b));
            }

            // Defaults for new fields
            if (parsed.stressTestScenarioId === undefined) parsed.stressTestScenarioId = null;
            if (parsed.isDynamicMode === undefined) parsed.isDynamicMode = true;

            setParams(parsed);
            setExcludeIlliquidFromBenchmark(excludeIlliquid);
            setIsInitializing(false);
            setIsLocked(false);
            return true;
        } catch (e) {
            console.error("Failed to process decrypted params:", e);
            return false;
        }
    };

    // --- Initialization Logic ---
    const getStandardParams = useCallback(async (): Promise<{ params: SimulationParams, excludeIlliquid: boolean }> => {
            // Priority 1: Local Storage (Standard)
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    let excludeIlliquid = true;
                    if (parsed.excludeIlliquidFromBenchmark !== undefined) {
                        excludeIlliquid = parsed.excludeIlliquidFromBenchmark;
                        delete parsed.excludeIlliquidFromBenchmark;
                    }
                    if (parsed.buckets) {
                        parsed.buckets = parsed.buckets.map((b: BucketData) => BucketFactory.create(b));
                    }
                    if (parsed.stressTestScenarioId === undefined) parsed.stressTestScenarioId = null;
                    if (parsed.isDynamicMode === undefined) parsed.isDynamicMode = true;

                    return { params: parsed, excludeIlliquid };
                } catch (e) {
                    console.error("Failed to parse local storage", e);
                }
            }
            // Priority 2: Defaults
            return { params: defaultParams, excludeIlliquid: true };
    }, []);

    useEffect(() => {
        const initialize = async () => {
            // --- Expiration Check ---
            const lastSavedStr = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
            if (lastSavedStr) {
                const lastSaved = parseInt(lastSavedStr, 10);
                if (Date.now() - lastSaved > STORAGE_TTL) {
                    console.log("Storage expired. Clearing data.");
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(PASSWORD_STORAGE_KEY);
                    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
                }
            }

            // Update timestamp if valid data exists (refresh session)
            if (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PASSWORD_STORAGE_KEY)) {
                localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
            }

            const urlParams = new URLSearchParams(window.location.search);
            const payload = urlParams.get('payload');
            const salt = urlParams.get('salt');

            // Check password existence on mount (after expiration check)
            setHasSavedPassword(!!localStorage.getItem(PASSWORD_STORAGE_KEY));

            // 1. Unprotected / Public Share (No Salt in URL means implicit fixed salt)
            if (payload && !salt) {
                const decrypted = await decryptWithPassword(payload, PUBLIC_SECRET, PUBLIC_SALT);
                if (decrypted && processDecryptedJson(decrypted)) {
                    // Success: Loaded public simulation
                    return;
                }
            }

            // 2. Protected Share (Standard encrypted payload)
            if (payload && salt) {
                setEncryptedData({ payload, salt });

                // Auto-unlock check
                const savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY);
                if (savedPassword) {
                    const decrypted = await decryptWithPassword(payload, savedPassword, salt);
                    if (decrypted && processDecryptedJson(decrypted)) {
                        // Success auto-unlock
                        return;
                    } else {
                        // Stored password invalid
                        localStorage.removeItem(PASSWORD_STORAGE_KEY);
                        setHasSavedPassword(false);
                    }
                }

                // Show Lock Screen
                setIsLocked(true);
                setIsInitializing(false);
                return;
            }

            // 3. Standard Load (Local Storage or Defaults)
            const { params: initialParams, excludeIlliquid } = await getStandardParams();
            setParams(initialParams);
            setExcludeIlliquidFromBenchmark(excludeIlliquid);
            setIsInitializing(false);
        };
        initialize();
    }, [getStandardParams]);

    // --- Persistence & Dirty Check Effect ---
    useEffect(() => {
        if (params && !isInitializing && !isLocked) {
            // Save to local storage
            const toSave = { ...params, excludeIlliquidFromBenchmark };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
            localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());

            // Check if Dirty (Custom Data)
            const cleanDefaults = { ...defaultParams, excludeIlliquidFromBenchmark: true };
            const isDifferent = JSON.stringify(toSave) !== JSON.stringify(cleanDefaults);
            setHasCustomData(isDifferent);
        }
    }, [params, excludeIlliquidFromBenchmark, isInitializing, isLocked]);

    const handleUnlock = async (password: string, remember: boolean) => {
        if (!encryptedData) return;
        setUnlockError(false);

        const decrypted = await decryptWithPassword(encryptedData.payload, password, encryptedData.salt);

        if (decrypted && processDecryptedJson(decrypted)) {
            if (remember) {
                localStorage.setItem(PASSWORD_STORAGE_KEY, password);
                localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
                setHasSavedPassword(true);
            }
        } else {
            setUnlockError(true);
        }
    };

    const performSafeExit = useCallback(() => {
        setExitState('animating');

        setTimeout(() => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(PASSWORD_STORAGE_KEY);
            localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
            setExitState('done');
            // Allow user to see "Deleted" briefly before reload
            setTimeout(() => {
                // Reload to the base path, clearing any payload from the URL
                window.location.href = window.location.pathname;
            }, 1000);
        }, 600); // Animation duration
    }, []);

    return {
        params,
        setParams,
        excludeIlliquidFromBenchmark,
        setExcludeIlliquidFromBenchmark,
        isInitializing,
        isLocked,
        handleUnlock,
        unlockError,
        hasSavedPassword,
        hasCustomData,
        performSafeExit,
        exitState
    };
};
