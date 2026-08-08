import React from 'react';
import { YouTubeVideo } from '../types';

interface YouTubePlayerProps {
  videoId: string | null;
  onClose: () => void;
  results: YouTubeVideo[];
  onPlay: (videoId: string) => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, onClose, results, onPlay }) => {
  return (
    <>
      {videoId && (
        <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8 relative">
          <h2 className="text-2xl font-bold mb-4 text-center text-red-400">Now Playing</h2>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-transform transform hover:scale-110 active:scale-90"
            title="Close Video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
            ></iframe>
          </div>
        </div>
      )}

      {results.length > 0 && !videoId && (
        <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-pink-300">YouTube Search Results</h2>
          <ul className="space-y-4">
            {results.map((video) => (
              <li key={video.id} className="bg-gray-800 p-4 rounded-lg shadow-inner flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-grow text-center md:text-left">
                  <h3 className="text-xl font-semibold text-red-200 mb-1">{video.title}</h3>
                  {video.description && <p className="text-gray-300 text-sm line-clamp-2">{video.description}</p>}
                </div>
                <button
                  onClick={() => onPlay(video.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-transform transform hover:scale-105 active:scale-95 shadow-md flex items-center justify-center space-x-2 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Play</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
