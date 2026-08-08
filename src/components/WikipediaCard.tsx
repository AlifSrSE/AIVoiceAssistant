import React from 'react';
import { WikipediaData } from '../types';

interface WikipediaCardProps {
  data: WikipediaData | null;
}

export const WikipediaCard: React.FC<WikipediaCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-purple-300">
        Wikipedia: {data.title}
      </h2>
      <p className="text-gray-300 text-base leading-relaxed mb-4">
        {data.summary}
      </p>
      {data.full_url && (
        <div className="text-center">
          <a
            href={data.full_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline inline-block text-lg font-medium"
          >
            Read Full Article on Wikipedia
          </a>
        </div>
      )}
    </div>
  );
};
