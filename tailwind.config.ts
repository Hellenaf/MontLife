import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mont: {
          bg: "#0F0E17",
          "bg-light": "#F8F7FF",
          surface: "#1A1829",
          "surface-light": "#FFFFFF",
          "surface-hover": "#242138",
          primary: "#9D8DF1",
          secondary: "#7B61FF",
          border: "#2E2B44",
          "border-light": "#E2E0EE",
          text: "#EAE9FC",
          muted: "#9490AC",
        },
        sla: {
          p1: "#EF4444",
          p2: "#F97316",
          p3: "#EAB308",
          p4: "#A855F7",
        },
      },
    },
  },
  plugins: [],
};

export default config;

