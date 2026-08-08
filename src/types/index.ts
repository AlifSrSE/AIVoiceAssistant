export interface Todo {
  id: string;
  task: string;
  completed: boolean;
  createdAt: string;
}

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  wind_speed: number;
  icon: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
}

export interface WikipediaData {
  title: string;
  summary: string;
  full_url: string;
}

export interface DictionaryDefinition {
  part_of_speech: string;
  meanings: string[];
}

export interface DictionaryData {
  original_word: string;
  corrected_word: string | null;
  definitions: DictionaryDefinition[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
}

export interface MapsResult {
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  map_url: string;
}
