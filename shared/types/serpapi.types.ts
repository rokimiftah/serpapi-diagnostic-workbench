export interface SerpApiParams {
  engine: string;
  q?: string;
  api_key?: string;
  [key: string]: unknown;
}

export interface SerpApiSearchMetadata {
  id: string;
  status: string;
  json_endpoint: string;
  created_at: string;
  processed_at: string;
  google_url?: string;
  raw_html_file?: string;
  total_time_taken: number;
}

export interface SerpApiError {
  error: string;
}

export interface OrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  favicon?: string;
  source?: string;
  [key: string]: unknown;
}

export interface NewsResult {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  date?: string;
  snippet?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface ShoppingResult {
  position?: number;
  title?: string;
  link?: string;
  price?: string;
  extracted_price?: number;
  source?: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  [key: string]: unknown;
}

export interface TranscriptItem {
  start_ms?: number;
  end_ms?: number;
  snippet?: string;
  start_time_text?: string;
  [key: string]: unknown;
}

export interface SerpApiResponse {
  search_metadata?: SerpApiSearchMetadata;
  search_parameters?: Record<string, unknown>;
  search_information?: {
    total_results?: number;
    time_taken_displayed?: number;
    organic_results_state?: string;
  };
  organic_results?: OrganicResult[];
  news_results?: NewsResult[];
  shopping_results?: ShoppingResult[];
  transcript?: TranscriptItem[];
  web_results?: Record<string, unknown>[];
  error?: string;
  [key: string]: unknown;
}

export type SupportedEngine = "google" | "google_shopping" | "google_news" | "youtube_video_transcript" | "ebay" | "naver";
