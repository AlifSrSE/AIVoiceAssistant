import React from 'react';
import { WeatherData } from '../types';

interface WeatherCardProps {
  data: WeatherData | null;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">Weather</h2>
      <div className="text-center">
        <p className="text-4xl font-bold text-white mb-2">{Math.round(data.temperature)}°C</p>
        <p className="text-xl text-gray-200 capitalize">{data.description}</p>
        <p className="text-gray-400 mt-2">{data.city}, {data.country}</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-left">
          <div className="bg-gray-800 p-3 rounded-lg">
            <p className="text-sm text-gray-400">Feels Like</p>
            <p className="text-lg text-white">{Math.round(data.feels_like)}°C</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <p className="text-sm text-gray-400">Humidity</p>
            <p className="text-lg text-white">{data.humidity}%</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg col-span-2">
            <p className="text-sm text-gray-400">Wind Speed</p>
            <p className="text-lg text-white">{Math.round(data.wind_speed)} m/s</p>
          </div>
        </div>
      </div>
    </div>
  );
};
