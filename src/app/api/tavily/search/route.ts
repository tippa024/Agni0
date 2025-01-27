import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";

// Define error types based on Tavily documentation
class TavilyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TavilyError";
  }
}

class MissingAPIKeyError extends TavilyError {
  constructor() {
    super("API key is missing. Please provide a valid API key.");
  }
}

class InvalidAPIKeyError extends TavilyError {
  constructor() {
    super("Invalid API key provided. Please check your API key.");
  }
}

class UsageLimitExceededError extends TavilyError {
  constructor() {
    super(
      "Usage limit exceeded. Please check your plan's usage limits or consider upgrading."
    );
  }
}

interface SearchParams {
  query: string;
  search_depth?: "basic" | "advanced";
  topic?: "general" | "news";
  days?: number;
  max_results?: number;
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
}

export const runtime = "edge";

export async function POST(req: Request) {
  // Check API key first
  if (!process.env.TAVILY_API_KEY) {
    console.error("Tavily API key not found");
    throw new MissingAPIKeyError();
  }

  try {
    const params: SearchParams = await req.json();

    if (!params.query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Initialize client with API key
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

    console.log("Starting Tavily search with params:", {
      query: params.query,
      search_depth: params.search_depth || "advanced",
      topic: params.topic || "general",
      max_results: params.max_results || 10,
      include_answer: params.include_answer || false,
      include_raw_content: params.include_raw_content || false,
      include_images: params.include_images || false,
    });

    // Create a new TransformStream for streaming the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the search in the background
    const searchPromise = client.search(params.query, {
      searchDepth: params.search_depth || "advanced",
      topic: params.topic || "general",
      maxResults: params.max_results || 10,
      includeAnswer: params.include_answer || false,
      includeRawContent: params.include_raw_content || false,
      includeImages: params.include_images || false,
      includeDomains: [
        // Tech and AI sources
        "openai.com",
        "github.com",
        "arxiv.org",
        "paperswithcode.com",
        "huggingface.co",
        "anthropic.com",
        "deepmind.com",
        // Social media
        "twitter.com",
        "x.com",
        "reddit.com",
        "linkedin.com",
        // News and media
        "reuters.com",
        "bloomberg.com",
        "apnews.com",
        "bbc.com",
        "cnn.com",
        "nytimes.com",
        "wsj.com",
        "theguardian.com",
        "forbes.com",
        "techcrunch.com",
        "wired.com",
        "venturebeat.com",
        // Knowledge bases
        "wikipedia.org",
        "stackoverflow.com",
        "medium.com",
        "towardsdatascience.com",
        "substack.com",
      ],
    });

    // Process search results and stream them
    searchPromise
      .then(async (response) => {
        console.log(
          "Tavily search completed in",
          response.responseTime,
          "seconds"
        );

        // Stream the results in chunks
        const results = response.results || [];
        const chunkSize = 3; // Send 3 results at a time

        for (let i = 0; i < results.length; i += chunkSize) {
          const chunk = results.slice(i, i + chunkSize);
          await writer.write(
            encoder.encode(JSON.stringify({ results: chunk }) + "\n")
          );
          // Add a small delay between chunks to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await writer.close();
      })
      .catch(async (error) => {
        console.error("Tavily search error:", error);
        await writer.write(
          encoder.encode(
            JSON.stringify({
              error: "Search failed",
              details: error instanceof Error ? error.message : String(error),
            }) + "\n"
          )
        );
        await writer.close();
      });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API Error:", error);

    // Handle specific Tavily errors
    if (error instanceof MissingAPIKeyError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof InvalidAPIKeyError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof UsageLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Handle general errors
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
