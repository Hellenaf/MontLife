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
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        mont: {
          bg: "#161B26",
          "bg-light": "#E9E6DE",
          surface: "#212838",
          "surface-light": "#F6F4EE",
          "surface-subtle": "#1B2130",
          "surface-subtle-light": "#EFECE4",
          "surface-elevated": "#273043",
          "surface-hover": "#2F3A50",
          primary: "#7380FF",
          secondary: "#4B55D6",
          border: "#323D54",
          "border-light": "#DCD6CA",
          text: "#E7ECF6",
          muted: "#98A4BC",
        },
        sla: {
          p1: "#EF4444",
          p2: "#F59E0B",
          p3: "#6366F1",
          p4: "#7F8BA3",
        },
      },
      boxShadow: {
        "xs-subtle": "0 1px 2px 0 rgba(30, 35, 48, 0.05)",
        "card-subtle": "0 1px 3px 0 rgba(30, 35, 48, 0.06), 0 8px 20px -10px rgba(30, 35, 48, 0.08)",
        bento: "0 1px 2px rgba(30, 35, 48, 0.04), 0 10px 26px -14px rgba(30, 35, 48, 0.12)",
        popover: "0 16px 36px -6px rgba(15, 23, 42, 0.22), 0 4px 12px -2px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
