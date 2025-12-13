
import React from 'react';
import InfoIcon from './icons/InfoIcon';

export interface QuickOption {
    label: string;
    value: number;
}

interface InputFieldProps {
    id: string;
    label: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: 'number' | 'range';
    step?: number;
    min?: number;
    max?: number;
    isPercentage?: boolean;
    tooltip?: string;
    format?: (value: number) => string;
    disabled?: boolean;
    quickOptions?: QuickOption[];
}

const InputField: React.FC<InputFieldProps> = ({ 
    id, 
    label, 
    value, 
    onChange, 
    type = 'number', 
    step = 1, 
    min = 0, 
    max, 
    isPercentage = false, 
    tooltip, 
    format, 
    disabled, 
    quickOptions 
}) => (
  <div>
      <label htmlFor={id} className="flex items-center text-sm font-medium text-slate-300 mb-2">
          {label}
          {tooltip && (
              <span className="ml-2 group relative">
                  <InfoIcon />
                  <span className="absolute bottom-full mb-2 w-48 bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      {tooltip}
                  </span>
              </span>
          )}
      </label>
      <div className="flex items-center space-x-2">
          <input
              id={id}
              name={id}
              type={type}
              value={value}
              onChange={onChange}
              step={step}
              min={min}
              max={max}
              className="w-full bg-slate-700 text-white rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
              disabled={disabled}
          />
          <span className="bg-slate-800 text-cyan-400 font-mono text-sm rounded-md px-3 py-2 w-36 text-center">
            {format ? format(value) : (isPercentage ? `${(value * 100).toFixed(1)}%` : (value || 0).toLocaleString())}
          </span>
      </div>
      {quickOptions && (
          <div className="flex flex-wrap gap-2 mt-2">
              {quickOptions.map((option) => (
                  <button
                      key={option.label}
                      type="button"
                      onClick={() => onChange({ target: { name: id, value: option.value.toString() } } as any)}
                      disabled={disabled}
                      className="text-xs bg-slate-700 hover:bg-slate-600 hover:text-cyan-400 text-slate-400 border border-slate-600 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {option.label}
                  </button>
              ))}
          </div>
      )}
  </div>
);

export default InputField;
