import { useState } from "react";
import {
  TavilySearchOptions as SearchOptions,
  SearchResult,
} from "./useSearch";

export function useTavilySearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const search = async (
    query: string,
    options: SearchOptions = {},
    onPartialResults?: (results: SearchResult[]) => void
  ) => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/tavily/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, options }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      return { results: [] };
    } finally {
      setIsSearching(false);
    }
  };

  return {
    search,
    isSearching,
    error,
    results,
  };
}
