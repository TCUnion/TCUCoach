/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // slate-950 (更深邃的背景)
        surface: "#0f172a", // slate-900 (深藍色系層次)
        primary: "#3b82f6", // blue-500 (由綠轉藍)
        secondary: "#f97316", // orange-500 (Strava 品牌橘色)
        accent: "#8b5cf6", // violet-500
        strava: "#fc4c02", // Strava 官方橘色
        "dr-text": "#f1f5f9", // slate-100
        "dr-muted": "#94a3b8", // slate-400
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Chakra Petch', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
