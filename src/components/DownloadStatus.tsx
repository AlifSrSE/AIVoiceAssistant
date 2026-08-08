import React from 'react';

interface DownloadStatusProps {
  status: string | null;
  link: string | null;
  progress?: number;
}

export const DownloadStatus: React.FC<DownloadStatusProps> = ({ status, link, progress }) => {
  if (!status && !link) return null;

  const isSuccess = status?.includes('successful');
  const isInProgress = status?.includes('Initiating') || status?.includes('Processing');

  return (
    <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${
      isSuccess ? 'bg-indigo-700 bg-opacity-50 text-indigo-100' : isInProgress ? 'bg-yellow-700 bg-opacity-50 text-yellow-100' : 'bg-red-700 bg-opacity-50 text-red-100'
    } shadow-xl border border-gray-600`}>
      {isInProgress && progress !== undefined && (
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-300 mt-1">{progress}%</p>
        </div>
      )}
      {status || 'Processing download...'}
      {link && (
        <div className="mt-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:underline inline-flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Download Video</span>
          </a>
        </div>
      )}
    </div>
  );
};
