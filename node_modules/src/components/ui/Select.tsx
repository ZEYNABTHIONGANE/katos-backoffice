import React from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helpText,
  className,
  children,
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <select
        className={cn(
          'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400',
          'focus:outline-none focus:ring-primary-500 focus:border-primary-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          error && 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};