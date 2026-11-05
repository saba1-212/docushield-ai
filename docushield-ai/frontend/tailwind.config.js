/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        // primary: deep navy
        navy: { 50: '#F1F5FB', 100: '#E1E9F5', 200: '#C3D3EA', 700: '#173560', 800: '#102849', 900: '#0B1F3A', 950: '#071428' },
        // secondary: soft blue
        soft: { 50: '#F3F8FE', 100: '#E6F0FC', 200: '#CFE2F8', 300: '#A9CBF2', 400: '#6FA8E6', 500: '#4A8BD6' },
        // accent: teal comes from tailwind's built-in `teal`
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,58,0.04), 0 4px 16px rgba(11,31,58,0.05)',
        lift: '0 2px 4px rgba(11,31,58,0.05), 0 12px 28px rgba(11,31,58,0.10)',
      },
    },
  },
  plugins: [],
};
