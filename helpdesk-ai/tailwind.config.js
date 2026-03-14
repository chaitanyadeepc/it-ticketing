/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "#0d1117",
        purpleAccent: "#a371f7",
        deepPurple: "#6639ba",
        success: "#3fb950",
        error: "#f85149",
        risk: "#d29922",
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