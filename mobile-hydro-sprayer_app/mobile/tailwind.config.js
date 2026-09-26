/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3B7A57",
          light: "#E8F3EC",
          dark: "#2A5B40",
        },
      },
    },
  },
  plugins: [],
};
