import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#4A4235",
            maxWidth: "none",
            h1: {
              color: "#E6B325",
            },
            h2: {
              color: "#E6B325",
            },
            h3: {
              color: "#E6B325",
            },
            strong: {
              color: "#806743",
            },
            code: {
              color: "#806743",
              backgroundColor: "#FFF9ED",
              borderRadius: "0.125rem",
              padding: "0.125rem 0.25rem",
              border: "1px solid rgba(244, 196, 48, 0.3)",
            },
            pre: {
              backgroundColor: "#FFF9ED",
              code: {
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
              },
            },
            a: {
              color: "#B4924C",
              "&:hover": {
                color: "#E6B325",
              },
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
