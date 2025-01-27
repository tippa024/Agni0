import { NextRequest, NextResponse } from "next/server";

interface SearchOptions {
  maxResults?: number;
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
}

export async function POST(req: NextRequest) {
  try {
    const {
      query,
      maxResults = 5,
      location = "us",
      pro_mode = false,
      response_language = "en",
      answer_type = "text",
      search_type = "general",
      verbose_mode = false,
      return_sources = true,
      return_images = false,
      return_citations = true,
      recency_filter = "anytime",
    } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENPERPLEX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenPerplex API key is not configured" },
        { status: 500 }
      );
    }

    // The correct OpenPerplex API endpoint and parameters
    const baseUrl =
      "https://44c57909-d9e2-41cb-9244-9cd4a443cb41.app.bhs.ai.cloud.ovh.net";
    const params = new URLSearchParams({
      query,
      location,
      pro_mode: pro_mode.toString(),
      response_language,
      answer_type,
      search_type,
      verbose_mode: verbose_mode.toString(),
      return_sources: return_sources.toString(),
      return_images: return_images.toString(),
      return_citations: return_citations.toString(),
      recency_filter,
      date_context: new Date().toISOString(),
    });

    const response = await fetch(`${baseUrl}/search?${params}`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenPerplex API error:", errorText);
      throw new Error(`OpenPerplex API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to match our expected format
    const results = [];

    // Add sources if they exist
    if (data.sources && Array.isArray(data.sources)) {
      results.push(
        ...data.sources.map((source: any) => ({
          url: source.url || "",
          title: source.title || source.url || "No title",
          content: source.snippet || source.text || "",
          score: source.relevance_score || 1.0,
          metadata: {
            published_date: source.published_date,
            author: source.author,
            ...source.metadata,
          },
        }))
      );
    }

    return NextResponse.json({
      results,
      llm_response: data.llm_response,
      response_time: data.response_time,
      images: data.images || [],
    });
  } catch (error) {
    console.error("OpenPerplex search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
