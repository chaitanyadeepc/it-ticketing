/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "#0d0117",
        purpleAccent: "#a855f7",
        deepPurple: "#4e0388",
        success: "#10b981",
        error: "#ef4444",
        risk: "#fbbf24",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "24px",
      },
    },
  },
  plugins: [],
}