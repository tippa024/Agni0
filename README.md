# Agni

A modern AI chat assistant built with Next.js 14, TypeScript, and Tailwind CSS. This project leverages the power of various AI services and implements best practices for a production-ready application.

## Features

- 🚀 Built with Next.js 14 App Router
- 💎 TypeScript for type safety
- 🎨 Tailwind CSS for styling
- 🔒 Firebase Authentication
- 🤖 AI Integration:
  - OpenAI API integration
  - Anthropic Claude API integration
  - Replicate API for image generation
  - Deepgram for real-time audio transcription
- 🔍 Modern UI components
- ⚡ Real-time streaming responses
- 📱 Responsive design

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
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
REPLICATE_API_KEY=your_replicate_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
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
│   ├── api/         # API routes
│   ├── components/  # React components
│   └── lib/         # Utility functions, hooks, and contexts
├── public/          # Static files
└── styles/          # Global styles
```

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- Firebase
- Vercel AI SDK
- Various AI APIs (OpenAI, Anthropic, Replicate, Deepgram)

## License

MIT License

## Author

[Your Name]
