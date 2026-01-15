/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nav-dark': '#1a1f2e',
        'panel-dark': '#242938',
        'field-green': '#2d5a3d',
        'accent-green': '#22c55e',
        'accent-yellow': '#eab308',
      }
    },
  },
  plugins: [],
}
