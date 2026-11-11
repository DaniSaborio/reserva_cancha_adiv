/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cancha: {
          50: '#eefbf4',
          100: '#d6f5e3',
          200: '#b0eacc',
          300: '#7cd8ad',
          400: '#47bf8b',
          500: '#24a36f',
          600: '#168358',
          700: '#126948',
          800: '#0f533b',
          900: '#0b4f35',
          950: '#062c1e',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      }
    },
  },
  plugins: [],
};
