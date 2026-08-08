import { Todo, WeatherData, NewsArticle, WikipediaData, DictionaryData, YouTubeVideo, MapsResult } from '../types';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getTodos: () => request<Todo[]>('/api/todos'),
  createTodo: (task: string) => request<Todo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ task }),
  }),
  updateTodo: (id: string, data: { task?: string; completed?: boolean }) =>
    request<Todo>(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTodo: (id: string) => request<{ message: string }>(`/api/todos/${id}`, {
    method: 'DELETE',
  }),
  getWeather: (city: string) => request<WeatherData>(`/weather?city=${encodeURIComponent(city)}`),
  getNews: (query?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    return request<{ articles: NewsArticle[] }>(`/news?${params.toString()}`);
  },
  getWikipedia: (query: string) =>
    request<WikipediaData>(`/wikipedia?query=${encodeURIComponent(query)}`),
  getDictionary: (word: string) =>
    request<DictionaryData>(`/dictionary?word=${encodeURIComponent(word)}`),
  searchYouTube: (query: string) =>
    request<{ videos: YouTubeVideo[] }>(`/youtube/search?query=${encodeURIComponent(query)}`),
  downloadYouTube: (url: string) =>
    request<{ message: string; download_link: string; filename: string }>('/youtube/download', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  sendEmail: (recipient: string, subject: string, body: string) =>
    request<{ message: string }>('/send-email', {
      method: 'POST',
      body: JSON.stringify({ recipient_email: recipient, subject, body }),
    }),
  searchMaps: (query: string) =>
    request<{ results: MapsResult[] }>(`/maps/search?query=${encodeURIComponent(query)}`),
};
