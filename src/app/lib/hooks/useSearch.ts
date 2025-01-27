import { useState } from "react";
import { useTavilySearch } from "./useTavilySearch";
import { useOpenPerplexSearch } from "./useOpenPerplexSearch";

export interface SearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

interface SearchOptions {
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean | "basic" | "advanced";
  includeRawContent?: boolean;
  includeImages?: boolean;
  includeVideos?: boolean;
  includeNews?: boolean;
  includeRecentResults?: boolean;
  filterSites?: string[];
  excludeSites?: string[];
}

interface OpenPerplexOptions {
  query: string;
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

export function useSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [currentResults, setCurrentResults] = useState<SearchResult[]>([]);
  const { search: tavilySearch } = useTavilySearch();
  const { search: openPerplexSearch } = useOpenPerplexSearch();

  const search = async (
    query: string,
    provider: "tavily" | "openperplex",
    options?: SearchOptions | OpenPerplexOptions
  ) => {
    setIsSearching(true);
    try {
      let results: SearchResult[] = [];

      if (provider === "tavily") {
        const searchData = await tavilySearch(query, options as SearchOptions);
        results = searchData.results || [];
      } else {
        const searchData = await openPerplexSearch(
          query,
          options as OpenPerplexOptions
        );
        results = searchData.results || [];
      }

      setCurrentResults(results);
      return results;
    } catch (error) {
      console.error(`${provider} search failed:`, error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    search,
    isSearching,
    currentResults,
  };
}
