import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";

// Create a client with the API key
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      console.warn("Extract request missing valid URLs array");
      return NextResponse.json(
        { error: "Valid URLs array is required" },
        { status: 400 }
      );
    }

    if (urls.length > 20) {
      console.warn("Too many URLs requested:", urls.length);
      return NextResponse.json(
        { error: "Maximum 20 URLs allowed per request" },
        { status: 400 }
      );
    }

    console.log("Starting content extraction for URLs:", urls);
    const response = await tvly.extract(urls);
    console.log(
      "Extraction completed, found results:",
      response.results?.length
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tavily extract error:", error);
    return NextResponse.json(
      {
        error: "Failed to extract content",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
