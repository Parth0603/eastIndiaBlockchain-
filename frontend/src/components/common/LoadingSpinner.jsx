import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = null,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
        <svg 
          className="w-full h-full" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {text && (
        <p className={`mt-2 text-sm ${colorClasses[color]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Preset spinner components for common use cases
export const PageLoader = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-64">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export const ButtonSpinner = ({ className = '' }) => (
  <LoadingSpinner 
    size="sm" 
    color="white" 
    className={`inline-block ${className}`} 
  />
);

export const InlineSpinner = ({ text, className = '' }) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <LoadingSpinner size="sm" />
    {text && <span className="text-sm text-gray-600">{text}</span>}
  </div>
);

export default LoadingSpinner;