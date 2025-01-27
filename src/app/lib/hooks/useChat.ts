import { useState } from "react";
import { useSearch, SearchResult } from "./useSearch";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  searchResults?: SearchResult[];
}

interface ChatOptions {
  searchEnabled: boolean;
  reasoningEnabled: boolean;
  searchProvider: "tavily" | "openperplex";
}

export function useCustomChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { search, isSearching } = useSearch();

  const systemMessage = {
    role: "system" as const,
    content:
      "You are a helpful assistant that provides clear, focused responses. For factual questions, you give direct answers with sources. For complex topics, you break down explanations into clear sections. You use simple language and note any uncertainties and you always minimize your response to minimium words",
  };

  const sendMessage = async (userMessage: string, options: ChatOptions) => {
    if (!userMessage.trim()) return;

    setIsLoading(true);

    try {
      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      let contextualizedInput = userMessage;
      let searchResults: SearchResult[] = [];

      // Perform search if enabled
      if (options.searchEnabled) {
        try {
          searchResults = await search(userMessage, options.searchProvider);

          // Add search results message
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                searchResults.length > 0 ? "search-results" : "no-results",
              searchResults,
            },
          ]);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }

      // Send to chat endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            systemMessage,
            { role: "user", content: contextualizedInput },
          ],
          searchEnabled: false,
          reasoningEnabled: options.reasoningEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (reader) {
        // Add initial assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            searchResults: [],
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          content += decoder.decode(value);

          // Update the last message with new content
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = content;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I encountered an error while processing your request. Please try again.",
          searchResults: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    isSearching,
    sendMessage,
  };
}
