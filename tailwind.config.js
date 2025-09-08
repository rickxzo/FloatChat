import { fontFamily } from "tailwindcss/defaultTheme"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ring: "hsl(var(--ring))",
      },
      borderColor: {
        DEFAULT: "hsl(var(--border))",
      },
      outlineColor: {
        DEFAULT: "hsl(var(--ring) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"), // ⬅️ add this line
  ],
}
