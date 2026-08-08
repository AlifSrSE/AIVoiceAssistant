import React from 'react';
import { NewsArticle } from '../types';

interface NewsListProps {
  articles: NewsArticle[];
}

export const NewsList: React.FC<NewsListProps> = ({ articles }) => {
  if (articles.length === 0) return null;

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-cyan-300">Latest News</h2>
      <ul className="space-y-4">
        {articles.map((article, index) => (
          <li key={index} className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-blue-200 mb-1">{article.title}</h3>
            {article.source && <p className="text-sm text-gray-400 mb-2">Source: {article.source}</p>}
            {article.description && <p className="text-gray-300 text-base">{article.description}</p>}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline mt-2 inline-block text-sm"
              >
                Read more
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
