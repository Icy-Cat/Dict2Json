import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  theme: {
    extend: {
      colors: {
        duck: {
          bg: "#F4EFEA",
          surface: "#FFFFFF",
          text: "#383838",
          border: "#383838",
          blue: "#6FC2FF",
          yellow: "#FFDE00",
          muted: "#888888",
          hover: "#EAE5E0"
        }
      },
      fontFamily: {
        mono: [
          '"Consolas"',
          '"Hack Nerd Font"',
          '"Fira Code"',
          '"Space Mono"',
          "Menlo",
          "Monaco",
          "monospace"
        ],
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        duck: "2px"
      }
    }
  },
  plugins: []
};

export default config;

