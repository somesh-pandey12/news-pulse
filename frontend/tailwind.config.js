/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f6f3ec',
        'paper-raised': '#ffffff',
        ink: '#1e1c19',
        'ink-soft': '#5a564d',
        rule: '#d8d2c4',
        'wire-red': '#a8442f',
        'wire-teal': '#2c5f56',
        focus: '#1d5fae',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};