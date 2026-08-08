import React from 'react';
import { DictionaryData } from '../types';

interface DictionaryCardProps {
  data: DictionaryData | null;
}

export const DictionaryCard: React.FC<DictionaryCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-indigo-300">
        {data.original_word}
        {data.corrected_word && (
          <span className="text-sm text-gray-400 block mt-1">
            (Did you mean: {data.corrected_word}?)
          </span>
        )}
      </h2>
      {data.definitions.map((defGroup, defIndex) => (
        <div key={defIndex} className="mb-4 last:mb-0">
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            {defGroup.part_of_speech}:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
            {defGroup.meanings.map((meaning, meaningIndex) => (
              <li key={meaningIndex}>{meaning}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
