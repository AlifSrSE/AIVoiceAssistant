import React from 'react';
import { MapsResult } from '../types';

interface MapsResultsProps {
  results: MapsResult[];
}

export const MapsResults: React.FC<MapsResultsProps> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">Map Search Results</h2>
      <ul className="space-y-4">
        {results.map((place, index) => (
          <li key={index} className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-yellow-200 mb-1">{place.name}</h3>
            {place.address && <p className="text-sm text-gray-400 mb-2">{place.address}</p>}
            {place.rating && (
              <p className="text-gray-300 text-base">
                Rating: {place.rating} ({place.user_ratings_total} reviews)
              </p>
            )}
            {place.map_url && (
              <a
                href={place.map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline mt-2 inline-block text-sm"
              >
                View on Google Maps
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
