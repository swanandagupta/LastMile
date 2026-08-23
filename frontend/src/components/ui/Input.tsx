import React, { useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  leftIcon: LeftIcon,
  type = 'text',
  error,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-400">
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {LeftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-slate-500 pointer-events-none">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          type={inputType}
          className={`ops-input w-full ${LeftIcon ? 'pl-9' : 'pl-3'} ${
            isPassword ? 'pr-9' : 'pr-3'
          } ${error ? 'border-[#F87171] focus:border-[#F87171] focus:ring-1 focus:ring-[#F87171]' : ''} ${className}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 flex items-center justify-center text-slate-500 hover:text-slate-300 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-[#F87171]">{error}</p>
      )}
    </div>
  );
};
