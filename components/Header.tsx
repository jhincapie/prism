import React from 'react';

interface HeaderProps {
  simulations: number;
}

const Header: React.FC<HeaderProps> = ({ simulations }) => (
  <header className="p-4 md:p-8 relative flex flex-col items-center">
    <div className="text-center max-w-4xl mx-auto w-full">
      <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 tracking-tighter drop-shadow-sm select-none">
        PRISM
      </h1>
      <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full mx-auto my-4 opacity-50"></div>
      
      <p className="text-lg font-medium text-slate-300 tracking-wide uppercase text-xs mb-3">
        The Economic Outlook Simulator
      </p>

      <p className="text-slate-400 leading-relaxed text-sm max-w-2xl mx-auto">
        Refract your financial present into <span className="text-cyan-400 font-mono font-bold">{simulations.toLocaleString()}</span> possible futures. 
        Visualize volatility, stress-test against history, and find the signal in the noise.
      </p>
    </div>
    
    <div className="mt-6 lg:mt-0 lg:absolute lg:top-8 lg:right-8 text-center lg:text-right text-xs text-slate-600 flex flex-col gap-0.5 z-10">
        <p className="font-semibold text-slate-500">Juan David Hincapie Ramos</p>
        <a href="mailto:jhincapie@gmail.com" className="hover:text-cyan-400 transition-colors">jhincapie@gmail.com</a>
        <a href="https://x.com/jhincapie" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">x.com/jhincapie</a>
    </div>
  </header>
);

export default Header;