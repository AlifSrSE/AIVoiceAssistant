import React from 'react';

interface EmailStatusProps {
  message: string | null;
}

export const EmailStatus: React.FC<EmailStatusProps> = ({ message }) => {
  if (!message) return null;

  const isSuccess = message.includes('successfully');

  return (
    <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${
      isSuccess ? 'bg-green-700 bg-opacity-50 text-green-100' : 'bg-red-700 bg-opacity-50 text-red-100'
    } shadow-xl border border-gray-600`}>
      {message}
    </div>
  );
};
