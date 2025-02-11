/** @type {import('@tailwindcss/postcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '20%': { opacity: 1 },
          '60%': { opacity: 1 },
          '85%': { opacity: 0 },
          '100%': { opacity: 0 },
        },
        'scale-in': {
          '0%': { transform: 'translate(-50%, -50%) scale(0)' },
          '100%': { transform: 'translate(-50%, -50%) scale(1)' },
        },
      },
      animation: {
        'fade-in': '1.5s fade-in infinite',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
};
