/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      colors: { bg: '#0a0e16', ink: '#e6e9ef', mute: '#8a93a6', line: 'rgba(255,255,255,0.08)', accent: '#e8b04b' },
    },
  },
  plugins: [],
}
