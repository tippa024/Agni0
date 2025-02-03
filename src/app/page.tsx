'use client';

import { useState, useRef, useEffect } from 'react';
import { Source_Serif_4 } from 'next/font/google';
import { useTavilySearch } from './hooks/useTavilySearch';
import { useTavilyExtract } from './hooks/useTavilyExtract';
import { useOpenPerplexSearch } from './hooks/useOpenPerplexSearch';
import { TavilySearchOptions, OpenPerplexSearchOptions } from './hooks/useSearch';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { handleChatSubmit } from './lib/handlers/chatSubmitHandler';

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

interface SearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: SearchResult[];
}

// Add constant system message
const systemMessage = {
  role: "system",
  content: "You are a helpful assistant that provides clear, focused responses. For factual questions, you give direct answers with sources. For complex topics, you break down explanations into clear sections. You use simple language and note any uncertainties."
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResult[]>([]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState<'tavily' | 'openperplex'>('tavily');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([systemMessage]);

  const { search: tavilySearch } = useTavilySearch();
  const { search: openPerplexSearch } = useOpenPerplexSearch();
  const { extract: rawExtract } = useTavilyExtract();

  // Wrap extract to handle undefined case
  const extract = async (urls: string[]) => {
    const result = await rawExtract(urls);
    return result || { results: [] };
  };

  const onSubmit = async (e: React.FormEvent) => {
    await handleChatSubmit(
      e,
      // State object
      {
        messages,
        input,
        isSearching,
        isExtracting,
        currentSearchResults,
        searchEnabled,
        reasoningEnabled,
        searchProvider,
        chatHistory,
      },
      // Actions object
      {
        setMessages,
        setInput,
        setIsSearching,
        setIsExtracting,
        setCurrentSearchResults,
        setChatHistory,
      },
      // Handlers object
      {
        tavilySearch,
        openPerplexSearch,
        extract,
      }
    );
  };

  // Add ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex min-h-screen w-screen flex-col bg-white">
      {messages.length === 0 ? (
        // Initial centered layout with larger vertical spacing
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-3xl -mt-32"> {/* Negative margin to adjust visual center */}
            <h1 className={`text-4xl font-semibold text-[#4A4235] text-center mb-12 ${sourceSerif4.className}`}>
              Ask me anything
            </h1>
            <div className="transform transition-all duration-300 ease-in-out hover:scale-[1.01]">
              <ChatInput
                input={input}
                searchEnabled={searchEnabled}
                reasoningEnabled={reasoningEnabled}
                searchProvider={searchProvider}
                font={sourceSerif4}
                handleSubmit={onSubmit}
                setInput={setInput}
                setSearchEnabled={setSearchEnabled}
                setReasoningEnabled={setReasoningEnabled}
                setSearchProvider={setSearchProvider}
              />
            </div>
          </div>
        </div>
      ) : (
        // Regular chat layout
        <div className="flex flex-col h-screen">
          <div className="flex-1 w-full max-w-3xl mx-auto px-4 overflow-hidden overflow-wrap-break-word">
            <div className="h-full py-4 overflow-y-auto scrollbar-hide">
              <div className="space-y-4 pb-2">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={index}
                    role={message.role}
                    content={message.content}
                    context={message.context}
                    isSearching={message.role === 'assistant' && index === messages.length - 1 && isSearching}
                    isExtracting={message.role === 'assistant' && index === messages.length - 1 && isExtracting}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 bg-white p-4 sm:pb-6 border-t border-gray-200">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                input={input}
                searchEnabled={searchEnabled}
                reasoningEnabled={reasoningEnabled}
                searchProvider={searchProvider}
                font={sourceSerif4}
                handleSubmit={onSubmit}
                setInput={setInput}
                setSearchEnabled={setSearchEnabled}
                setReasoningEnabled={setReasoningEnabled}
                setSearchProvider={setSearchProvider}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
