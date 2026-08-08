import React from 'react';

interface VoiceControlProps {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  supported: boolean;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ listening, onStart, onStop, supported }) => {
  if (!supported) {
    return (
      <div className="text-center text-red-400 mb-4">
        Speech Recognition is not supported in this browser.
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-6">
      <button
        onClick={listening ? onStop : onStart}
        className={`px-8 py-3 rounded-full font-semibold text-white transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95 ${
          listening
            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {listening ? 'Stop Listening' : 'Start Voice Command'}
      </button>
    </div>
  );
};
