/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7.5px)' }
        }
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 1.5s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}