import React from 'react';

const GeminiIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={className}
        fill="url(#gemini-gradient)"
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9b59b6" />
                <stop offset="100%" stopColor="#3498db" />
            </linearGradient>
        </defs>
        <path d="M50,0 C65,35 65,35 100,50 C65,65 65,65 50,100 C35,65 35,65 0,50 C35,35 35,35 50,0 Z" />
    </svg>
);

export default GeminiIcon;
