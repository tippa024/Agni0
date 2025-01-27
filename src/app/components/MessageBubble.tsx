import { useState, useEffect, useRef, FC } from 'react';
import { Source_Serif_4 } from 'next/font/google';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import hljs from 'highlight.js';
import katex from 'katex';

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

interface MessageBubbleProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    searchResults?: SearchResult[];
    isSearching?: boolean;
    isExtracting?: boolean;
    formattedContent?: string;
}


// Helper function for code highlighting with fallback
const highlightCode = (code: string, language?: string): string => {
    try {
        // Try Prism.js first
        if (language && Prism.languages[language]) {
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

// Helper function for math rendering
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

export function MessageBubble({ role, content, searchResults = [], isSearching, isExtracting }: MessageBubbleProps) {
    const [showAllSources, setShowAllSources] = useState(false);
    const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);
    const [messageContent, setMessageContent] = useState<{ reasoning?: string; answer?: string }>({});
    const [wordCount, setWordCount] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const isAssistant = role === 'assistant';

    // Get domain from URL
    const getDomain = (url: string) => {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain.split('.')[0];
        } catch {
            return '';
        }
    };

    // Parse content sections
    useEffect(() => {
        if (isAssistant && content && content !== 'search-results') {
            try {
                const parts = content.split(/\n\nAnswer:\s*/i);
                const reasoning = parts[0].replace(/^Reasoning:\s*/i, '').trim();
                const answer = parts[1] || '';

                // Format both reasoning and answer sections
                const formattedReasoning = formatDeepSeekOutput(reasoning);
                const formattedAnswer = formatDeepSeekOutput(answer);

                setMessageContent({
                    reasoning: formattedReasoning,
                    answer: formattedAnswer
                });
                setWordCount(reasoning.split(/\s+/).length || 0);
            } catch (error) {
                console.error('Error formatting content:', error);
            }
        }
    }, [content, isAssistant]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    // User message
    if (!isAssistant) {
        return (
            <div className="flex justify-end mb-4">
                <div className="max-w-2xl px-4 py-2">
                    {/*}   <div className={`mb-1 text-xs ${sourceSerif4.className} text-[#2C2C2C]/70 text-right`}>Mavanudu</div> 
                    <div className="w-full h-px bg-[#2C2C2C]/10 my-2"></div> */}
                    <div className={`${sourceSerif4.className} text-[#4A4235] text-base`}>{content}</div>
                </div>
            </div>
        );
    }

    if (isSearching || isExtracting) {
        return (
            <div className="flex justify-start mb-4">
                <div className="flex items-center gap-2 px-4 py-2">
                    <span className={`text-xs text-[#4A4235]/60 ${sourceSerif4.className}`}>
                        {isSearching && 'Searching web...'}
                        {isExtracting && 'Extracting content...'}
                    </span>
                    <span className="flex gap-1">
                        {[0, 0.3, 0.6].map((delay) => (
                            <span
                                key={delay}
                                className="h-1 w-1 rounded-full bg-[#4A4235]/40 animate-pulse"
                                style={{ animationDelay: `${delay}s` }}
                            />
                        ))}
                    </span>
                </div>
            </div>
        );
    }

    // Search results message
    if (content === 'search-results' && searchResults && searchResults.length > 0) {
        return (
            <div className="flex justify-start mb-8">
                <div className="w-full max-w-3xl bg-[#F5F5F5] border border-[#2C2C2C] px-4 py-3">
                    <div className="flex items-center justify-between mb-3 border-b border-[#2C2C2C] pb-2">
                        <span className="text-sm font-mono text-[#2C2C2C] uppercase">
                            Sources [{searchResults.length}]
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {(showAllSources ? searchResults : searchResults.slice(0, 3)).map((result, index) => (
                            <div key={index} className="border-b border-[#2C2C2C]/20 pb-3 last:border-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-mono text-sm text-[#2C2C2C]">{index + 1}.</span>
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-[#2C2C2C] hover:underline font-mono"
                                    >
                                        {result.title}
                                    </a>
                                </div>
                                <p className="text-sm text-[#2C2C2C]/80 pl-4 font-mono">
                                    {result.content}
                                </p>
                            </div>
                        ))}
                    </div>

                    {searchResults.length > 3 && (
                        <button
                            onClick={() => setShowAllSources(!showAllSources)}
                            className="mt-3 text-xs font-mono text-[#2C2C2C]/70 hover:text-[#2C2C2C]"
                        >
                            {showAllSources ? '[ - SHOW LESS - ]' : `[ + SHOW ${searchResults.length - 3} MORE ]`}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // No results message
    if (content === 'no-results') {
        return (
            <div className="flex justify-start mb-8">
                <div className="w-full max-w-3xl bg-[#F5F5F5] border border-[#2C2C2C] px-4 py-3">
                    <div className="flex items-center justify-between mb-3 border-b border-[#2C2C2C] pb-2">
                        <span className="text-sm font-mono text-[#2C2C2C] uppercase">Search Results</span>
                    </div>
                    <div className="text-sm font-mono text-[#2C2C2C]/70 py-2">
                        No relevant search results found.
                    </div>
                </div>
            </div>
        );
    }

    // Loading states


    // Final return statement for assistant message
    return (
        <div className="flex justify-start mb-12">
            <div className="w-[90%] rounded-sm bg-white px-8 py-6 shawdow-sm border border-white">
                <div className="mb-2 text-sm font-mono uppercase tracking-wide text-[#2C2C2C]">ChatBot</div>
                {/* Thinking/Reasoning Section */}
                {messageContent.reasoning && (
                    <div className="mb-6">
                        <div
                            className="cursor-pointer select-none"
                            onClick={() => setIsReasoningCollapsed(!isReasoningCollapsed)}
                        >
                            <div className="flex items-center gap-2 text-[#2C2C2C] text-sm mb-2">
                                <span
                                    className="inline-flex items-center justify-center w-4 transition-transform duration-200"
                                    style={{ transform: isReasoningCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                                >
                                    ▼
                                </span>
                                <span>Thinking</span>
                                <span className="text-xs bg-[#F5F5F5] px-2 py-0.5 rounded-sm">
                                    {wordCount} words
                                </span>
                            </div>
                        </div>
                        {!isReasoningCollapsed && (
                            <div className="mt-4 text-[#2C2C2C]/90 text-sm pl-4 border-l-2 border-[#2C2C2C]/20">
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: messageContent.reasoning }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Answer Section */}
                {messageContent.answer && (
                    <div className="space-y-4">
                        <div className="h-px bg-[#2C2C2C]/10" />
                        <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: messageContent.answer }}
                        />
                    </div>
                )}

                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 text-xs text-[#2C2C2C]/60 hover:text-[#2C2C2C]"
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
            </div>
        </div>
    );
}

const formatDeepSeekOutput = (content: string): string => {
    if (!content) return '';

    // 1) HEADINGS - Support multiple levels for better content structure
    content = content.replace(
        /^(#{1,6})\s+(.*)$/gm,
        (_, hashes, text) => {
            const level = hashes.length;
            const sizes = {
                1: 'text-2xl',
                2: 'text-xl',
                3: 'text-lg',
                4: 'text-base',
                5: 'text-sm',
                6: 'text-xs'
            };
            return `<h${level} class="text-[#2C2C2C] font-semibold ${sizes[level as keyof typeof sizes]} mb-4 mt-8">${text}</h${level}>`;
        }
    );

    // 2) LATEX EQUATIONS - Support for both display and inline math
    // Display math (centered, larger)
    content = content.replace(
        /\$\$([\s\S]*?)\$\$/g,
        (_, equation) => `
            <div class="my-6 flex justify-center">
                <div class="min-w-0 text-lg bg-white px-6 py-4 rounded shadow-sm">
                    ${renderMath(equation.trim(), true)}
                </div>
            </div>`
    );
    // Inline math
    content = content.replace(
        /\$([^\$]+)\$/g,
        (_, equation) => `<span class="font-serif">${renderMath(equation.trim(), false)}</span>`
    );

    // 3) TABLES - Clean table structure with proper headers
    content = content.replace(
        /((?:^\|[^\n]+\|\r?\n(?:\|[-:\s]+\|\r?\n)?(?:\|[^\n]+\|\r?\n)*)+)/gm,
        (match) => {
            const lines = match.trim().split('\n').map(ln => ln.trim());
            if (lines.length < 2) return match;

            const headerCells = lines[0]
                .split('|')
                .filter(cell => cell.trim())
                .map(cell => cell.trim());

            const bodyLines = lines.slice(2);

            const thead = `
                <thead>
                    <tr>
                        ${headerCells.map(h =>
                `<th class="px-4 py-2 bg-[#F5F5F5] text-left font-semibold border border-[#E5E5E5]">${h}</th>`
            ).join('')}
                    </tr>
                </thead>`;

            const tbodyRows = bodyLines.map(row => {
                const cells = row
                    .split('|')
                    .filter(cell => cell.trim())
                    .map(cell => cell.trim());
                return `
                    <tr>
                        ${cells.map(c => `<td class="px-4 py-2 border border-[#E5E5E5]">${c}</td>`).join('')}
                    </tr>`;
            }).join('');

            return `
                <div class="overflow-x-auto my-4">
                    <table class="min-w-full border-collapse bg-white border border-[#E5E5E5]">
                        ${thead}
                        <tbody>${tbodyRows}</tbody>
                    </table>
                </div>`;
        }
    );

    // 4) BULLET LISTS - For structured information
    content = content.replace(
        /(?:^|\n)((?:- .+\n?)+)/gm,
        (match) => {
            const lines = match.trim().split('\n')
                .map(ln => ln.replace(/^- /, '').trim());
            const liItems = lines.map(line =>
                `<li class="mb-1 ml-6 list-disc">${line}</li>`
            ).join('\n');
            return `\n<ul class="my-4 list-outside">\n${liItems}\n</ul>\n`;
        }
    );

    // 5) NUMBERED LISTS - For sequential information
    content = content.replace(
        /(?:^|\n)((?:\d+\.\s+.+\n?)+)/gm,
        (match) => {
            const lines = match.trim().split('\n')
                .map(ln => ln.replace(/^\d+\.\s+/, '').trim());
            const liItems = lines.map(line =>
                `<li class="mb-1 ml-6 list-decimal">${line}</li>`
            ).join('\n');
            return `\n<ol class="my-4 list-outside">\n${liItems}\n</ol>\n`;
        }
    );

    // 6) TEXT FORMATTING - Bold and italic for emphasis
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // 7) LINKS - For references and citations
    content = content.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]+)")?\)/g,
        '<a href="$2" title="$3" target="_blank" rel="noopener noreferrer" class="text-[#4B6BFB] hover:underline">$1</a>'
    );

    // 8) HORIZONTAL RULES - For section breaks
    content = content.replace(
        /^---\s*$/gm,
        '<hr class="my-8 border-t border-[#E5E5E5]" />'
    );

    // 9) PARAGRAPHS - Clean text formatting
    content = content.replace(/\n{2,}/g, '</p><p class="my-4 leading-relaxed text-[#2C2C2C]">');

    // Wrap content in paragraph if needed
    if (!content.trim().startsWith('<')) {
        content = `<p class="my-4 leading-relaxed text-[#2C2C2C]">${content}`;
    }
    if (!content.trim().endsWith('>')) {
        content += '</p>';
    }

    return DOMPurify.sanitize(content, {
        ADD_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'ul', 'ol', 'li',
            'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span', 'p',
            'a', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'mfrac'
        ],
        ADD_ATTR: [
            'class', 'style', 'href', 'target', 'rel', 'title'
        ]
    });
}; 