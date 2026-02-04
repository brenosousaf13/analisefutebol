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
        // New Design System
        'app-bg': '#0D0D0D',
        'card-bg': '#161618',
        'brand-primary': '#27D888',
        'brand-secondary': '#ACFA70',
        'dashboard-page': '#1a1f2e',
        'dashboard-card': '#242938',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
