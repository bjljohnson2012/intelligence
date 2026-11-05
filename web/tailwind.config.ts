import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        md: '6px',
        lg: '10px',
        xl: '10px',
        '2xl': '10px',
      },
      colors: {
        navy: '#0F3E80',
        accent: '#0A5BCC',
        mist: '#B2E1F6',
        hold: '#FF6200',
        ink: '#504A43',
        muted: '#706B65',
        paper: '#F3F2F0',
        line: '#E4E2E0',
        good: '#127A3E',
      },
      fontFamily: {
        sans: ['var(--font-text)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,62,128,.05), 0 8px 24px rgba(15,62,128,.05)',
      },
      width: {
        rail: '16rem',
        drawer: '24rem',
      },
    },
  },
  plugins: [],
};

export default config;
