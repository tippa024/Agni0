# Agni

A sophisticated AI chat assistant with integrated search capabilities, built with Next.js 14, TypeScript, and Tailwind CSS. This project combines multiple search providers and AI services to deliver comprehensive and accurate responses.

## Core Features

- 🔍 **Dual Search Providers**:
  - Tavily Search API (Basic mode)
  - OpenPerplex Search API (PRO mode)
- 🧠 **Advanced Reasoning**:
  - Query refinement for optimal search results
  - Context-aware responses
  - Source citation and verification
- 💬 **Modern Chat Interface**:
  - Real-time streaming responses
  - Markdown support with syntax highlighting
  - Source attribution with clickable links
  - Expandable search results view

## Customizing Search Behavior

The heart of Agni's intelligence lies in its query refinement system. You can customize how the AI processes queries by modifying the system prompt in:

```typescript
// File: src/app/lib/handlers/chatSubmitHandler.ts (around line 110)

messages: [
  {
    role: "system",
    content: `You are a specialized LLM that refines user queries to maximize search result quality.
              
    Your task is to optimize the user's query for the ${
      state.searchProvider
    } search API.
    The current date is ${new Date().toISOString().split("T")[0]} ...`,
  },
];
```

This prompt determines how Agni:

- Refines user queries for better search results
- Formats search parameters for different providers
- Handles temporal context in searches
- Processes search results for the final response

You can modify this prompt to:

- Adjust search behavior for specific domains
- Change result ranking priorities
- Add custom instructions for specific search providers
- Implement domain-specific knowledge or constraints

## Technical Stack

- ⚡ **Next.js 14** with App Router
- 💎 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🔄 **React Server Components**
- 📱 **Responsive Design**

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/tippa024/Agni.git
cd Agni
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your API keys:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
TAVILY_API_KEY=your_tavily_api_key
OPENPERPLEX_API_KEY=your_openperplex_api_key
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes for search providers
│   │   ├── tavily/         # Tavily search integration
│   │   └── openperplex/    # OpenPerplex search integration
│   ├── components/         # React components
│   │   ├── ChatInput.tsx   # Main chat input with search controls
│   │   ├── MessageBubble.tsx # Chat message display
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   │   ├── useSearch.ts   # Generic search hook
│   │   ├── useTavilySearch.ts
│   │   └── useOpenPerplexSearch.ts
│   └── lib/               # Utility functions and handlers
│       ├── handlers/      # Chat and search handlers
│       └── utils/         # Helper functions
```

## Author

Tippa
