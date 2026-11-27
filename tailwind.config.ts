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
        // Semantic Design System tokens (CSS variables auto-adapt Light & Dark)
        canvas: "var(--ml-canvas)",
        sidebar: "var(--ml-sidebar)",
        surface: "var(--ml-surface)",
        elevated: "var(--ml-elevated)",
        "surface-hover": "var(--ml-hover)",
        "surface-input": "var(--ml-input)",
        "lavender-soft": "var(--ml-lavender-soft)",
        "lavender-mid": "var(--ml-lavender-mid)",
        "lavender-strong": "var(--ml-lavender-strong)",
        brand: {
          DEFAULT: "var(--ml-brand)",
          hover: "var(--ml-brand-hover)",
          fg: "var(--ml-brand-fg)",
        },
        ink: {
          DEFAULT: "var(--ml-text)",
          muted: "var(--ml-text-muted)",
        },
        line: {
          DEFAULT: "var(--ml-border)",
          strong: "var(--ml-border-strong)",
        },
        // Explicit brand scale for rare fixed accents
        plum: {
          50: "#FAF6EF",
          100: "#F5F1E8",
          200: "#E7DFF5",
          300: "#D8C9EE",
          400: "#B6A2DB",
          500: "#7455AD",
          600: "#654696",
          700: "#4E3776",
          800: "#392D4B",
          900: "#241F2D",
          950: "#1D1925",
        },
        // Legacy compatibility tokens
        mont: {
          bg: "#1D1925",
          "bg-light": "#F5F1E8",
          surface: "#2C2637",
          "surface-light": "#FFFCF6",
          "surface-subtle": "#241F2D",
          "surface-subtle-light": "#FAF6EF",
          "surface-elevated": "#352D42",
          "surface-hover": "#3D344C",
          primary: "#7455AD",
          secondary: "#B6A2DB",
          border: "#44394F",
          "border-light": "#E4DCE4",
          text: "#F5F1E8",
          muted: "#B6A9C3",
        },
        sla: {
          p1: "#DC2626",
          p2: "#D97706",
          p3: "#7455AD",
          p4: "#756B80",
        },
      },
      borderRadius: {
        panel: "12px",
        card: "12px",
        control: "10px",
        chip: "8px",
        modal: "14px",
      },
      boxShadow: {
        "xs-subtle": "0 1px 2px 0 rgba(57, 45, 75, 0.04)",
        "card-subtle":
          "0 1px 2px 0 rgba(57, 45, 75, 0.04), 0 6px 16px -8px rgba(57, 45, 75, 0.08)",
        bento:
          "0 1px 2px rgba(57, 45, 75, 0.04), 0 8px 20px -12px rgba(57, 45, 75, 0.1)",
        popover:
          "0 14px 32px -8px rgba(29, 25, 37, 0.22), 0 4px 10px -2px rgba(29, 25, 37, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
