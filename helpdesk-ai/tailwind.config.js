/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:    '#FF634A',
        'brand-hover': '#e84e35',
        surf1:    '#F4F4F6',
        surf2:    '#E7E7E7',
        surf3:    '#D2D2D4',
        success:  '#52b47d',
        error:    '#e07070',
        risk:     '#d4aa40',
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