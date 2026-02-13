/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nav-dark': '#030909', // Header
        'panel-dark': '#141A1A', // Cards/Panels
        'field-green': '#2d5a3d',
        'accent-green': '#22c55e',
        'accent-yellow': '#eab308',
        // New Design System
        'app-bg': '#0B1111', // Main Background
        'card-bg': '#141A1A', // Cards
        'brand-primary': '#27D888',
        'brand-secondary': '#ACFA70',
        'dashboard-page': '#0B1111',
        'dashboard-card': '#141A1A',
        // Overrides
        gray: {
          900: '#0B1111', // Main BG usually
          800: '#141A1A', // Card BG usually
        },
        slate: {
          900: '#0B1111',
          800: '#141A1A',
        },
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(to bottom right, #030909, #141A1A)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
