/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // خیلی مهم برای سوئیچر دارک/لایت
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // اختیاری ولی خوبه: اگر جایی از کلاس‌های فونت تیلویند استفاده کنی
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
