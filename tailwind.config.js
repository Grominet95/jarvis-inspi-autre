/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'glow-sm': '0 0 8px rgba(59, 130, 246, 0.6)',
        'glow': '0 0 15px rgba(59, 130, 246, 0.5)'
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s infinite',
        'line-pulse': 'line-pulse 1s ease-out infinite'
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.02)' }
        },
        'line-pulse': {
          '0%': { top: '0%', opacity: 0.9 },
          '100%': { top: '100%', opacity: 0.2 }
        }
      }
    },
  },
  plugins: [],
}
