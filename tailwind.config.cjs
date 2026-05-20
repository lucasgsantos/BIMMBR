/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bim-bg':      '#0a0f1c',
        'bim-surface': '#0f172a',
        'bim-border':  '#1e293b',
        'bim-muted':   '#475569',
        'bim-blue':    '#3b82f6',
        'bim-green':   '#10b981',
        'bim-amber':   '#f59e0b',
        'bim-red':     '#ef4444',
        'bim-purple':  '#8b5cf6',
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "'Fira Code'", "'Cascadia Code'", 'monospace'],
      },
    },
  },
  plugins: [],
};
