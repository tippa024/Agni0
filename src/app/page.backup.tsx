'use client';

import { useChat } from 'ai/react';
import { useState, useEffect, useRef } from 'react';
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

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

// Add copyToClipboard to window object for onclick handlers
declare global {
  interface Window {
    copyToClipboard: (text: string) => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a visual feedback here if needed
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };
}

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
          `<div class="text-xs text-[#806743]/60 font-mono">${output.language}</div>`
          : ''
        }
            <button class="copy-button opacity-0 group-hover/code:opacity-100 transition-opacity" onclick="copyToClipboard('${escapeHtml(output.content.replace(/'/g, "\\'"))}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-[#806743]/60 hover:text-[#806743]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
          </div>
          <pre class="bg-[#FFF9ED] border border-[#F4C430]/30 rounded-lg overflow-x-auto">
            <code class="language-${output.language || 'plaintext'} font-mono text-sm leading-relaxed block p-4">${highlightedCode}</code>
          </pre>
        </div>
      `;
    case 'equation':
      return output.displayMode
        ? `<div class="my-6 flex justify-start overflow-x-auto">
            <div class="font-mono text-base min-w-0 bg-[#FFF9ED]/50 px-4 py-2 rounded-sm">
              ${renderMath(output.content, true)}
            </div>
          </div>`
        : `<span class="font-mono bg-[#FFF9ED]/30 px-1 rounded-sm">
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
    .replace(/\*\*(.*?)\*\*/g, `<strong class="text-[#E6B325] ${sourceSerif4.className}">$1</strong>`)
    // Italics
    .replace(/\*(.*?)\*/g, `<em class="text-[#806743] ${sourceSerif4.className}">$1</em>`)
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

function MessageBubble({ role, content }: { role: string; content: string }) {
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);
  const [messageContent, setMessageContent] = useState<MessageContent>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // Parse streaming content
  useEffect(() => {
    if (!role.includes('user') && content) {
      try {
        const parts = content.split(/\n\nAnswer:\s*/i);
        const reasoning = parts[0].replace(/^Reasoning:\s*/i, '').trim();
        const answer = parts[1] || '';
        setIsStreaming(!answer);
        setMessageContent({
          reasoning: reasoning || undefined,
          answer: answer || undefined
        });
        setWordCount(reasoning?.split(/\s+/).length || 0);
      } catch (error) {
        console.error('Error parsing content:', error);
      }
    }
  }, [content, role]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-12`}>
      <div
        className={`w-[90%] rounded-sm px-8 py-6 relative group/message ${role === 'user'
          ? 'bg-[#ffffff] text-[#16120c]'
          : `bg-white text-[#16120c] border-2 ${isStreaming ? 'border-[#F4C430]/30 shadow-[0_0_4px_rgba(244,196,48,0.1)]' : 'border-white'
          }`
          }`}
      >
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 opacity-0 group-hover/message:opacity-100 transition-all duration-200 flex items-center gap-1.5 text-xs text-[#806743]/60 hover:text-[#806743]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-3.5 h-3.5 stroke-2"
          >
            {isCopied ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            )}
          </svg>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            {isCopied ? 'Copied!' : 'Copy'}
          </span>
        </button>
        <div
          className={`mb-3 text-sm font-mono uppercase tracking-wide ${role === 'user' ? 'text-[#B4924C] font-bold' : 'text-[#B4924C]'
            }`}
        >
          {role === 'user' ? 'You' : 'AGNI'}
        </div>
        <div className="prose prose-sm max-w-none">
          {!role.includes('user') ? (
            <>
              {messageContent.reasoning && (
                <div className="mb-4">
                  <div
                    className="cursor-pointer select-none"
                    onClick={() => setIsReasoningCollapsed(!isReasoningCollapsed)}
                  >
                    <div className="flex items-center gap-2 text-[#B4924C] font-mono text-sm mb-2">
                      <span className="inline-flex items-center justify-center w-4 transition-transform duration-200" style={{ transform: isReasoningCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                      <span>Thinking</span>
                      <span className="text-xs bg-[#FFFAF0] px-2 py-0.5 rounded-sm">
                        {wordCount} words
                      </span>
                    </div>
                  </div>
                  {!isReasoningCollapsed && (
                    <div className="mt-4 text-[#4a4235] font-mono text-sm pl-4 border-l-2 border-[#F4C430]">
                      <div
                        className="space-y-2 leading-[25px] whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(messageContent.reasoning) }}
                      />
                    </div>
                  )}
                </div>
              )}
              {messageContent.answer && (
                <div className="space-y-4">
                  <div className="h-px bg-[#F4C430]" />
                  <div
                    className={`${sourceSerif4.className} text-lg leading-[25px] text-[#16120c]`}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(messageContent.answer) }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className={`${sourceSerif4.className} text-lg leading-[25px] text-[#16120c]`}>{content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start mb-12">
      <div className="w-[90%] rounded-sm bg-white px-8 py-6 shadow-sm relative before:absolute before:inset-[-2px] before:-z-[1] before:rounded-sm before:bg-[#F4C430]/40 before:blur-md before:animate-pulse after:absolute after:inset-[-4px] after:-z-[2] after:rounded-sm after:bg-[#B4924C]/30 after:blur-xl after:animate-pulse">
        <div className="mb-2 text-sm font-mono uppercase tracking-wide text-[#B4924C]">AGNI</div>
        <div className="flex items-center gap-3 text-[#B4924C] font-mono">
          <span>Thinking</span>
          <span className="flex gap-1">
            {[0, 0.3, 0.6].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-[#F4C430] animate-pulse"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    onError: (error) => console.error('Chat error:', error),
    onResponse: (response) => {
      if (!response.ok) {
        console.error('Response error:', response.status, response.statusText);
      }
    },
    onFinish: () => console.log('Chat finished')
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await handleSubmit(e);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  // Check if we're in the initial loading state (no messages yet)
  const showLoading = isLoading && messages.length === 0;

  return (
    <main className="flex h-screen flex-col bg-white overflow-hidden">
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#F4C430]/20 scrollbar-track-transparent">
          <div className="mx-auto max-w-4xl px-4 py-12">
            <div className="space-y-2">
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
              ))}
              {showLoading && <LoadingBubble />}
            </div>

            {error && (
              <div className="mx-auto mt-6 max-w-2xl rounded-sm bg-white p-4 shadow-sm relative before:absolute before:inset-0 before:-z-[1] before:rounded-sm before:bg-red-100/50 before:blur-sm">
                <div className="font-mono text-red-600 font-bold mb-1">Error</div>
                <div className="font-mono text-red-600">{error.message}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`bg-white ${messages.length === 0 ? 'flex-1 flex items-center' : 'border-t border-[#F4C430]/10'} p-8`}>
        <div className="mx-auto max-w-4xl w-full">
          {messages.length === 0 && (
            <div className="text-center mb-8">
              <h1 className="mb-3 text-4xl font-mono uppercase tracking-widest text-[#B4924C] relative before:absolute before:inset-[-8px] before:-z-[1] before:rounded-sm before:bg-[#FFE5B4]/30 before:blur-lg">AGNI</h1>
            </div>
          )}
          <form onSubmit={onSubmit} className="flex justify-center">
            <div className="w-full max-w-3xl">
              <div className="relative flex items-center rounded-sm border border-[#F4C430]/20 bg-white shadow-sm focus-within:border-[#F4C430] focus-within:ring-2 focus-within:ring-[#FFE5B4]/50">
                <textarea
                  value={input}
                  onChange={(e) => {
                    handleInputChange(e);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Ask me anything..."
                  rows={1}
                  className={`w-full px-6 py-3 text-[#806743] ${sourceSerif4.className} bg-transparent focus:outline-none placeholder:text-[#806743]/60 placeholder:${sourceSerif4.className} resize-none overflow-hidden min-h-[46px] max-h-[200px] leading-relaxed pr-24`}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) {
                        onSubmit(e);
                      }
                    }
                  }}
                />
                <div className={`absolute right-2 transition-all duration-200 ${!input.trim() ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`rounded-sm px-4 h-[38px] text-[#806743] ${sourceSerif4.className} bg-[#F4C430]/5 transition-all hover:bg-[#F4C430]/10 disabled:opacity-0 disabled:cursor-not-allowed text-sm`}
                  >
                    Fire
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
