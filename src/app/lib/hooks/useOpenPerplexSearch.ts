import { useState } from "react";

interface SearchOptions {
  query?: string;
  location?: string;
  pro_mode?: boolean;
  response_language?: string;
  answer_type?: string;
  search_type?: string;
  verbose_mode?: boolean;
  return_sources?: boolean;
  return_images?: boolean;
  return_citations?: boolean;
  recency_filter?: string;
  date_context?: string;
}

interface SearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  metadata?: {
    published_date?: string;
    author?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface SearchResponse {
  results: SearchResult[];
  llm_response?: string;
  response_time?: number;
  images?: any[];
  error?: string;
}

export function useOpenPerplexSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [llmResponse, setLlmResponse] = useState<string>("");
  const [images, setImages] = useState<any[]>([]);

  const search = async (
    query: string,
    options: SearchOptions = {},
    onPartialResults?: (results: SearchResult[]) => void
  ): Promise<SearchResponse> => {
    setIsSearching(true);
    setError(null);
    setResults([]);
    setLlmResponse("");
    setImages([]);

    try {
      const response = await fetch("/api/openperplex/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `Search request failed: ${response.status}`
        );
      }

      const data: SearchResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setLlmResponse(data.llm_response || "");
      setImages(data.images || []);
      onPartialResults?.(data.results || []);

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An error occurred during search";
      setError(message);
      throw err;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    search,
    isSearching,
    error,
    results,
    llmResponse,
    images,
  };
}
