
import React from 'react';

export const ChartSkeleton: React.FC = () => (
    <div className="w-full animate-pulse">
      <div className="w-full h-[500px] bg-slate-800 p-4 rounded-lg flex flex-col justify-between">
        <div className="h-[80%] w-full bg-slate-700 rounded-md"></div>
        <div className="flex justify-around items-end h-[15%]">
          <div className="flex flex-col items-center space-y-2">
            <div className="h-5 w-24 bg-slate-700 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-700 rounded-md"></div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="h-5 w-24 bg-slate-700 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-700 rounded-md"></div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="h-5 w-24 bg-slate-700 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-700 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
  
  export const StatsSkeleton: React.FC = () => (
    <div className="space-y-8 pt-4 border-t border-slate-700 animate-pulse">
      <div className="text-center space-y-2">
        <div className="h-6 w-1/2 bg-slate-700 rounded-md mx-auto"></div>
        <div className="h-4 w-3/4 bg-slate-700 rounded-md mx-auto"></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-900/50 p-4 rounded-lg space-y-2">
            <div className="h-4 w-1/2 bg-slate-700 rounded-md"></div>
            <div className="h-5 w-3/4 bg-slate-700 rounded-md"></div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="text-center space-y-2">
          <div className="h-5 w-1/3 bg-slate-700 rounded-md mx-auto"></div>
          <div className="h-4 w-1/2 bg-slate-700 rounded-md mx-auto"></div>
        </div>
        <div className="h-8 w-full bg-slate-700 rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-slate-700 mr-2"></div>
                <div className="h-4 flex-grow bg-slate-700 rounded-md"></div>
             </div>
           ))}
        </div>
      </div>
      <div className="text-center mt-8 space-y-2">
        <div className="h-5 w-1/3 bg-slate-700 rounded-md mx-auto"></div>
        <div className="h-4 w-1/2 bg-slate-700 rounded-md mx-auto"></div>
      </div>
      <div className="w-full h-[300px] bg-slate-700 rounded-lg"></div>
    </div>
  );
  
  export const LoadingSkeleton: React.FC = () => {
    return (
      <div className="w-full flex flex-col gap-8">
        <ChartSkeleton />
        <StatsSkeleton />
      </div>
    );
  };
