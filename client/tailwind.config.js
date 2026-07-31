/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f0ff', 100: '#e6e1ff', 200: '#c9bdff', 300: '#a892ff',
          400: '#8a68ff', 500: '#7440ff', 600: '#6420f0', 700: '#5314c9',
          800: '#4410a1', 900: '#390f83',
        },
        accent: {
          50: '#effcf8', 100: '#d7f8ee', 200: '#b0f0dc', 300: '#7ce3c6',
          400: '#42cca8', 500: '#20b090', 600: '#158d75', 700: '#14715f',
          800: '#145a4d', 900: '#134a41',
        },
        ink: {
          950: '#0b0b14', 900: '#12121f', 800: '#1a1a2b', 700: '#242438',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(116,64,255,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
