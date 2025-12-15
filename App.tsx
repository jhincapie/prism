import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import PortfolioInputForm from './components/PortfolioInputForm';
import SimulationChart from './components/SimulationChart';
import StatisticsDisplay from './components/StatisticsDisplay';
import EconomicContext from './components/EconomicContext';
import MilestoneAnalysis from './components/MilestoneAnalysis';
import FireAnalysis from './components/FireAnalysis';
import GeminiIcon from './components/icons/GeminiIcon';
import DownloadIcon from './components/icons/DownloadIcon';
import TargetIcon from './components/icons/TargetIcon';
import FireIcon from './components/icons/FireIcon';
import LockIcon from './components/icons/LockIcon'; 
import TrashIcon from './components/icons/TrashIcon'; // New Icon
import { decryptWithPassword, encryptWithPassword, PUBLIC_SECRET, PUBLIC_SALT } from './services/crypto';
import { SimulationParams, EconomicAnalysis, BucketFactory, BucketData, FISettings, CashBucket, StockBucket, RealEstateBucket, BitcoinBucket, OtherBucket } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Header from './components/Header';
import { LoadingSkeleton } from './components/Skeletons';
import { formatCurrency } from './services/formatters';
import { useSimulation } from './hooks/useSimulation';
import PasswordModal from './components/modals/PasswordModal';
import ShareModal from './components/modals/ShareModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ExportModal from './components/modals/ExportModal';

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

const App: React.FC = () => {
  const { 
    simulationResult, 
    comparisonResult, 
    isLoading, 
    error, 
    progress, 
    runSimulation, 
    toggleComparison 
  } = useSimulation();

  const [params, setParams] = useState<SimulationParams | null>(null);
  const [excludeIlliquidFromBenchmark, setExcludeIlliquidFromBenchmark] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  
  // Security State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [encryptedData, setEncryptedData] = useState<{payload: string, salt: string} | null>(null);
  const [unlockError, setUnlockError] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'params' | 'results'>('params');
  const [activeResultsTab, setActiveResultsTab] = useState<'simulation' | 'milestone' | 'fire' | 'context'>('simulation');
  const [isInflationAdjusted, setIsInflationAdjusted] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState<boolean>(true);

  // Button Animation & Status States
  const [exitState, setExitState] = useState<'idle' | 'animating' | 'done'>('idle');
  const [hasSavedPassword, setHasSavedPassword] = useState<boolean>(false);
  const [hasCustomData, setHasCustomData] = useState<boolean>(false);

  // Chart Persistent State
  const [showSPY, setShowSPY] = useState<boolean>(false);
  const [showQQQ, setShowQQQ] = useState<boolean>(false);
  const [showRandomPaths, setShowRandomPaths] = useState<boolean>(false);

  const activeResultsTabRef = useRef(activeResultsTab);
  activeResultsTabRef.current = activeResultsTab;
  
  const hasRunInitial = useRef(false);

  // Economic Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'> | null>(null);
  const [analysisIsLoading, setAnalysisIsLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('United States');
  const analysisCache = useRef<Map<string, Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'>>>(new Map());

  // Milestone & FI State
  const [milestoneTarget, setMilestoneTarget] = useState<number | null>(null);
  const [fiSettings, setFiSettings] = useState<FISettings>({
      targetMonthlyIncome: 15000,
      safeWithdrawalRate: 0.04,
      isEnabled: true
  });

  const resultsRef = useRef<HTMLDivElement>(null);

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

  // --- Resize Listener ---
  useEffect(() => {
      const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
      checkDesktop();
      window.addEventListener('resize', checkDesktop);
      return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // --- Auto-Run Simulation ---
  useEffect(() => {
    if (!params || isLocked) return;

    const timeoutId = setTimeout(() => {
        if (isAutoRunEnabled || !hasRunInitial.current) {
            setAiAnalysis(null);
            setAnalysisError(null);
            analysisCache.current.clear();

            if (activeResultsTabRef.current === 'context') {
                setActiveResultsTab('simulation');
            }

            runSimulation(params);
            hasRunInitial.current = true;
        }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [params, runSimulation, isAutoRunEnabled, isLocked]);

  const handleManualRun = useCallback(() => {
      if (!params) return;

      setAiAnalysis(null);
      setAnalysisError(null);
      analysisCache.current.clear();

      if (activeResultsTab === 'context') {
          setActiveResultsTab('simulation');
      }

      runSimulation(params);
  }, [params, runSimulation, activeResultsTab]);

  // --- Computed Values ---
  const totalInitialValue = useMemo(() => {
    if (!params) return 0;
    return params.buckets
      .filter(b => b.enabled)
      .reduce((sum, b) => sum + b.initialValue, 0);
  }, [params]);

  const benchmarkInitialValue = useMemo(() => {
    if (!params) return 0;
    if (!excludeIlliquidFromBenchmark) {
        return totalInitialValue;
    }
    return params.buckets
        .filter(b => b.enabled)
        .filter(b => b.type !== 'Cash' && b.type !== 'RealEstate')
        .reduce((sum, b) => sum + b.initialValue, 0);
  }, [params, totalInitialValue, excludeIlliquidFromBenchmark]);

  const benchmarkExcludedValue = useMemo(() => {
      if (!params || !excludeIlliquidFromBenchmark) return 0;
      return totalInitialValue - benchmarkInitialValue;
  }, [params, totalInitialValue, benchmarkInitialValue, excludeIlliquidFromBenchmark]);

  const bucketColors = useMemo(() => {
    if (!params) return {};
    return params.buckets.reduce((acc, bucket) => {
        acc[bucket.name] = bucket.color;
        return acc;
    }, {} as Record<string, string>);
  }, [params]);

  // --- Data Management Handlers ---
  const isExitProcessing = exitState !== 'idle';
  const isExitDisabled = isExitProcessing || (!hasSavedPassword && !hasCustomData);

  const handleSafeExit = useCallback(() => {
    if (isExitDisabled) return;
    setShowExitConfirm(true);
  }, [isExitDisabled]);

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

  // --- Export Handling ---
  const handleExportConfirm = async (password: string | null) => {
      if (!resultsRef.current || !params) return;
      
      try {
          // 1. Generate the Share URL
          const dataToSerialize = {
              ...params,
              excludeIlliquidFromBenchmark: excludeIlliquidFromBenchmark
          };
          const jsonString = JSON.stringify(dataToSerialize);
          
          let generatedUrl = '';
          const baseUrl = window.location.origin + window.location.pathname;

          if (password) {
              // Password Protected
              const encrypted = encryptWithPassword(jsonString, password);
              if (encrypted) {
                  const qParams = new URLSearchParams();
                  qParams.set('payload', encrypted.payload);
                  qParams.set('salt', encrypted.salt);
                  generatedUrl = `${baseUrl}?${qParams.toString()}`;
              }
          } else {
              // Unprotected / Public
              // Use fixed salt and secret
              const encrypted = encryptWithPassword(jsonString, PUBLIC_SECRET, PUBLIC_SALT);
              if (encrypted) {
                  const qParams = new URLSearchParams();
                  qParams.set('payload', encrypted.payload);
                  // Do NOT include the fixed salt in the URL
                  generatedUrl = `${baseUrl}?${qParams.toString()}`;
              }
          }

          // 2. Generate PDF
          const canvas = await html2canvas(resultsRef.current, {
              backgroundColor: '#0f172a', 
              scale: 2,
              ignoreElements: (element) => element.classList.contains('export-hide'),
              onclone: (clonedDoc) => {
                  const summary = clonedDoc.getElementById('pdf-summary');
                  if (summary) {
                      summary.classList.remove('hidden');
                      summary.style.display = 'block';
                  }
              }
          });
          
          const imgData = canvas.toDataURL("image/png");

          // Configure PDF with encryption if password provided
          const pdfOptions: any = { 
              orientation: 'portrait', 
              unit: 'mm', 
              format: 'a4' 
          };

          if (password) {
              pdfOptions.encryption = {
                  userPassword: password,
                  ownerPassword: password,
                  userPermissions: ["print", "copy", "modify", "annot-forms"]
              };
          }

          const pdf = new jsPDF(pdfOptions);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          pdf.setFillColor(15, 23, 42);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          pdf.setFontSize(16);
          pdf.setTextColor(34, 211, 238);
          pdf.text("PRISM Analysis Report", 10, 10);
          
          const imgProps = pdf.getImageProperties(imgData);
          const margin = 10;
          const maxImgWidth = pageWidth - (margin * 2);
          const maxImgHeight = pageHeight - 40; 
          
          let imgWidth = maxImgWidth;
          let imgHeight = (imgProps.height * imgWidth) / imgProps.width;
          if (imgHeight > maxImgHeight) {
              imgHeight = maxImgHeight;
              imgWidth = (imgProps.width * imgHeight) / imgProps.height;
          }
          
          pdf.addImage(imgData, 'PNG', margin, 15, imgWidth, imgHeight);

          // 3. Add Link at Bottom
          if (generatedUrl) {
              const bottomY = pageHeight - 15;
              pdf.setFontSize(10);
              pdf.setTextColor(148, 163, 184); // slate-400
              pdf.text("Open interactive simulation:", 10, bottomY - 5);
              
              pdf.setTextColor(34, 211, 238); // cyan-400
              pdf.textWithLink("Click here to restore this data in PRISM", 10, bottomY, { url: generatedUrl });
              
              if (password) {
                  pdf.setTextColor(248, 113, 113); // red-400
                  pdf.setFontSize(8);
                  pdf.text("(PDF & Link Encrypted)", 80, bottomY);
              } else {
                  pdf.setTextColor(148, 163, 184); // slate-400
                  pdf.setFontSize(8);
                  pdf.text("(Public Link)", 80, bottomY);
              }
          }
          
          pdf.save(`prism-report-${new Date().toISOString().split('T')[0]}.pdf`);
          setShowExportModal(false);
      } catch (err) {
          console.error("Export failed", err);
          setShowExportModal(false);
      }
  };


  // --- AI Analysis Effect ---
  useEffect(() => {
    if (!simulationResult || activeResultsTab !== 'context') return;

    if (analysisCache.current.has(country)) {
        setAiAnalysis(analysisCache.current.get(country)!);
        setAnalysisIsLoading(false);
        setAnalysisError(null);
        return;
    }

    const fetchAnalysis = async () => {
      const median = simulationResult.statistics.median;
      if (median === 0) {
        setAiAnalysis(null);
        setAnalysisError("Cannot generate analysis for a portfolio with zero median value.");
        return;
      }

      setAnalysisIsLoading(true);
      setAnalysisError(null);

      try {
        const { getEconomicAnalysis } = await import('./services/economicAnalysis');
        const result = await getEconomicAnalysis(median, simulationResult.paramsUsed.years, country);
        analysisCache.current.set(country, result);
        setAiAnalysis(result);
      } catch (e) {
        setAnalysisError(e instanceof Error ? e.message : 'An unexpected error occurred.');
        setAiAnalysis(null);
      } finally {
        setAnalysisIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [simulationResult, country, activeResultsTab]);


  // --- Render ---

  // 1. Password Modal (Locked State)
  if (isLocked) {
      return (
          <div className="min-h-screen bg-slate-900 font-sans p-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-slate-900 z-0"></div>
               {/* Background tease */}
               <div className="container mx-auto max-w-7xl relative z-10 opacity-10 blur-sm pointer-events-none">
                   <Header simulations={0} />
               </div>
               <PasswordModal onUnlock={handleUnlock} error={unlockError} />
          </div>
      );
  }

  // 2. Loading State
  if (isInitializing || !params) {
    return (
        <div className="min-h-screen bg-slate-900 font-sans p-4 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400 mx-auto" aria-label="Loading"></div>
                <p className="mt-4 text-slate-400">Initializing PRISM...</p>
            </div>
        </div>
    );
  }

  // 3. Main App
  const renderResultsContent = () => (
    <div ref={resultsRef} className="p-4 md:p-6 bg-slate-800/50 rounded-xl border border-slate-700 h-full relative">
      {/* PDF Summary (Hidden) */}
      <div id="pdf-summary" className="hidden mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-2xl font-bold text-cyan-400">PRISM Configuration</h2>
                <p className="text-slate-400 text-sm mt-1">Initial parameters used for this projection.</p>
            </div>
            <div className="text-right">
                <p className="text-slate-400 text-xs">Total Initial Value</p>
                <p className="text-xl font-bold text-white">{formatCurrency(totalInitialValue)}</p>
            </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6 text-sm border-b border-slate-700 pb-6">
            <div>
                <span className="block text-slate-500 text-xs uppercase tracking-wider">Time Horizon</span>
                <span className="text-slate-200 font-semibold">{params.years} Years</span>
            </div>
            <div>
                 <span className="block text-slate-500 text-xs uppercase tracking-wider">Simulations</span>
                 <span className="text-slate-200 font-semibold">{params.simulations.toLocaleString()}</span>
            </div>
            <div>
                 <span className="block text-slate-500 text-xs uppercase tracking-wider">Inflation</span>
                 <span className="text-slate-200 font-semibold">{(params.inflationRate * 100).toFixed(1)}%</span>
            </div>
            <div>
                 <span className="block text-slate-500 text-xs uppercase tracking-wider">Mode</span>
                 <span className="text-slate-200 font-semibold">
                    {params.stressTestScenarioId
                        ? `Stress: ${params.stressTestScenarioId}`
                        : params.isDynamicMode ? 'Dynamic (Crisis)' : 'Standard'}
                 </span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {params.buckets.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-700/50">
                    <div className="flex items-center">
                         <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: b.color }}></span>
                         <span className="text-slate-200 font-medium">{b.name}</span>
                    </div>
                    <span className="text-slate-200 font-mono">{formatCurrency(b.initialValue)}</span>
                </div>
            ))}
        </div>
      </div>

      {isLoading && <LoadingSkeleton />}
      {error && (
        <div className="text-center text-red-400 mt-8 w-full">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {!isLoading && !error && simulationResult && (
        <div className="w-full flex flex-col gap-8">
            <div className="export-hide border-b border-slate-700 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 pb-0">
                <nav className="flex -mb-px space-x-6 overflow-x-auto max-w-full" aria-label="Tabs">
                    <button
                        onClick={() => setActiveResultsTab('simulation')}
                        className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                        activeResultsTab === 'simulation' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        Simulation Results
                    </button>
                    <button
                        onClick={() => setActiveResultsTab('milestone')}
                        className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                        activeResultsTab === 'milestone' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <TargetIcon className="h-4 w-4" />
                        <span>Milestones</span>
                    </button>
                    <button
                        onClick={() => setActiveResultsTab('fire')}
                        className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                        activeResultsTab === 'fire' ? 'border-orange-400 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <FireIcon className="h-4 w-4" />
                        <span>FIRE</span>
                    </button>
                    <button
                        onClick={() => setActiveResultsTab('context')}
                        className={`py-3 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none flex items-center space-x-2 whitespace-nowrap ${
                        activeResultsTab === 'context' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <GeminiIcon className={`h-4 w-4 transition-all duration-300 ${analysisIsLoading ? 'animate-spin' : ''} ${analysisCache.current.size === 0 ? 'grayscale opacity-60' : ''}`} />
                        <span>AI Analysis</span>
                    </button>
                </nav>
                <div className="flex items-center space-x-4 mb-2 sm:mb-1">
                   <div className="flex items-center space-x-2">
                       <span className={`text-xs font-medium ${!isInflationAdjusted ? 'text-cyan-400' : 'text-slate-500'}`}>Nominal</span>
                       <button
                            onClick={() => setIsInflationAdjusted(!isInflationAdjusted)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${isInflationAdjusted ? 'bg-cyan-600' : 'bg-slate-700'}`}
                       >
                            <span className={`${isInflationAdjusted ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`} />
                       </button>
                       <span className={`text-xs font-medium ${isInflationAdjusted ? 'text-cyan-400' : 'text-slate-500'}`}>Real (Adjusted)</span>
                   </div>
                </div>
            </div>

            {activeResultsTab === 'simulation' && (
            <>
                <SimulationChart
                    data={simulationResult.paths}
                    isInflationAdjusted={isInflationAdjusted}
                    inflationRate={params.inflationRate}
                    comparisonResult={comparisonResult}
                    onToggleComparison={toggleComparison}
                    initialBenchmarkValue={benchmarkInitialValue}
                    initialBenchmarkExcludedValue={benchmarkExcludedValue}
                    stressTestScenarioId={params.stressTestScenarioId}
                    isDynamicMode={params.isDynamicMode}
                    showSPY={showSPY}
                    setShowSPY={setShowSPY}
                    showQQQ={showQQQ}
                    setShowQQQ={setShowQQQ}
                    showRandomPaths={showRandomPaths}
                    setShowRandomPaths={setShowRandomPaths}
                    benchmarkPaths={simulationResult.benchmarkPaths}
                />
                <StatisticsDisplay
                  statistics={simulationResult.statistics}
                  totalSimulations={params.simulations}
                  paths={simulationResult.paths}
                  finalCompositions={simulationResult.finalCompositions}
                  activeBucketNames={simulationResult.activeBucketNames}
                  isInflationAdjusted={isInflationAdjusted}
                  inflationRate={params.inflationRate}
                  years={params.years}
                  bucketColors={bucketColors}
                />
                <div className="flex justify-center pt-8 pb-4 export-hide">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 font-medium py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-lg"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        <span>Download PDF Report</span>
                    </button>
                </div>
            </>
          )}

          {activeResultsTab === 'milestone' && (
              <MilestoneAnalysis
                  paths={simulationResult.paths}
                  years={simulationResult.paramsUsed.years}
                  isInflationAdjusted={isInflationAdjusted}
                  inflationRate={params.inflationRate}
                  totalSimulations={params.simulations}
                  initialTotalValue={totalInitialValue}
                  savedTargetAmount={milestoneTarget}
                  onTargetAmountChange={setMilestoneTarget}
              />
          )}

          {activeResultsTab === 'fire' && (
              <FireAnalysis
                  liquidPaths={simulationResult.liquidPaths}
                  fiSettings={fiSettings}
                  setFiSettings={setFiSettings}
                  isInflationAdjusted={isInflationAdjusted}
                  inflationRate={params.inflationRate}
                  withdrawalReturn={params.withdrawalReturn}
                  years={params.years}
              />
          )}

          {activeResultsTab === 'context' && (
            <EconomicContext
              statistics={simulationResult.statistics}
              years={simulationResult.paramsUsed.years}
              aiAnalysis={aiAnalysis}
              isLoading={analysisIsLoading}
              error={analysisError}
              country={country}
              setCountry={setCountry}
              cachedCountries={Array.from(analysisCache.current.keys())}
              isInflationAdjusted={isInflationAdjusted}
              inflationRate={params.inflationRate}
              withdrawalReturn={params.withdrawalReturn}
            />
          )}

          <div className="export-hide mt-8 pt-4 border-t border-slate-700/50 text-center">
             <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Generated by PRISM</p>
          </div>
        </div>
      )}

      {!isLoading && !error && !simulationResult && (
        <div className="text-center text-slate-500 mt-8 w-full">
          <p className="text-lg">Your portfolio projection will appear here.</p>
          <p>Adjust the settings and run the simulation to begin.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4">
      <div className="container mx-auto max-w-7xl">
        <Header simulations={params.simulations} />
        
        <main className="mt-6">
          <div className="lg:hidden mb-4 border-b border-slate-700">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('params')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                  activeTab === 'params' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Parameters
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                  activeTab === 'results' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Results
              </button>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-1 ${activeTab === 'params' ? 'block' : 'hidden'} lg:block`}>
              <PortfolioInputForm
                params={params}
                setParams={setParams as React.Dispatch<React.SetStateAction<SimulationParams>>}
                excludeIlliquidFromBenchmark={excludeIlliquidFromBenchmark}
                setExcludeIlliquidFromBenchmark={setExcludeIlliquidFromBenchmark}
                isLoading={isLoading}
                progress={progress}
                totalInitialValue={totalInitialValue}
                isAutoRunEnabled={isAutoRunEnabled}
                setIsAutoRunEnabled={setIsAutoRunEnabled}
                onRun={handleManualRun}
              />
              <div className="mt-6 bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-xl space-y-4">
                  <h3 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Device & Data Settings</h3>
                  <div className="space-y-3">
                       {/* Safe Exit Button */}
                       <button
                          onClick={handleSafeExit}
                          disabled={isExitDisabled}
                          className={`relative w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all border group overflow-hidden ${
                              !isExitDisabled
                              ? (isExitProcessing
                                  ? 'bg-red-500/10 border-red-500/20 cursor-default'
                                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 cursor-pointer')
                              : 'bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed'
                          }`}
                      >
                           <div 
                                className={`absolute inset-0 bg-red-600 transition-transform duration-500 ease-out origin-left transform-gpu ${exitState === 'idle' ? 'scale-x-0' : 'scale-x-100'}`} 
                          />
                          <div className="relative z-10 w-full flex items-center justify-between">
                              <span className={`text-sm font-medium transition-colors ${exitState !== 'idle' ? 'text-white' : !isExitDisabled ? 'text-red-400 group-hover:text-red-300' : 'text-slate-500'}`}>
                                  {exitState === 'done' ? 'Safe Exit Complete' : 'Safe Exit'}
                              </span>
                              <TrashIcon className={`h-4 w-4 transition-all ${
                                  exitState !== 'idle' ? 'text-white opacity-100' : 
                                  !isExitDisabled ? 'text-red-400 opacity-70 group-hover:opacity-100' : 'text-slate-600 opacity-50'
                              }`} />
                          </div>
                      </button>
                      <p className="text-xs text-slate-500 px-1">
                        Removes all local data and saved passwords from this browser.
                      </p>
                  </div>
              </div>
            </div>
            <div className={`lg:col-span-2 min-h-[500px] flex flex-col items-start justify-center ${activeTab === 'results' ? 'block' : 'hidden'} lg:block`}>
               {(activeTab === 'results' || isDesktop) && (
                   <div className="w-full shadow-2xl">
                     {renderResultsContent()}
                   </div>
               )}
            </div>
          </div>
        </main>
        
        <div className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                 <h3 className="font-semibold text-slate-200 text-base mb-1 flex items-center gap-2">
                    <LockIcon className="h-4 w-4 text-cyan-400" />
                    Share Your Simulation
                 </h3>
                 <p className="text-sm text-slate-400">Generate a password-protected link containing your complete simulation settings.</p>
            </div>
            <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
                Create Secure Link
            </button>
        </div>
        
        <footer className="text-center mt-8 p-4 text-slate-500 text-sm">
            <p>This is a financial modeling tool. The results are illustrative and not guaranteed.</p>
        </footer>
      </div>
      
      {showShareModal && params && (
          <ShareModal 
            onClose={() => setShowShareModal(false)}
            params={params}
            excludeIlliquid={excludeIlliquidFromBenchmark}
          />
      )}

      {showExportModal && (
          <ExportModal
            onClose={() => setShowExportModal(false)}
            onConfirm={handleExportConfirm}
          />
      )}

      {showExitConfirm && (
        <ConfirmationModal 
            isOpen={showExitConfirm}
            onClose={() => setShowExitConfirm(false)}
            onConfirm={performSafeExit}
            title="Safe Exit"
            message="Are you sure you want to delete all stored data (simulation settings and saved passwords) from this device? The app will reload and reset to defaults."
            confirmLabel="Confirm Safe Exit"
            isDanger={true}
        />
      )}
    </div>
  );
};

export default App;