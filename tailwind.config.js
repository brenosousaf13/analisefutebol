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

        // ── Sistema de superficies (referencia Fynix traduzida para dark) ──
        // Escala de elevacao: quanto mais alto o numero, mais proximo do usuario.
        surface: {
          base: '#0B1111',  // fundo da pagina
          sunken: '#080D0D', // trilhos, area da sidebar
          raised: '#141A1A', // cards
          overlay: '#1B2222', // linhas dentro de card, hover
          hover: '#222A2A',  // hover de item interativo
        },
        line: {
          subtle: 'rgba(255,255,255,0.06)', // divisores dentro de card
          DEFAULT: 'rgba(255,255,255,0.10)', // borda de card
          strong: 'rgba(255,255,255,0.16)', // borda de elemento ativo
        },
        content: {
          primary: '#E8EFEC',   // titulos e numeros
          secondary: '#9AA8A4', // labels, subtitulos
          muted: '#61706C',     // metadados, placeholders
        },
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(to bottom right, #030909, #141A1A)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '20px', // cards de painel
        control: '12px', // botoes, inputs, itens de menu
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.30), 0 8px 24px -12px rgba(0,0,0,0.45)',
        pop: '0 12px 32px -8px rgba(0,0,0,0.55)',
      },
      fontSize: {
        // Label de secao da sidebar e cabecalho de tabela
        eyebrow: ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
      },
      transitionDuration: {
        sidebar: '200ms',
      },
    },
  },
  plugins: [],
}
