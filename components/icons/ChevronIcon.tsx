
import React from 'react';

interface ChevronIconProps {
  isExpanded: boolean;
}

const ChevronIcon: React.FC<ChevronIconProps> = ({ isExpanded }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={`h-5 w-5 text-slate-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default ChevronIcon;