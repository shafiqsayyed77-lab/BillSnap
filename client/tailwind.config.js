/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lilac: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          card: 'var(--color-card)',
          cardSubtle: 'var(--color-card-subtle)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          accent: 'var(--color-accent)',
          border: 'var(--color-border)',
          nav: 'var(--color-nav)',
          gold: '#FFC857',
          mintBg: '#D9F3E6',
          mintText: '#0E7A52',
          coralBg: '#FDE3E0',
          coralText: '#A8301F',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(101, 68, 199, 0.08)',
        'nav': '0 -4px 25px rgba(43, 33, 71, 0.15)',
        'scan': '0 6px 20px rgba(255, 200, 87, 0.45)',
      },
    },
  },
  plugins: [],
};
