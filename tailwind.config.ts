import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effcf9',
          100: '#d3f8ef',
          200: '#a8efe0',
          300: '#72e0cd',
          400: '#3cc8b4',
          500: '#1aab9b',
          600: '#0d7a72',
          700: '#0b625c',
          800: '#0c4e4a',
          900: '#0d403d',
          950: '#052b2a',
        },
        // Accent: warm amber ("volt" keeps its old name so no component needs renaming)
        volt: {
          400: '#f5b942',
          500: '#e89a1b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        lift: '0 8px 30px -8px rgba(13, 122, 114, 0.35)',
      },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-left': 'slide-in-left 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
