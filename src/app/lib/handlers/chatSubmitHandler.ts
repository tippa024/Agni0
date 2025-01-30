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
    searchProvider: state.searchProvider,
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

      // The `response.body` from the fetch API is a ReadableStream, which allows us to read data in chunks as it arrives, rather than waiting for the entire response to download.
      // This is particularly useful for streaming responses from APIs, like in this case where we are getting a stream of text from the DeepSeek API.
      // `getReader()` creates a reader that can be used to read the stream.
      const reader = response.body?.getReader();
      // If the reader is not available, it means there is no stream to read from, so we throw an error.
      if (!reader) throw new Error("No reader available");

      // Initialize an empty string to store the JSON response as it arrives.
      // Get the full response text
      const jsonString = await response.text();

      // Parse JSON response with fallback for malformed JSON
      let refinedsearchdata;
      try {
        // Attempt to parse the JSON string
        refinedsearchdata = JSON.parse(jsonString);
        console.log("Query Refinement - Parsed Data:", refinedsearchdata);
      } catch (error) {
        // If parsing fails, log the error and attempt to extract JSON using regex
        console.error("Query Refinement - Parse Error:", error);
        // Regex to match a JSON object
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        // If no JSON is found, throw an error
        if (!jsonMatch) throw new Error("No valid JSON found in response");
        // Parse the extracted JSON
        refinedsearchdata = JSON.parse(jsonMatch[0]);
        console.log(
          "Query Refinement - Fallback Parse Data:",
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
    // Send final context to chat API for response
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          systemMessage,
          ...state.chatHistory.filter((msg) => msg.role !== "system"),
          { role: "user", content: contextualizedInput },
        ],
        reasoningEnabled: state.reasoningEnabled,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get response");
    }

    // Handle streaming response from chat API
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value);

        actions.setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content = content;
          }
          return newMessages;
        });
      }
    }

    // Update chat history with final exchange
    actions.setChatHistory((prev) => {
      const newHistory = [...prev];

      // Always add the initial user message
      newHistory.push({ role: "user", content: userMessage });

      if (state.searchEnabled && context.results) {
        // Add the refined query as a system message
        newHistory.push({
          role: "system",
          content: `Refined search query: "${context.refinedQuery}"`,
        });

        // Add search results summary as a system message
        if (context.results.length > 0) {
          newHistory.push({
            role: "system",
            content: `Found ${
              context.results.length
            } relevant results. Top result: "${
              context.results[0].title
            }" (Score: ${Math.round(context.results[0].score * 100)}%)`,
          });
        } else {
          newHistory.push({
            role: "system",
            content: "No search results found.",
          });
        }

        // Add the contextualized input as a system message
        newHistory.push({
          role: "system",
          content: `Contextualized query with search results and extracted content`,
        });

        // Add the full contextualized input as a user message
        newHistory.push({
          role: "user",
          content: contextualizedInput,
        });
      }

      // Add the assistant's response
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
