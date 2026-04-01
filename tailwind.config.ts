import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#eff6ff", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
      },
      keyframes: {
        "landing-blob": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        "landing-blob-delayed": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-25px, 25px)" },
        },
        "landing-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
      animation: {
        "landing-blob": "landing-blob 18s ease-in-out infinite",
        "landing-blob-delayed": "landing-blob-delayed 22s ease-in-out infinite",
        "landing-float": "landing-float 16s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
