import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";

// Add interface for Tavily response
interface TavilyResponse {
  results: any[];
  responseTime: number;
}

// Define default search options
const DEFAULT_SEARCH_OPTIONS = {
  searchDepth: "basic" as const,
  maxResults: 5,
  includeAnswer: true,
  includeImages: false,
  includeRawContent: false,
  topic: "general" as const,
};

export const runtime = "edge";

export async function POST(req: Request) {
  // Check API key first
  if (!process.env.TAVILY_API_KEY) {
    console.error("Tavily API key not found");
    return NextResponse.json(
      { error: "API key is missing. Please provide a valid API key." },
      { status: 500 }
    );
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000); // 60 second timeout

  try {
    const { query, options = {} } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Initialize client with API key
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

    console.log("Starting Tavily search with query:", query);
    console.log("Search options received:", options);

    // Merge default options with provided options
    const searchOptions = {
      ...DEFAULT_SEARCH_OPTIONS,
      ...options,
      // Ensure critical options are within bounds
      maxResults: Math.min(
        Math.max(1, options.maxResults || DEFAULT_SEARCH_OPTIONS.maxResults),
        10
      ),
      searchDepth: options.searchDepth || DEFAULT_SEARCH_OPTIONS.searchDepth,
    };

    console.log("Final search options:", searchOptions);

    // Perform the search with optimized parameters
    const response = (await Promise.race([
      client.search(query, searchOptions),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new Error("Search request timed out"))
        );
      }),
    ])) as TavilyResponse;

    console.log("Tavily search completed successfully", {
      responseTime: response.responseTime,
      resultsCount: response.results?.length,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Tavily search error:", error);

    // Handle specific error types
    if (error?.message?.includes("timed out")) {
      return NextResponse.json(
        { error: "Search request timed out. Please try again." },
        { status: 504 }
      );
    }

    if (error?.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
