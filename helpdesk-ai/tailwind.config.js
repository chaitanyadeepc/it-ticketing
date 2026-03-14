/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:    '#8c63c5',
        'brand-hover': '#7a52b0',
        p900:     '#110b3d',
        p800:     '#1c1450',
        p700:     '#312171',
        p500:     '#5e409c',
        p300:     '#8c63c5',
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