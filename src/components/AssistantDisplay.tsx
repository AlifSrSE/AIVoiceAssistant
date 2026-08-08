import React from 'react';

interface AssistantDisplayProps {
  response: string;
  loading: boolean;
}

export const AssistantDisplay: React.FC<AssistantDisplayProps> = ({ response, loading }) => {
  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-8 shadow-inner border border-gray-700">
      <h1 className="text-3xl font-bold text-center mb-4 text-blue-300">
        AI Voice Assistant
      </h1>
      <div className="text-lg text-center text-gray-200 min-h-[4rem] flex items-center justify-center">
        {loading ? (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        ) : (
          <span>{response || 'Hello! How can I help you today?'}</span>
        )}
      </div>
    </div>
  );
};
