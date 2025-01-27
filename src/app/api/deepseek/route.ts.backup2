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
    const { messages } = await req.json();
    const cleanMessages = messages.reduce(
      (acc: ChatCompletionMessageParam[], curr: Message) => {
        if (acc.length === 0 || curr.role !== acc[acc.length - 1].role) {
          acc.push({ role: curr.role, content: curr.content });
        }
        return acc;
      },
      []
    );

    const response = await client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: cleanMessages,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let reasoningContent = "";
        let content = "";
        let isFirstContent = true;

        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta as DeepSeekDelta;

            if (delta?.reasoning_content) {
              reasoningContent += delta.reasoning_content;
              controller.enqueue(encoder.encode(delta.reasoning_content));
            } else if (delta?.content) {
              if (isFirstContent) {
                controller.enqueue(encoder.encode("\n\nAnswer: "));
                isFirstContent = false;
              }
              content += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
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
