import { useState } from "react";

interface ExtractResult {
  url: string;
  raw_content: string;
  status: string;
}

interface ExtractResponse {
  results: ExtractResult[];
  failedResults: { url: string; error: string }[];
}

export function useTavilyExtract() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractResult[]>([]);
  const [failedResults, setFailedResults] = useState<
    { url: string; error: string }[]
  >([]);

  const extract = async (urls: string[]) => {
    if (!urls.length) {
      setError("No URLs provided");
      return;
    }

    if (urls.length > 20) {
      setError("Maximum 20 URLs allowed per request");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const response = await fetch("/api/tavily/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        throw new Error("Extract request failed");
      }

      const data: ExtractResponse = await response.json();
      setResults(data.results);
      setFailedResults(data.failedResults);
      return data;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during extraction"
      );
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extract,
    isExtracting,
    error,
    results,
    failedResults,
  };
}
