import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import PortfolioInputForm from './components/PortfolioInputForm';
import LockIcon from './components/icons/LockIcon'; 
import TrashIcon from './components/icons/TrashIcon';
import { encryptWithPassword, PUBLIC_SECRET, PUBLIC_SALT } from './services/crypto';
import { SimulationParams } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Header from './components/Header';
import { useSimulation } from './hooks/useSimulation';
import PasswordModal from './components/modals/PasswordModal';
import ShareModal from './components/modals/ShareModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ExportModal from './components/modals/ExportModal';
import { useAppPersistence } from './hooks/useAppPersistence';
import ResultsView from './components/ResultsView';

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

  const {
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
  } = useAppPersistence();
  
  // Security State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'params' | 'results'>('params');
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState<boolean>(true);
  
  const hasRunInitial = useRef(false);

  const resultsRef = useRef<HTMLDivElement>(null);

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
            runSimulation(params);
            hasRunInitial.current = true;
        }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [params, runSimulation, isAutoRunEnabled, isLocked]);

  const handleManualRun = useCallback(() => {
      if (!params) return;
      runSimulation(params);
  }, [params, runSimulation]);

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

  // --- Data Management Handlers ---
  const isExitProcessing = exitState !== 'idle';
  const isExitDisabled = isExitProcessing || (!hasSavedPassword && !hasCustomData);

  const handleSafeExit = useCallback(() => {
    if (isExitDisabled) return;
    setShowExitConfirm(true);
  }, [isExitDisabled]);

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
                     <ResultsView
                        simulationResult={simulationResult}
                        isLoading={isLoading}
                        error={error}
                        params={params}
                        totalInitialValue={totalInitialValue}
                        benchmarkInitialValue={benchmarkInitialValue}
                        benchmarkExcludedValue={benchmarkExcludedValue}
                        comparisonResult={comparisonResult}
                        toggleComparison={toggleComparison}
                        onExport={() => setShowExportModal(true)}
                        resultsRef={resultsRef}
                     />
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
