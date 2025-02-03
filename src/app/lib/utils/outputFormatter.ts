import DOMPurify from "dompurify";
import Prism from "prismjs";
import hljs from "highlight.js";
import katex from "katex";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Helper function for code highlighting with fallback
export const highlightCode = (code: string, language?: string): string => {
  try {
    // Try Prism.js first
    if (language && Prism.languages[language]) {
      // Add custom token handling for Python
      if (language === "python") {
        Prism.languages.python = {
          ...Prism.languages.python,
          keyword:
            /\b(?:import|from|as|def|class|for|in|enumerate|sorted|list|set|len|if|else|elif|while|return|True|False|None)\b/,
          builtin: /\b(?:print|range|str|int|float|bool|dict|list|tuple|set)\b/,
          string: {
            pattern:
              /(?:[rub]|rb|br)?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/i,
            greedy: true,
          },
          number: /\b0[xX][\dA-Fa-f]+\b|\b\d+\.?\d*(?:[Ee][+-]?\d+)?/,
          operator:
            /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not|in|is)\b/,
          punctuation: /[{}[\];(),.:]/,
          comment: {
            pattern: /(^|[^\\])#.*$/m,
            lookbehind: true,
          },
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
    console.warn("Error highlighting code:", e);
    return code;
  }
};

// Helper function for math rendering
export const renderMath = (
  equation: string,
  displayMode: boolean = false
): string => {
  try {
    return katex.renderToString(equation, {
      displayMode,
      throwOnError: false,
      output: "html",
      strict: false,
      trust: true,
      macros: {
        "\\RR": "\\mathbb{R}",
        "\\NN": "\\mathbb{N}",
        "\\ZZ": "\\mathbb{Z}",
        "\\PP": "\\mathbb{P}",
      },
    });
  } catch (e) {
    console.warn("Error rendering equation:", e);
    return `<span class="text-red-500">${equation}</span>`;
  }
};

// Helper function to escape HTML for security
export const escapeHtml = (content: string): string => {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Helper function to extract domain from URL
export const getDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.split(".")[0];
  } catch {
    return "";
  }
};

// Main formatting function that handles all content types
export const formatOutput = (text: string): string => {
  if (!text) return "";

  let content = text;

  // 1) CODE BLOCKS - Handle both fenced and inline code
  content = content.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, language, code) => {
      const highlightedCode = highlightCode(
        code.trim(),
        language?.toLowerCase()
      );
      return `
            <div class="relative group/code my-4">
                <div class="absolute -top-3 right-2 flex items-center gap-2 px-2 py-1 bg-[#F5F5F5] rounded-t-md border border-[#2C2C2C]/30 border-b-0">
                    ${
                      language
                        ? `<div class="text-xs text-[#2C2C2C]/80 font-mono">${language}</div>`
                        : ""
                    }
                    <button class="copy-button opacity-0 group-hover/code:opacity-100 transition-opacity" onclick="copyToClipboard('${escapeHtml(
                      code.trim().replace(/'/g, "\\'")
                    )}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-[#2C2C2C]/60 hover:text-[#2C2C2C]">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                    </button>
                </div>
                <pre class="bg-[#F5F5F5] border border-[#2C2C2C]/30 rounded-lg overflow-x-auto">
                    <code class="language-${
                      language || "plaintext"
                    } font-mono text-sm block p-4 text-[#2C2C2C] whitespace-pre">${highlightedCode}</code>
                </pre>
            </div>`;
    }
  );

  // Inline code
  content = content.replace(
    /`([^`]+)`/g,
    '<code class="bg-[#F5F5F5] rounded px-1 py-0.5 text-sm border border-[#2C2C2C]/30 font-mono text-[#2C2C2C]">$1</code>'
  );

  // 2) MATH BLOCKS - Handle both display and inline math
  content = content.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, equation) => `
        <div class="my-6 flex justify-start overflow-x-auto">
            <div class="font-mono text-base min-w-0 bg-[#F5F5F5]/50 px-4 py-2 rounded-sm">
                ${renderMath(equation.trim(), true)}
            </div>
        </div>`
  );
  content = content.replace(
    /\$([^\$]+)\$/g,
    (_, equation) =>
      `<span class="font-serif">${renderMath(equation.trim(), false)}</span>`
  );

  // 3) TABLES - Clean table structure with proper headers
  content = content.replace(
    /((?:^\|[^\n]+\|\r?\n(?:\|[-:\s]+\|\r?\n)?(?:\|[^\n]+\|\r?\n)*)+)/gm,
    (match) => {
      const lines = match
        .trim()
        .split("\n")
        .map((ln) => ln.trim());
      if (lines.length < 2) return match;

      const headerCells = lines[0]
        .split("|")
        .filter((cell) => cell.trim())
        .map((cell) => cell.trim());

      const bodyLines = lines.slice(2);

      const thead = `
                <thead>
                    <tr>
                        ${headerCells
                          .map(
                            (h) =>
                              `<th class="px-4 py-2 bg-[#F5F5F5] text-left font-semibold border border-[#E5E5E5]">${h}</th>`
                          )
                          .join("")}
                    </tr>
                </thead>`;

      const tbodyRows = bodyLines
        .map((row) => {
          const cells = row
            .split("|")
            .filter((cell) => cell.trim())
            .map((cell) => cell.trim());
          return `
                    <tr>
                        ${cells
                          .map(
                            (c) =>
                              `<td class="px-4 py-2 border border-[#E5E5E5]">${c}</td>`
                          )
                          .join("")}
                    </tr>`;
        })
        .join("");

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
  content = content.replace(/(?:^|\n)((?:- .+\n?)+)/gm, (match) => {
    const lines = match
      .trim()
      .split("\n")
      .map((ln) => ln.replace(/^- /, "").trim());
    const liItems = lines
      .map((line) => `<li class="mb-1 ml-6 list-disc">${line}</li>`)
      .join("\n");
    return `\n<ul class="my-4 list-outside">\n${liItems}\n</ul>\n`;
  });

  // 5) NUMBERED LISTS - For sequential information
  content = content.replace(/(?:^|\n)((?:\d+\.\s+.+\n?)+)/gm, (match) => {
    const lines = match
      .trim()
      .split("\n")
      .map((ln) => ln.replace(/^\d+\.\s+/, "").trim());
    const liItems = lines
      .map((line) => `<li class="mb-1 ml-6 list-decimal">${line}</li>`)
      .join("\n");
    return `\n<ol class="my-4 list-outside">\n${liItems}\n</ol>\n`;
  });

  // 6) TEXT FORMATTING - Bold and italic
  content = content.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold">$1</strong>'
  );
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

  // 9) HEADERS - With proper hierarchy and styling
  content = content
    // Handle #### headers first (before other headers)
    .replace(
      /^####\s+(.*?)(?:\n|$)/gm,
      `<h4 class="text-[#2C2C2C] font-semibold text-base mt-4 mb-2 ${sourceSerif4.className}">$1</h4>`
    )
    // Special section headers
    .replace(
      /^(Math Concepts|Code \([\w.]+\))$/gm,
      `<h2 class="text-[#2C2C2C] font-bold text-2xl mt-10 mb-6 ${sourceSerif4.className}">$1</h2>`
    )
    // Major numbered sections
    .replace(
      /^(\d+)\.\s+(.*?)(?:\n|$)/gm,
      `<h2 class="text-[#2C2C2C] font-bold text-xl mt-8 mb-4 ${sourceSerif4.className}">$1. $2</h2>`
    )
    // Lettered subsections
    .replace(
      /^([a-z])\.\s+(.*?)(?:\n|$)/gm,
      `<h3 class="text-[#2C2C2C] font-bold mt-6 mb-3 ${sourceSerif4.className}">$1. $2</h3>`
    )
    // Standard markdown headers
    .replace(
      /^###\s+(.*?)(?:\n|$)/gm,
      `<h3 class="text-[#2C2C2C] font-bold mt-6 mb-3 ${sourceSerif4.className}">$1</h3>`
    )
    .replace(
      /^##\s+(.*?)(?:\n|$)/gm,
      `<h2 class="text-[#2C2C2C] font-bold text-xl mt-8 mb-4 ${sourceSerif4.className}">$1</h2>`
    )
    .replace(
      /^#\s+(.*?)(?:\n|$)/gm,
      `<h1 class="text-[#2C2C2C] font-bold text-2xl mt-10 mb-6 ${sourceSerif4.className}">$1</h1>`
    );

  // 10) SPECIAL TERMS - With distinct styling
  content = content
    // Special terms with colons
    .replace(
      /^-?\s*(Goal|Mechanism|Example|Query \(Q\)|Key \(K\)|Value \(V\)|Encoder|Decoder|Strengths|Weaknesses|Applications|Objective|Parallelization|Scalability|Notes|Security Considerations|Styling):/gm,
      `<div class="mt-4 mb-2"><span class="text-[#2C2C2C] font-semibold">$1:</span></div>`
    )
    // Technical terms
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-[#F5F5F5] rounded px-1 py-0.5 text-sm border border-[#2C2C2C]/30 font-mono">$1</code>'
    )
    // Model names and libraries
    .replace(
      /\b(GPT-3|PaLM|BERT|Prism\.js|KaTeX|DOMPurify|Highlight\.js|marked)\b/g,
      `<span class="text-[#4B6BFB] font-semibold">$1</span>`
    )
    // Math variable formatting
    .replace(
      /\b([P])\((.*?)\|(.*?)\)/g,
      `<span class="font-mono">$1($2|$3)</span>`
    );

  // 11) PARAGRAPHS - Clean text formatting
  content = content.replace(
    /\n{2,}/g,
    '</p><p class="my-4 leading-relaxed text-[#2C2C2C]">'
  );

  // Wrap content in paragraph if needed
  if (!content.trim().startsWith("<")) {
    content = `<p class="my-4 leading-relaxed text-[#2C2C2C]">${content}`;
  }
  if (!content.trim().endsWith(">")) {
    content += "</p>";
  }

  // Sanitize the final HTML output
  return DOMPurify.sanitize(content, {
    ADD_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "div",
      "span",
      "p",
      "a",
      "code",
      "pre",
      "math",
      "semantics",
      "mrow",
      "mi",
      "mo",
      "mn",
      "msup",
      "mfrac",
    ],
    ADD_ATTR: ["class", "style", "href", "target", "rel", "title", "onclick"],
  });
};
