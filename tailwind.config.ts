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
          bg: "#09090B",
          "bg-light": "#F6F7F9",
          surface: "#111115",
          "surface-light": "#FFFFFF",
          "surface-elevated": "#16161C",
          "surface-hover": "#1C1C24",
          primary: "#6366F1",
          secondary: "#4F46E5",
          border: "#23232D",
          "border-light": "#E5E7EB",
          text: "#F4F4F5",
          muted: "#A1A1AA",
        },
        sla: {
          p1: "#EF4444",
          p2: "#F59E0B",
          p3: "#6366F1",
          p4: "#71717A",
        },
      },
      boxShadow: {
        "xs-subtle": "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        "card-subtle": "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        "popover": "0 12px 32px -4px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
