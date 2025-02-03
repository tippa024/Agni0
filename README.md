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
- 🎨 **Polished UI/UX**:
  - Clean, minimalist design
  - Responsive layout
  - Smooth transitions and animations
  - Source Serif 4 font integration

## Technical Stack

- ⚡ **Next.js 14** with App Router
- 💎 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🔄 **React Server Components**
- 📱 **Responsive Design**
- 🧪 **Jest** for testing

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

## Features in Detail

### Search Capabilities

- Toggle between Tavily (Basic) and OpenPerplex (PRO) search providers
- Query refinement for better search results
- Real-time search status indicators
- Source scoring and relevance ranking

### Chat Interface

- Clean, minimalist design
- Real-time message streaming
- Markdown support with syntax highlighting
- Expandable search results with source attribution
- Smooth animations and transitions

### Development Features

- TypeScript for type safety
- Jest testing setup
- ESLint configuration
- Tailwind CSS with custom configuration

## License

MIT License

## Author

Tippa
