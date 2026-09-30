/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effdf8',
          100: '#d7f7ec',
          200: '#b0eed9',
          300: '#7de0c1',
          400: '#46cba4',
          500: '#0d9d6c',
          600: '#0b845c',
          700: '#096b4b',
          800: '#0a573e',
          900: '#084734',
        },
        clinic: {
          bg: '#f2f7f5',
          ink: '#0f2e2a',
          muted: '#5b7a75',
          line: '#dcebe7',
          accent: '#0ea5b7',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', '"Noto Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,46,42,.05), 0 8px 24px -12px rgba(13,157,108,.18)',
        pop: '0 24px 64px -16px rgba(8,71,52,.35)',
      },
    },
  },
  plugins: [],
};
