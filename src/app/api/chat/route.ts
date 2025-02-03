import { OpenAI } from "openai";
import { StreamingTextResponse } from "ai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Types
interface DeepSeekDelta {
  content?: string;
  reasoning_content?: string;
}

// client setup
const client = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  defaultHeaders: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export const runtime = "edge";

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "DeepSeek API key not configured",
        details: "Please set the DEEPSEEK_API_KEY environment variable",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, reasoningEnabled } = await req.json();

    console.log("[DeepSeek] Reasoning enabled:", reasoningEnabled);

    // Create chat completion with proper reasoning parameters
    const response = (await client.chat.completions.create({
      model: reasoningEnabled ? "deepseek-reasoner" : "deepseek-chat",
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
      ...(reasoningEnabled && {
        reasoning: true,
        show_reasoning: true,
        temperature: 0.7,
      }),
    })) as any;

    console.log(
      "[DeepSeek] Using model:",
      reasoningEnabled ? "deepseek-reasoner" : "deepseek-chat"
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let reasoningContent = "";
        let content = "";
        let currentPhase = ""; // Track which type of content we're currently processing

        try {
          for await (const chunk of response) {
            const delta = chunk.choices?.[0]?.delta as DeepSeekDelta;
            if (!delta) continue;

            // Handle reasoning content
            if (delta.reasoning_content && reasoningEnabled) {
              // If we were previously in content phase, add a separator
              if (currentPhase === "content") {
                controller.enqueue(encoder.encode("\n\n"));
              }
              // If this is the first reasoning content
              if (currentPhase !== "reasoning") {
                controller.enqueue(encoder.encode("Reasoning:\n"));
                currentPhase = "reasoning";
              }
              reasoningContent += delta.reasoning_content;
              controller.enqueue(encoder.encode(delta.reasoning_content));
            }

            // Handle main content
            if (delta.content) {
              // If we were previously in reasoning phase, add a separator
              if (currentPhase === "reasoning") {
                controller.enqueue(encoder.encode("\n\nAnswer:\n"));
              }
              // If this is the first content
              if (currentPhase !== "content") {
                currentPhase = "content";
              }
              content += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
          }

          // Log final content for debugging
          if (reasoningEnabled) {
            console.log("[DeepSeek] Stream completed", {
              hasReasoningContent: reasoningContent.length > 0,
              hasMainContent: content.length > 0,
              finalPhase: currentPhase,
            });
          }

          controller.close();
        } catch (error) {
          console.error("[DeepSeek] Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get response from DeepSeek",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
