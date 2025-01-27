'use client';

import { useChat } from 'ai/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Source_Serif_4 } from 'next/font/google';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { useTavilySearch } from './lib/hooks/useTavilySearch';
import { useTavilyExtract } from './lib/hooks/useTavilyExtract';
import { useOpenPerplexSearch } from './lib/hooks/useOpenPerplexSearch';
import { MessageBubble } from './components/MessageBubble';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});




// Types for different output formats
type OutputType = 'code' | 'writing' | 'equation' | 'markdown';

interface OutputFormat {
  type: OutputType;
  content: string;
  language?: string;
  displayMode?: boolean;
}

// Helper function for code highlighting with fallback
const highlightCode = (code: string, language?: string): string => {
  try {
    // Try Prism.js first
    if (language && Prism.languages[language]) {
      // Add custom token handling for Python
      if (language === 'python') {
        Prism.languages.python = {
          ...Prism.languages.python,
          'keyword': /\b(?:import|from|as|def|class|for|in|enumerate|sorted|list|set|len|if|else|elif|while|return|True|False|None)\b/,
          'builtin': /\b(?:print|range|str|int|float|bool|dict|list|tuple|set)\b/,
          'string': {
            pattern: /(?:[rub]|rb|br)?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/i,
            greedy: true
          },
          'number': /\b0[xX][\dA-Fa-f]+\b|\b\d+\.?\d*(?:[Ee][+-]?\d+)?/,
          'operator': /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not|in|is)\b/,
          'punctuation': /[{}[\];(),.:]/,
          'comment': {
            pattern: /(^|[^\\])#.*$/m,
            lookbehind: true
          }
        };
      }
      return Prism.highlight(code, Prism.languages[language], language);
    }
    // Fallback to highlight.js
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch (e) {
    console.warn('Error highlighting code:', e);
    return code;
  }
};

// Helper function for math rendering with better error handling
const renderMath = (equation: string, displayMode: boolean = false): string => {
  try {
    return katex.renderToString(equation, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
      trust: true,
      macros: {
        '\\RR': '\\mathbb{R}',
        '\\NN': '\\mathbb{N}',
        '\\ZZ': '\\mathbb{Z}',
        '\\PP': '\\mathbb{P}'
      }
    });
  } catch (e) {
    console.warn('Error rendering equation:', e);
    return `<span class="text-red-500">${equation}</span>`;
  }
};

// Utility function to escape HTML for security
const escapeHtml = (content: string): string => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Function to render different types of content
const renderOutput = (output: OutputFormat): string => {
  switch (output.type) {
    case 'code':
      const highlightedCode = highlightCode(output.content, output.language);
      return `
        <div class="relative group/code">
          <div class="absolute top-0 right-0 flex items-center gap-2 px-3 py-1.5">
            ${output.language ?
          `<div class="text-xs text-black/60 font-mono">${output.language}</div>`
          : ''
        }
            <button class="copy-button opacity-0 group-hover/code:opacity-100 transition-opacity" onclick="copyToClipboard('${escapeHtml(output.content.replace(/'/g, "\\'"))}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-black/60 hover:text-black">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
          </div>
          <pre class="bg-gray-50 border border-black/30 rounded-lg overflow-x-auto">
            <code class="language-${output.language || 'plaintext'} font-mono text-sm leading-relaxed block p-4">${highlightedCode}</code>
          </pre>
        </div>`;

    case 'equation':
      return output.displayMode
        ? `<div class="my-6 flex justify-start overflow-x-auto">
            <div class="font-mono text-base min-w-0 bg-gray-50/50 px-4 py-2 rounded-sm">
              ${renderMath(output.content, true)}
            </div>
          </div>`
        : `<span class="font-mono bg-gray-50/30 px-1 rounded-sm">
            ${renderMath(output.content, false)}
          </span>`;

    case 'writing':
      return `<p class="my-4 leading-relaxed">${escapeHtml(output.content)}</p>`;

    case 'markdown':
      return formatMarkdown(output.content);

    default:
      throw new Error('Unsupported output type');
  }
};

// Helper function to format markdown while preserving DeepSeek's formatting
function formatMarkdown(text: string): string {
  if (!text) return '';

  // Pre-process code blocks and equations to prevent interference with other rules
  const blocks: Array<{ type: OutputType; content: string; language?: string; displayMode?: boolean }> = [];
  let processedText = text;

  // Extract code blocks
  processedText = processedText.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = `__CODE_BLOCK_${blocks.length}__`;
    blocks.push({ type: 'code', content: code.trim(), language: lang?.toLowerCase() });
    return id;
  });

  // Extract math blocks
  processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => {
    const id = `__MATH_BLOCK_${blocks.length}__`;
    blocks.push({ type: 'equation', content: equation.trim(), displayMode: true });
    return id;
  });

  processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => {
    const id = `__MATH_INLINE_${blocks.length}__`;
    blocks.push({ type: 'equation', content: equation.trim(), displayMode: false });
    return id;
  });

  let formattedText = processedText
    // Special section headers (e.g., "Math Concepts", "Code (PyTorch)")
    .replace(/^(Math Concepts|Code \([\w.]+\))$/gm,
      `<h2 class="text-[#E6B325] font-bold text-2xl mt-10 mb-6 ${sourceSerif4.className}">$1</h2>`)
    // Major numbered sections (e.g., "1. Core Idea: Self-Attention")
    .replace(/^(\d+)\.\s+(.*?)(?:\n|$)/gm, `<h2 class="text-[#E6B325] font-bold text-xl mt-8 mb-4 ${sourceSerif4.className}">$1. $2</h2>`)
    // Lettered subsections (e.g., "a. Input Embeddings")
    .replace(/^([a-z])\.\s+(.*?)(?:\n|$)/gm, `<h3 class="text-[#E6B325] font-bold mt-6 mb-3 ${sourceSerif4.className}">$1. $2</h3>`)
    // Special terms with colons
    .replace(/^-?\s*(Goal|Mechanism|Example|Query \(Q\)|Key \(K\)|Value \(V\)|Encoder|Decoder|Strengths|Weaknesses|Applications|Objective|Parallelization|Scalability|Notes|Security Considerations|Styling):/gm,
      `<div class="mt-4 mb-2"><span class="text-[#E6B325] font-semibold">$1:</span></div>`)
    // Headers
    .replace(/###\s+(.*?)(?:\n|$)/g, `<h3 class="text-[#E6B325] font-bold mt-6 mb-3 ${sourceSerif4.className}">$1</h3>`)
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, `<strong class="text-[#2C2C2C] font-semibold">$1</strong>`)
    // Italics
    .replace(/\*(.*?)\*/g, `<em class="text-[#302c27] ${sourceSerif4.className}">$1</em>`)
    // Technical terms (highlighted in gold)
    .replace(/\b(self-attention mechanisms|Transformer|masked self-attention|cross-attention|causal masking|masked language modeling|autoregressive generation|TypeScript|JavaScript|Python|React|Next\.js|PyTorch|LLMs|GPT)\b/g,
      `<span class="text-[#E6B325]">$1</span>`)
    // Model names and libraries
    .replace(/\b(GPT-3|PaLM|BERT|Prism\.js|KaTeX|DOMPurify|Highlight\.js|mmarked)\b/g,
      `<span class="text-[#B4924C] font-semibold">$1</span>`)
    // Math variable formatting (e.g., P(y|x))
    .replace(/\b([P])\((.*?)\|(.*?)\)/g,
      `<span class="font-mono">$1($2|$3)</span>`)
    // Links with different colors for different types
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const isReference = url.startsWith('#');
      const isPaper = text.includes('paper') || text.includes('Paper');
      const isLibrary = text.includes('.js') || text.includes('library');
      const colorClass = isReference ? 'text-[#B4924C]' :
        isPaper ? 'text-[#E6B325]' :
          isLibrary ? 'text-[#806743]' :
            'text-[#806743]';
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${colorClass} underline hover:opacity-80 transition-colors">${text}</a>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[#FFF9ED] rounded px-1 py-0.5 text-sm border border-[#F4C430]/30 font-mono">$1</code>')
    // Section breaks
    .replace(/^---\s*$/gm, '<hr class="my-6 border-t border-[#F4C430]/20" />')
    // Paragraphs with better spacing
    .replace(/\n\s*\n/g, '</p><p class="my-4 leading-relaxed">')
    // Single line breaks with better spacing
    .replace(/\n/g, '<br />');

  // Restore code and math blocks
  blocks.forEach((block, index) => {
    const codeBlockId = `__CODE_BLOCK_${index}__`;
    const mathBlockId = `__MATH_BLOCK_${index}__`;
    const mathInlineId = `__MATH_INLINE_${index}__`;

    formattedText = formattedText
      .replace(codeBlockId, renderOutput(block))
      .replace(mathBlockId, renderOutput(block))
      .replace(mathInlineId, renderOutput(block));
  });

  // Wrap in paragraph if not already wrapped
  if (!formattedText.startsWith('<')) {
    formattedText = `<p class="my-4 leading-relaxed">${formattedText}</p>`;
  }

  // Sanitize the HTML output
  return DOMPurify.sanitize(formattedText, {
    ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'mfrac', 'hr', 'p', 'h2', 'h3', 'span', 'div', 'pre', 'code'],
    ADD_ATTR: ['class', 'style', 'target', 'rel']
  });
}

interface MessageContent {
  reasoning?: string;
  answer?: string;
}

function LoadingBubble() {
  return (
    <div className="flex justify-start mb-12">
      <div className="w-[90%] rounded-sm bg-white px-8 py-6 shadow-sm relative before:absolute before:inset-[-2px] before:-z-[1] before:rounded-sm before:bg-black/40 before:blur-md before:animate-pulse after:absolute after:inset-[-4px] after:-z-[2] after:rounded-sm after:bg-black/30 after:blur-xl after:animate-pulse">
        <div className="mb-2 text-sm font-mono uppercase tracking-wide text-black">AGNI</div>
        <div className="flex items-center gap-3 text-black font-mono">
          <span>Thinking</span>
          <span className="flex gap-1">
            {[0, 0.3, 0.6].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-black animate-pulse"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  searchResults?: SearchResult[];
}

// Add getDomain helper
const getDomain = (url: string) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0];
  } catch {
    return '';
  }
};

export default function Home() {
  // Add constant system message
  const systemMessage = {
    role: "system",
    content: "You are a helpful assistant that provides clear, focused responses. For factual questions, you give direct answers with sources. For complex topics, you break down explanations into clear sections. You use simple language and note any uncertainties."
  };

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
  const { extract } = useTavilyExtract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      let contextualizedInput = userMessage;
      let results: SearchResult[] = [];
      let extractedContent = '';

      if (searchEnabled) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: `You are a specialized LLM that refines user queries to maximize search result quality.
              
Your task is to optimize the user's query for the Tavily search API.
The current date is ${new Date().toISOString().split('T')[0]} and the current time is ${new Date().toISOString().split('T')[1].split('.')[0]}. Please use this date and time to get the most up-to-date results.

Consider the chat history for context:
${JSON.stringify(chatHistory)}

Return ONLY a valid JSON object with the following properties:
1. "refinedQuery" (string):
   - A clear and focused search query, optimized for relevance.

2. "searchOptions" (object) with ${searchProvider === 'tavily' ? 'ONLY these valid Tavily parameters:' : 'ONLY these valid OpenPerplex parameters:'}
   ${searchProvider === 'tavily' ? `
   - "searchDepth": "basic" or "advanced" (default "basic")
   - "topic": "general" or "news" (default "general")
   - "days": number (1-30, only used with topic:"news", default 3)
   - "timeRange": "day"/"d", "week"/"w", "month"/"m", "year"/"y"
   - "maxResults": number between 1-10 (default 5)
   - "includeImages": boolean
   - "includeImageDescriptions": boolean
   - "includeAnswer": boolean | "basic" | "advanced"
   - "includeRawContent": boolean
   - "includeDomains": array of domains to include` : `
   - "maxResults": number between 1-10 (default 5)`}

${searchProvider === 'tavily' ? `Always include "twitter.com" and "reddit.com" in "includeDomains" to ensure searches cover those platforms.` : ''}

Additional guidelines based on user intent:
${searchProvider === 'tavily' ? `
- If the user seeks a single fact or definition, keep the query concise and consider providing a more precise or "advanced" answer in "includeAnswer".
- If the user wants the latest news on a topic, set "topic" to "news" and consider increasing "days" and/or broadening the "searchDepth" to "advanced".
- For broad or exploratory questions, lean toward "advanced" search depth and possibly use a wider "timeRange".
- Tailor "maxResults" to the complexity and breadth of the query (1-10).
- For most cases, remember to set "includeDomains": ["twitter.com", "reddit.com"] unless its a very specific question.` : `
- Keep the query concise and focused for best results
- Adjust maxResults based on the complexity of the query (1-10)`}
`
            },
            { role: 'user', content: userMessage }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let jsonString = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          jsonString += new TextDecoder().decode(value);
        }

        // Parse the complete response, handling both raw JSON and JSON within text
        let data;
        try {
          // First try parsing the whole response as JSON
          data = JSON.parse(jsonString);
        } catch {
          // If that fails, try to extract JSON from the text
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No valid JSON found in response');
          data = JSON.parse(jsonMatch[0]);
        }

        // Validate and sanitize search options according to the API specs
        const refinedQuery = data.refinedQuery || userMessage;
        const searchOptions = searchProvider === 'tavily' ? {
          searchDepth: ["basic", "advanced"].includes(data.searchOptions?.searchDepth)
            ? data.searchOptions.searchDepth
            : "advanced",
          maxResults: Math.min(Math.max(1, data.searchOptions?.maxResults || 5), 10),
          includeAnswer: false,
          includeRawContent: true,
          ...(data.searchOptions?.includeImages !== undefined && { includeImages: Boolean(data.searchOptions.includeImages) }),
          ...(data.searchOptions?.includeVideos !== undefined && { includeVideos: Boolean(data.searchOptions.includeVideos) }),
          ...(data.searchOptions?.includeNews !== undefined && { includeNews: Boolean(data.searchOptions.includeNews) }),
          ...(data.searchOptions?.includeRecentResults !== undefined && { includeRecentResults: Boolean(data.searchOptions.includeRecentResults) }),
          ...(Array.isArray(data.searchOptions?.filterSites) && { filterSites: data.searchOptions.filterSites }),
          ...(Array.isArray(data.searchOptions?.excludeSites) && { excludeSites: data.searchOptions.excludeSites })
        } : {
          query: refinedQuery,
          location: 'us',
          pro_mode: false,
          response_language: 'en',
          answer_type: 'text',
          search_type: 'general',
          verbose_mode: false,
          return_sources: true,
          return_images: false,
          return_citations: true,
          recency_filter: 'anytime',
          date_context: new Date().toISOString()
        };

        // SEARCH PHASE
        setIsSearching(true);
        setCurrentSearchResults([]);

        if (searchEnabled) {
          // Add initial search message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'search-results',  // This will show "Searching web..."
            searchResults: []
          }]);

          if (searchProvider === 'tavily') {
            const searchData = await tavilySearch(refinedQuery, searchOptions);
            results = searchData.results || [];
            setCurrentSearchResults(results);

            // Update message with search results or no results message
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                if (results.length > 0) {
                  lastMessage.searchResults = results;
                } else {
                  // Change content type to indicate no results
                  lastMessage.content = 'no-results';
                  lastMessage.searchResults = [];
                }
              }
              return newMessages;
            });

            // EXTRACTION PHASE for Tavily
            setIsExtracting(true);
            if (results.length > 0) {
              const urls = results.sort((a, b) => b.score - a.score).slice(0, 3).map(r => r.url);
              const extractData = await extract(urls);
              if (extractData && extractData.results && extractData.results.length > 0) {
                extractedContent = extractData.results.map(r => r.raw_content).filter(Boolean).join('\n\n');
              }
            }
            setIsExtracting(false);
          } else {
            // OpenPerplex search
            const searchData = await openPerplexSearch(refinedQuery, {
              ...searchOptions,
              return_sources: true,
              return_citations: true
            });

            results = searchData.results || [];
            setCurrentSearchResults(results);

            // Update message with search results
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                if (results.length > 0) {
                  lastMessage.searchResults = results;
                } else {
                  lastMessage.content = 'no-results';
                  lastMessage.searchResults = [];
                }
              }
              return newMessages;
            });

            // For OpenPerplex, we already have the LLM response and don't need extraction
            extractedContent = searchData.llm_response || '';
          }
        }
        setIsSearching(false);

        // Format context for the model with better structure
        contextualizedInput = `Here are the most relevant search results for your question about "${refinedQuery}":

${results && results.length > 0 ? results
            .sort((a, b) => b.score - a.score)
            .map((r, i) => `[${i + 1}] "${r.title}" (Relevance: ${Math.round(r.score * 100)}%) from ${getDomain(r.url)}
${r.content}`)
            .join('\n\n') : 'No search results found.'}

${extractedContent ? (searchProvider === 'tavily' ?
            `Additional extracted content:\n${extractedContent}\n\n` :
            `LLM Response:\n${extractedContent}\n\n`) : ''}

The user asked: "${userMessage}"

Please provide a clear and focused response based on the ${searchProvider} search results above. Follow these guidelines:

1. For simple factual questions:
   - Give the direct answer immediately 
   - Include the source reference as a hyperlink using the URL from result [index]${results && results.length > 0 ? `, e.g. [Click here](${results[0].url})` : ''}
   - Add some context to the answer, but keep it brief and to the point

2. For complex questions requiring explanation:
   - Start with a 1-2 sentence summary of the key point
   - Support main points with relevant source citations as hyperlinks${results && results.length > 0 ? `, e.g. [Source 1](${results[0].url})${results.length > 1 ? `, [Source 2](${results[1].url})` : ''}` : ''}
   - Break down complex topics into clear sections
   - Use bullet points for better readability
   - Keep explanations concise but thorough

3. For current events/news:
   - Lead with the most recent developments
   - Present events chronologically if relevant 
   - Note the date/timeframe for each source (if available) with hyperlinked citations
   - Highlight any conflicting information between sources

4. For all responses:
   - Stay focused on answering the specific question asked
   - Use clear, simple language
   - Note any important limitations or uncertainties
   - Only include relevant information from the sources
   - Format source citations as Markdown hyperlinks using the URLs from the search results
${searchProvider === 'openperplex' ? '\n5. For OpenPerplex responses:\n   - Incorporate the LLM response when relevant\n   - Balance between direct quotes and your own synthesis\n   - Cite sources while maintaining a natural flow' : ''}

Please analyze the search results and provide your response following these guidelines.`;
      }

      // Add thinking message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          searchResults: []
        }
      ]);

      // Send to chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            systemMessage, // Always include system message first
            ...chatHistory.filter(msg => msg.role !== 'system'), // Filter out any other system messages
            { role: 'user', content: contextualizedInput }
          ],
          searchEnabled: false,
          reasoningEnabled
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value);
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = content;
            }
            return newMessages;
          });
        }
      }

      // Update chat history with the new exchange
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: contextualizedInput },
        { role: 'assistant', content }
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error while processing your request. Please try again.',
          searchResults: []
        }
      ]);
    } finally {
      setIsSearching(false);
      setIsExtracting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-screen flex-col items-center justify-between bg-white">
      <div className="flex flex-col min-h-screen w-screen bg-white">
        <div className="flex-1 w-full max-w-3xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
              <h1 className={`text-4xl font-semibold text-[#4A4235] mb-8 ${sourceSerif4.className}`}>
                Ask me anything
              </h1>
              <div className="w-full max-w-2xl animate-fade-in">
                <form onSubmit={handleSubmit}>
                  <div className="relative flex items-center gap-3 bg-white rounded-xl border border-[#4A4235]/15 shadow-sm hover:shadow-md transition-all duration-200 w-full group focus-within:border-[#4A4235]/30 focus-within:shadow-lg">
                    {/* Control Toggles */}
                    <div className="flex items-center gap-1.5 p-3">
                      <div className="flex flex-col gap-2 pr-3 border-r border-[#4A4235]/10 my-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={searchEnabled}
                            onCheckedChange={setSearchEnabled}
                            className="data-[state=checked]:bg-[#4A4235]"
                          />
                          <Label className={`text-sm transition-opacity duration-200 ${searchEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                            Search
                          </Label>
                        </div>
                        {searchEnabled && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={searchProvider === 'openperplex'}
                              onCheckedChange={(checked) => setSearchProvider(checked ? 'openperplex' : 'tavily')}
                              className="data-[state=checked]:bg-[#4A4235]"
                            />
                            <Label className={`text-sm transition-opacity duration-200 ${searchProvider === 'openperplex' ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                              OpenPerplex
                            </Label>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reasoningEnabled}
                            onCheckedChange={setReasoningEnabled}
                            className="data-[state=checked]:bg-[#4A4235]"
                          />
                          <Label className={`text-sm transition-opacity duration-200 ${reasoningEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                            Reasoning
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Input Area */}
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && input.trim() && handleSubmit(e)}
                      placeholder="What's on your mind?"
                      className={`flex-1 min-h-[48px] py-2 px-3 text-[#2C2C2C] ${sourceSerif4.className}
                        bg-white border-none focus:outline-none resize-none text-base
                        leading-relaxed font-mono placeholder:text-[#2C2C2C]/30`}
                      style={{
                        height: '48px',
                        overflow: 'hidden'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = '48px'
                        target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                      }}
                    />

                    {/* Send Button */}
                    <div className="transition-all duration-300 ease-out opacity-0 scale-90 origin-center"
                      style={{
                        opacity: input.trim() ? 1 : 0,
                        transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
                        transitionDuration: input.trim() ? '300ms' : '150ms'
                      }}>
                      <button
                        type="submit"
                        className="mr-3 p-2.5 rounded-xl transition-all text-white bg-[#4A4235] hover:bg-[#4A4235]/90 active:scale-95 shadow-sm"
                      >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  role={message.role}
                  content={message.content}
                  searchResults={message.searchResults}
                  isSearching={message.role === 'assistant' && index === messages.length - 1 && isSearching}
                  isExtracting={message.role === 'assistant' && index === messages.length - 1 && isExtracting}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className={`sticky bottom-0 w-full p-4 bg-white transition-all duration-500 ease-in-out transform ${messages.length > 0
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
            }`}
        >
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-3 bg-white rounded-xl border border-[#4A4235]/15 shadow-sm hover:shadow-md transition-all duration-200 w-full group focus-within:border-[#4A4235]/30 focus-within:shadow-lg">
              {/* Control Toggles */}
              <div className="flex items-center gap-1.5 p-3">
                <div className="flex flex-col gap-2 pr-3 border-r border-[#4A4235]/10 my-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={searchEnabled}
                      onCheckedChange={setSearchEnabled}
                      className="data-[state=checked]:bg-[#4A4235]"
                    />
                    <Label className={`text-sm transition-opacity duration-200 ${searchEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                      Search
                    </Label>
                  </div>
                  {searchEnabled && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={searchProvider === 'openperplex'}
                        onCheckedChange={(checked) => setSearchProvider(checked ? 'openperplex' : 'tavily')}
                        className="data-[state=checked]:bg-[#4A4235]"
                      />
                      <Label className={`text-sm transition-opacity duration-200 ${searchProvider === 'openperplex' ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                        OpenPerplex
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reasoningEnabled}
                      onCheckedChange={setReasoningEnabled}
                      className="data-[state=checked]:bg-[#4A4235]"
                    />
                    <Label className={`text-sm transition-opacity duration-200 ${reasoningEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                      Reasoning
                    </Label>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && input.trim() && handleSubmit(e)}
                placeholder="What's on your mind?"
                className={`flex-1 min-h-[48px] py-2 px-3 text-[#2C2C2C] ${sourceSerif4.className}
                  bg-white border-none focus:outline-none resize-none text-base
                  leading-relaxed font-mono placeholder:text-[#2C2C2C]/30`}
                style={{
                  height: '48px',
                  overflow: 'hidden'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = '48px'
                  target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                }}
              />

              {/* Send Button */}
              <div className="transition-all duration-300 ease-out opacity-0 scale-90 origin-center"
                style={{
                  opacity: input.trim() ? 1 : 0,
                  transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
                  transitionDuration: input.trim() ? '300ms' : '150ms'
                }}>
                <button
                  type="submit"
                  className="mr-3 p-2.5 rounded-xl transition-all text-white bg-[#4A4235] hover:bg-[#4A4235]/90 active:scale-95 shadow-sm"
                >
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div >
    </main >
  );
}
