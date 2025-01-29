import { OpenAI } from "openai";
import { StreamingTextResponse } from "ai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Types
interface DeepSeekDelta {
  content?: string;
  reasoning_content?: string;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  id?: string;
}

// OpenAI client setup
const client = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  defaultHeaders: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export const runtime = "nodejs";

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
        let isFirstContent = true;
        let isFirstReasoning = true;
        let isClosed = false;

        try {
          for await (const chunk of response) {
            const delta = chunk.choices?.[0]?.delta as DeepSeekDelta;
            if (!delta) continue;

            if (delta.reasoning_content && reasoningEnabled) {
              console.log("[DeepSeek] Working...");
              if (isFirstReasoning) {
                controller.enqueue(encoder.encode("Reasoning: "));
                isFirstReasoning = false;
              }
              reasoningContent += delta.reasoning_content;
              controller.enqueue(encoder.encode(delta.reasoning_content));
            } else if (delta.content) {
              if (isFirstContent) {
                controller.enqueue(encoder.encode("\n\nAnswer: "));
                isFirstContent = false;
              }
              content += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
          }

          if (reasoningEnabled) {
            console.log(
              "[DeepSeek] Final reasoning content:",
              reasoningContent
            );
            console.log("[DeepSeek] Final answer content:", content);
          }

          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        } catch (error) {
          console.error("[DeepSeek] Stream error:", error);
          if (!isClosed) {
            controller.error(error);
            isClosed = true;
          }
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
