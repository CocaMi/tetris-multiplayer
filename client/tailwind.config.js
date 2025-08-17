/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tetris-bg': '#1a1a2e',
        'tetris-grid': '#16213e',
        'tetris-border': '#0f3460',
        'tetris-i': '#00f0f0',
        'tetris-o': '#f0f000',
        'tetris-t': '#a000f0',
        'tetris-s': '#00f000',
        'tetris-z': '#f00000',
        'tetris-j': '#0000f0',
        'tetris-l': '#f0a000',
      },
      fontFamily: {
        'game': ['Courier New', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
}
