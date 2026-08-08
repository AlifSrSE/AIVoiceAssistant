import React from 'react';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  onVoiceChange: (voiceName: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, onVoiceChange }) => {
  if (voices.length === 0) return null;

  return (
    <div className="mb-6">
      <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
        Select Voice:
      </label>
      <select
        id="voice-select"
        onChange={(e) => onVoiceChange(e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {voices.map((voice) => (
          <option key={voice.name} value={voice.name}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
    </div>
  );
};
