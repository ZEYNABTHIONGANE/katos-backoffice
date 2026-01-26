import { type Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        katos: {
          blue: '#2B2E83',
          orange: '#E95E2D',
          white: '#ffffff',
        },
        primary: {
          500: '#2B2E83',
          600: '#1F2161',
          700: '#161848',
        },
        secondary: {
          500: '#E95E2D',
          400: '#ED7A52',
          600: '#D4501A',
        },
        gray: {
          50: '#F5F5F5',
          100: '#F0F0F0',
        }
      },
      fontFamily: {
        sans: ['Fira Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config