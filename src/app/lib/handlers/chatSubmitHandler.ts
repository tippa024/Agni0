// Import types for search functionality
import {
  SearchResult,
  TavilySearchOptions,
  OpenPerplexSearchOptions,
} from "@/app/hooks/useSearch";

// Define the structure of a chat message
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  context?: SearchResult[];
}

// Define the state shape for the chat interface
interface ChatState {
  messages: Message[];
  input: string;
  isSearching: boolean;
  isExtracting: boolean;
  currentSearchResults: SearchResult[];
  searchEnabled: boolean;
  reasoningEnabled: boolean;
  searchProvider: "tavily" | "openperplex";
  chatHistory: { role: string; content: string }[];
}

// Define the actions that can modify the chat state
interface ChatActions {
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInput: (input: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  setIsExtracting: (isExtracting: boolean) => void;
  setCurrentSearchResults: (results: SearchResult[]) => void;
  setChatHistory: (
    history: { role: string; content: string }[] | ((prev: any[]) => any[])
  ) => void;
}

// Define the search-related functions that can be used
interface SearchHandlers {
  tavilySearch: (
    query: string,
    options: TavilySearchOptions
  ) => Promise<{ results: SearchResult[] }>;
  openPerplexSearch: (
    query: string,
    options: OpenPerplexSearchOptions
  ) => Promise<{ results: SearchResult[]; llm_response?: string }>;
  extract: (urls: string[]) => Promise<{ results: { raw_content: string }[] }>;
}

// Helper function to extract domain from URL
function getDomain(url: string) {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.split(".")[0];
  } catch {
    return "";
  }
}

// Default system message for the AI assistant
const systemMessage = {
  role: "system",
  content:
    "You are a helpful assistant that provides clear, focused responses. For factual questions, you give direct answers with sources. For complex topics, you break down explanations into clear sections. You use simple language and note any uncertainties.",
};

// Main function to handle chat form submissions
export async function handleChatSubmit(
  e: React.FormEvent, // 'e' is the parameter name representing the event object, and 'React.FormEvent' is the type annotation indicating that 'e' is a form event in React. A form event is an event that occurs when a user interacts with a form element, such as submitting a form.
  state: ChatState,
  actions: ChatActions,
  handlers: SearchHandlers
) {
  // Log the start of chat submission with relevant details
  console.log("Chat Submit Handler - Starting", {
    input: state.input,
    searchEnabled: state.searchEnabled,
    ...(state.searchEnabled && { searchProvider: state.searchProvider }),
    reasoningEnabled: state.reasoningEnabled,
  });

  // Prevent form default behavior and validate input
  e.preventDefault();
  if (!state.input.trim()) return;

  // Get user message and clear input field
  const userMessage = state.input.trim();
  actions.setInput("");

  // Add user message to chat history
  actions.setMessages((prev) => [
    ...prev,
    { role: "user", content: userMessage },
  ]);

  try {
    let contextualizedInput = userMessage;
    let context = {
      results: [] as SearchResult[],
      extractedContent: "",
      refinedQuery: userMessage,
    };

    // If search is enabled, perform search operations
    if (state.searchEnabled) {
      console.log("Search Phase - Starting", {
        provider: state.searchProvider,
      });
      // Call API to refine the user's query for better search results
      const response = await fetch("/api/chat", {
        method: "POST", // Use the POST method to send data to the server
        headers: { "Content-Type": "application/json" }, // Set the content type to JSON
        body: JSON.stringify({
          // Convert the message object to a JSON string
          // This prompt is designed to refine the user's query and generate search options for either Tavily or OpenPerplex search APIs.
          // It can be further optimized to get a particular behaviour/output, such as prioritizing certain types of information or sources.
          messages: [
            {
              role: "system",
              content: `You are a specialized LLM that refines user queries to maximize search result quality.
                        
Your task is to optimize the user's query for the ${
                state.searchProvider
              } search API.
The current date is ${
                new Date().toISOString().split("T")[0]
              } and the current time is ${
                new Date().toISOString().split("T")[1].split(".")[0]
              }. Please use this date and time to get the most up-to-date results.

Consider the chat history for context:
${JSON.stringify(state.chatHistory)}

Return ONLY a valid JSON object with the following properties:
1. "refinedQuery" (string):
   - A clear and focused search query, optimized for relevance.

2. "searchOptions" (object) with ${
                state.searchProvider === "tavily"
                  ? "ONLY these valid Tavily parameters:"
                  : "ONLY these valid OpenPerplex parameters:"
              }
   ${
     state.searchProvider === "tavily"
       ? `
   - "searchDepth": "basic" or "advanced" (default "basic")
   - "topic": "general" or "news" (default "general")
   - "days": number (1-30, only used with topic:"news", default 3)
   - "timeRange": "day"/"d", "week"/"w", "month"/"m", "year"/"y"
   - "maxResults": number between 1-10 (default 5)
   - "includeImages": boolean
   - "includeImageDescriptions": boolean
   - "includeAnswer": boolean | "basic" | "advanced"
   - "includeRawContent": boolean
   - "includeDomains": array of domains to include`
       : `
   - "maxResults": number between 1-10 (default 5)`
   }

${
  state.searchProvider === "tavily"
    ? `Always include "twitter.com" and "reddit.com" in "includeDomains" to ensure searches cover those platforms.`
    : ""
}`,
            },
            { role: "user", content: userMessage }, // Add the user's message to the messages array
          ],
        }),
      });

      console.log("Query Refinement - Completed");

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Get the response as text first
      const jsonString = await response.text();

      // Clean and parse JSON response with enhanced error handling
      let refinedsearchdata;
      try {
        // First, clean the string by removing any potential prefixes
        const cleanedString = jsonString
          .replace(/^\s*(Answer|Response|Here's the JSON|JSON)?\s*:?\s*/i, "")
          .trim();

        // First attempt: Try parsing the cleaned string directly
        try {
          refinedsearchdata = JSON.parse(cleanedString);
          console.log("Query Refinement - Parsed Data:", refinedsearchdata);
        } catch (parseError) {
          // Second attempt: Try to extract JSON structure if direct parse fails
          console.log(
            "Query Refinement - Direct parse failed, trying JSON extraction"
          );
          const jsonMatch = cleanedString.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No valid JSON structure found in response");
          }
          refinedsearchdata = JSON.parse(jsonMatch[0]);
          console.log(
            "Query Refinement - Extracted JSON Data:",
            refinedsearchdata
          );
        }

        // Validate the parsed data has the required structure
        if (!refinedsearchdata || typeof refinedsearchdata !== "object") {
          throw new Error("Invalid JSON structure");
        }

        // Ensure we have the minimum required fields
        refinedsearchdata = {
          refinedQuery: refinedsearchdata.refinedQuery || userMessage,
          searchOptions: refinedsearchdata.searchOptions || {},
        };
      } catch (error) {
        // Log the error and the problematic response for debugging
        console.error("Query Refinement - Parse Error:", error);
        console.error("Query Refinement - Problematic Response:", jsonString);

        // Fallback to a safe default structure
        refinedsearchdata = {
          refinedQuery: userMessage,
          searchOptions:
            state.searchProvider === "tavily"
              ? {
                  searchDepth: "basic",
                  topic: "general",
                  maxResults: 5,
                  includeAnswer: true,
                  includeDomains: ["twitter.com", "reddit.com"],
                }
              : {
                  maxResults: 5,
                },
        };
        console.log(
          "Query Refinement - Using fallback data:",
          refinedsearchdata
        );
      }

      // Extract the refined query and search options from the parsed data
      context.refinedQuery = refinedsearchdata.refinedQuery || userMessage;
      console.log("Query Refinement - Result", {
        originalQuery: userMessage,
        refinedQuery: context.refinedQuery,
        searchOptions: refinedsearchdata.searchOptions,
      });

      // Start search process
      actions.setIsSearching(true);
      actions.setCurrentSearchResults([]);

      // Add placeholder message for search results
      actions.setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "search-results",
          searchResults: [],
        },
      ]);

      // Handle Tavily search provider
      if (state.searchProvider === "tavily") {
        console.log("Tavily Search - Starting", {
          query: context.refinedQuery,
          options: refinedsearchdata.searchOptions,
        });

        const searchData = await handlers.tavilySearch(
          context.refinedQuery,
          refinedsearchdata.searchOptions
        );
        context.results = searchData.results || [];
        actions.setCurrentSearchResults(context.results);
        console.log("Tavily Search - Completed", {
          resultCount: context.results.length,
        });

        // Check if there are any search results to process
        if (context.results.length > 0) {
          console.log("Content Extraction - Starting");
          // Set the isExtracting flag to true to indicate that content extraction is in progress
          actions.setIsExtracting(true);
          // Extract URLs from the top 3 search results, sorted by score in descending order
          const urls = context.results
            .sort((a, b) => b.score - a.score) // Sort results by score, highest first
            .slice(0, 3) // Take the top 3 results
            .map((r) => r.url); // Map the results to an array of URLs
          // Call the extract handler to fetch content from the extracted URLs
          const extractData = await handlers.extract(urls);
          // Check if extractData is valid and contains results
          if (
            extractData &&
            extractData.results &&
            extractData.results.length > 0
          ) {
            // Extract the raw content from each result, filter out any empty strings, and join them with double newlines
            context.extractedContent = extractData.results
              .map((r) => r.raw_content) // Map results to their raw content
              .filter(Boolean) // Filter out any empty or falsy values
              .join("\n\n"); // Join the content with double newlines
          }
          console.log(
            "Content Extraction - Completed",
            context.extractedContent
          );
          // Set the isExtracting flag to false to indicate that content extraction is complete
          actions.setIsExtracting(false);
        }
      }
      // Handle OpenPerplex search provider
      else {
        console.log("OpenPerplex Search - Starting", {
          query: context.refinedQuery,
          options: refinedsearchdata.searchOptions,
        });

        const searchData = await handlers.openPerplexSearch(
          context.refinedQuery,
          refinedsearchdata.searchOptions
        );
        context.results = searchData.results || [];
        actions.setCurrentSearchResults(context.results);
        context.extractedContent = searchData.llm_response || "";
        console.log("OpenPerplex Search - Completed", {
          resultCount: context.results.length,
        });
      }

      // Update messages with search results
      actions.setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          if (context.results.length > 0) {
            lastMessage.context = context.results;
          } else {
            lastMessage.content = "no-results";
            lastMessage.context = [];
          }
        }
        return newMessages;
      });

      actions.setIsSearching(false);

      // Format search results and extracted content for the AI model
      contextualizedInput = `Here are the most relevant search results for your question about "${
        context.refinedQuery
      }":
${
  context.results && context.results.length > 0
    ? context.results
        .sort((a, b) => b.score - a.score)
        .map(
          (r, i) =>
            `[${i + 1}] "${r.title}" (Relevance: ${Math.round(
              r.score * 100
            )}%) from ${getDomain(r.url)}
${r.content}`
        )
        .join("\n\n")
    : "No search results found."
}

${
  context.extractedContent
    ? state.searchProvider === "tavily"
      ? `Additional extracted content:\n${context.extractedContent}\n\n`
      : `LLM Response:\n${context.extractedContent}\n\n`
    : ""
}

The user asked: "${userMessage}"`;

      // Reset loading states since search is complete
      actions.setIsSearching(false);
      actions.setIsExtracting(false);
    }

    if (state.reasoningEnabled) {
      actions.setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "thinking..." },
      ]);
    } else {
      actions.setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "vomitting..." },
      ]);
    }

    if (state.searchEnabled) {
      console.log("Final Response - Starting");
    } else {
      console.log("Model Response - Starting");
    }

    // Keep reasoning enabled if user has enabled it, regardless of search provider
    const shouldEnableReasoning = state.reasoningEnabled;

    console.log("Final Chat Request Config:", {
      finalPrompt: contextualizedInput,
      reasoningEnabled: shouldEnableReasoning,
      ...(state.searchEnabled && { searchProvider: state.searchProvider }),
      searchEnabled: state.searchEnabled,
    });

    // Send final context to chat API for response
    const finalResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          systemMessage,
          // Filter out system messages and ensure proper interleaving
          ...state.chatHistory
            .filter((msg) => msg.role !== "system")
            .reduce((acc: any[], msg, index, array) => {
              // Add the message
              acc.push(msg);
              // If this is a user message and the next message isn't an assistant message,
              // add a dummy assistant response to maintain alternation
              if (
                msg.role === "user" &&
                index < array.length - 1 &&
                array[index + 1].role !== "assistant"
              ) {
                acc.push({ role: "assistant", content: "Acknowledged." });
              }
              return acc;
            }, []),
          // Add the final contextualized input
          { role: "user", content: contextualizedInput },
        ],
        reasoningEnabled: shouldEnableReasoning,
      }),
    });

    if (!finalResponse.ok) {
      // Log detailed error information
      const errorText = await finalResponse.text();
      console.error("Final Chat API Error Details:", {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        error: errorText,
      });

      // Add an error message to the chat
      actions.setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I encountered an error while processing your request. Please try again.",
        },
      ]);

      // Update chat history to reflect the error
      actions.setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content: "Error: Unable to process request",
        },
      ]);

      throw new Error(
        `Failed to get response (${finalResponse.status}): ${errorText}`
      );
    }

    // Handle streaming response from chat API
    const reader = finalResponse.body?.getReader();
    if (!reader) {
      console.error("No reader available for streaming response");
      throw new Error("No reader available for streaming response");
    }

    const decoder = new TextDecoder();
    let content = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        content += chunk;

        actions.setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content = content;
          }
          return newMessages;
        });
      }
    } catch (streamError) {
      console.error("Stream processing error:", streamError);
      // Update the last message to show the error
      actions.setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content =
            "Error: Failed to process the streaming response. Please try again.";
        }
        return newMessages;
      });
      throw streamError;
    } finally {
      reader.releaseLock();
    }

    // Update chat history with final exchange
    actions.setChatHistory((prev) => {
      const newHistory = [...prev];

      // Always add the initial user message
      newHistory.push({ role: "user", content: userMessage });

      if (state.searchEnabled && context.results) {
        // Add search-related information as a single assistant message
        newHistory.push({
          role: "assistant",
          content: `Search Results Summary:
- Refined query: "${context.refinedQuery}"
- Found ${context.results.length} results
${
  context.results.length > 0
    ? `- Top result: "${context.results[0].title}" (Score: ${Math.round(
        context.results[0].score * 100
      )}%)`
    : "- No relevant results found"
}`,
        });

        // Add the contextualized input as a user message
        newHistory.push({
          role: "user",
          content: contextualizedInput,
        });
      }

      // Add the assistant's final response
      newHistory.push({
        role: "assistant",
        content,
        ...(state.reasoningEnabled && { reasoning: true }),
      });

      return newHistory;
    });

    console.log("Final Response - Completed");
  } catch (error) {
    // Handle any errors during the process
    console.error("Chat Submit Handler - Error:", error);
    // Reset loading states
    actions.setIsSearching(false);
    actions.setIsExtracting(false);
    actions.setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "I apologize, but I encountered an error while processing your request. Please try again.",
        searchResults: [],
      },
    ]);
  }
}
