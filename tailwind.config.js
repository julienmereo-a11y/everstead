/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        stone: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        navy: {
          50:  '#f0f3f9',
          100: '#dce4f0',
          200: '#b9cae1',
          300: '#8aa8cb',
          400: '#5c84b4',
          500: '#3b659d',
          600: '#2d5082',
          700: '#253f67',
          800: '#1d3052',
          900: '#152240',
          950: '#0d1628',
        },
        sage: {
          50:  '#f4f7f4',
          100: '#e4ece3',
          200: '#c8d9c6',
          300: '#9dbc9a',
          400: '#6e9b6a',
          500: '#4c7d47',
          600: '#3a6336',
          700: '#2f4f2c',
          800: '#263f24',
          900: '#1e331d',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease forwards',
        'fade-in': 'fadeIn 0.5s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
