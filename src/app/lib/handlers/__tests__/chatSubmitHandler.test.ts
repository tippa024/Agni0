import { handleChatSubmit } from "../chatSubmitHandler";
import { SearchResult } from "@/app/hooks/useSearch";

// Mock event
const mockEvent = {
  preventDefault: jest.fn(),
} as unknown as React.FormEvent;

// Mock state
const mockState = {
  messages: [],
  input: "test query",
  isSearching: false,
  isExtracting: false,
  currentSearchResults: [],
  searchEnabled: true,
  reasoningEnabled: true,
  searchProvider: "tavily" as const,
  chatHistory: [],
};

// Mock actions
const mockActions = {
  setMessages: jest.fn(),
  setInput: jest.fn(),
  setIsSearching: jest.fn(),
  setIsExtracting: jest.fn(),
  setCurrentSearchResults: jest.fn(),
  setChatHistory: jest.fn(),
};

// Mock handlers
const mockHandlers = {
  tavilySearch: jest.fn(),
  openPerplexSearch: jest.fn(),
  extract: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

describe("handleChatSubmit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn().mockImplementation((message, ...args) => {
      console.info("Test Log:", message, ...args);
    });
    console.error = jest.fn().mockImplementation((message, ...args) => {
      console.info("Test Error:", message, ...args);
    });
  });

  it("should handle empty input", async () => {
    const emptyState = { ...mockState, input: "" };
    await handleChatSubmit(mockEvent, emptyState, mockActions, mockHandlers);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setMessages).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "Chat Submit Handler - Starting",
      expect.any(Object)
    );
  });

  it("should handle basic chat flow without search", async () => {
    const noSearchState = { ...mockState, searchEnabled: false };
    const mockResponse = new Response(
      JSON.stringify({ content: "test response" })
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    await handleChatSubmit(mockEvent, noSearchState, mockActions, mockHandlers);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setInput).toHaveBeenCalledWith("");
    expect(mockActions.setMessages).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "Chat Submit Handler - Starting",
      expect.any(Object)
    );
  });

  it("should handle search with Tavily provider", async () => {
    const mockSearchResults: SearchResult[] = [
      {
        title: "Test Result",
        url: "https://test.com",
        content: "Test content",
        score: 0.9,
      },
    ];

    // Mock the query refinement response
    const mockQueryResponse = {
      refinedQuery: "refined test query",
      searchOptions: {
        maxResults: 5,
        searchDepth: "basic",
        includeDomains: ["twitter.com", "reddit.com"],
      },
    };

    // Mock the final chat response
    const mockChatResponse = { content: "test response" };

    // Set up fetch mock to return different responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockQueryResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockChatResponse)));

    // Set up search handler mocks with proper data
    mockHandlers.tavilySearch.mockResolvedValueOnce({
      results: mockSearchResults,
    });
    mockHandlers.extract.mockResolvedValueOnce({
      results: [{ raw_content: "extracted content" }],
    });

    await handleChatSubmit(mockEvent, mockState, mockActions, mockHandlers);

    // Verify initial state updates
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setInput).toHaveBeenCalledWith("");
    expect(mockActions.setMessages).toHaveBeenCalled();

    // Verify search phase
    expect(mockHandlers.tavilySearch).toHaveBeenCalledWith(
      mockQueryResponse.refinedQuery,
      expect.objectContaining(mockQueryResponse.searchOptions)
    );
    expect(mockHandlers.extract).toHaveBeenCalledWith(["https://test.com"]);
    expect(mockActions.setCurrentSearchResults).toHaveBeenCalledWith(
      mockSearchResults
    );

    // Verify logging
    expect(console.log).toHaveBeenCalledWith("Tavily Search - Starting", {
      query: mockQueryResponse.refinedQuery,
      options: mockQueryResponse.searchOptions,
    });
    expect(console.log).toHaveBeenCalledWith("Content Extraction - Starting");

    // Verify chat history updates
    expect(mockActions.setChatHistory).toHaveBeenCalled();
    const updateFunction = mockActions.setChatHistory.mock.calls[0][0];
    const previousHistory: any[] = [];
    const newHistory = updateFunction(previousHistory);

    expect(newHistory).toEqual([
      // Initial user message
      { role: "user", content: "test query" },

      // Search refinement
      { role: "system", content: 'Refined search query: "refined test query"' },

      // Search results summary
      {
        role: "system",
        content:
          'Found 1 relevant results. Top result: "Test Result" (Score: 90%)',
      },

      // Contextualization marker
      {
        role: "system",
        content:
          "Contextualized query with search results and extracted content",
      },

      // Contextualized query
      { role: "user", content: expect.stringContaining("refined test query") },

      // Assistant's response with reasoning flag
      {
        role: "assistant",
        content: expect.any(String),
        reasoning: true,
      },
    ]);

    // Verify final state
    expect(mockActions.setIsSearching).toHaveBeenLastCalledWith(false);
    expect(mockActions.setIsExtracting).toHaveBeenLastCalledWith(false);
  });

  it("should handle search with OpenPerplex provider", async () => {
    const openPerplexState = {
      ...mockState,
      searchProvider: "openperplex" as const,
    };
    const mockSearchResults: SearchResult[] = [
      {
        title: "Test Result",
        url: "https://test.com",
        content: "Test content",
        score: 0.9,
      },
    ];

    // Mock the query refinement response
    const mockQueryResponse = {
      refinedQuery: "refined test query",
      searchOptions: {
        maxResults: 5,
      },
    };

    // Mock the final chat response
    const mockChatResponse = { content: "test response" };

    // Set up fetch mock to return different responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockQueryResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockChatResponse)));

    // Set up search handler mock with proper data
    mockHandlers.openPerplexSearch.mockResolvedValueOnce({
      results: mockSearchResults,
      llm_response: "llm response",
    });

    await handleChatSubmit(
      mockEvent,
      openPerplexState,
      mockActions,
      mockHandlers
    );

    // Verify initial state updates
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setInput).toHaveBeenCalledWith("");
    expect(mockActions.setMessages).toHaveBeenCalled();

    // Verify search phase
    expect(mockHandlers.openPerplexSearch).toHaveBeenCalledWith(
      mockQueryResponse.refinedQuery,
      expect.objectContaining(mockQueryResponse.searchOptions)
    );
    expect(mockActions.setCurrentSearchResults).toHaveBeenCalledWith(
      mockSearchResults
    );

    // Verify logging
    expect(console.log).toHaveBeenCalledWith("OpenPerplex Search - Starting", {
      query: mockQueryResponse.refinedQuery,
      options: mockQueryResponse.searchOptions,
    });

    // Verify chat history updates
    expect(mockActions.setChatHistory).toHaveBeenCalled();
    const updateFunction = mockActions.setChatHistory.mock.calls[0][0];
    const previousHistory: any[] = [];
    const newHistory = updateFunction(previousHistory);

    expect(newHistory).toEqual([
      // Initial user message
      { role: "user", content: "test query" },

      // Search refinement
      { role: "system", content: 'Refined search query: "refined test query"' },

      // Search results summary
      {
        role: "system",
        content:
          'Found 1 relevant results. Top result: "Test Result" (Score: 90%)',
      },

      // Contextualization marker
      {
        role: "system",
        content:
          "Contextualized query with search results and extracted content",
      },

      // Contextualized query
      { role: "user", content: expect.stringContaining("refined test query") },

      // Assistant's response with reasoning flag
      {
        role: "assistant",
        content: expect.any(String),
        reasoning: true,
      },
    ]);

    // Verify final state
    expect(mockActions.setIsSearching).toHaveBeenLastCalledWith(false);
  });

  it("should handle errors gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Test error"));

    await handleChatSubmit(mockEvent, mockState, mockActions, mockHandlers);

    expect(console.error).toHaveBeenCalledWith(
      "Chat Submit Handler - Error:",
      expect.any(Error)
    );
    expect(mockActions.setMessages).toHaveBeenLastCalledWith(
      expect.any(Function)
    );
    expect(mockActions.setIsSearching).toHaveBeenLastCalledWith(false);
    expect(mockActions.setIsExtracting).toHaveBeenLastCalledWith(false);
  });
});
