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
          bg: "#171C26",
          "bg-light": "#EAE7DF",
          surface: "#222938",
          "surface-light": "#F7F6F1",
          "surface-subtle": "#1C2230",
          "surface-subtle-light": "#F0EDE6",
          "surface-elevated": "#293244",
          "surface-hover": "#313B50",
          primary: "#6C78FF",
          secondary: "#4B55D6",
          border: "#343F56",
          "border-light": "#DCD7CC",
          text: "#E6EBF5",
          muted: "#9AA6BE",
        },
        sla: {
          p1: "#EF4444",
          p2: "#F59E0B",
          p3: "#6366F1",
          p4: "#7F8BA3",
        },
      },
      boxShadow: {
        "xs-subtle": "0 1px 2px 0 rgba(31, 36, 48, 0.05)",
        "card-subtle": "0 1px 3px 0 rgba(31, 36, 48, 0.06), 0 1px 2px -1px rgba(31, 36, 48, 0.04)",
        popover: "0 12px 32px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
