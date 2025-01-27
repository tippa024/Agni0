import { useState } from "react";

interface SearchOptions {
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news";
  days?: number;
  includeImages?: boolean;
  maxResults?: number;
}

interface SearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  [key: string]: any;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  [key: string]: any;
}

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialResults: SearchResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and parse as JSON
        const chunk = decoder.decode(value, { stream: true });
        try {
          const data = JSON.parse(chunk);
          if (data.results) {
            partialResults = [...partialResults, ...data.results];
            setResults(partialResults);
            onPartialResults?.(partialResults);
          }
        } catch (e) {
          console.warn("Failed to parse chunk:", e);
        }
      }

      return { results: partialResults };
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
  };
}
