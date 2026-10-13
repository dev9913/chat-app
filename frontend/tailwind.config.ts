import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF8F5",       // Pure Warm Cream
        card: "#FFFFFF",
        cream: {
          50: "#FCFAF7",
          100: "#F6F2EC",        // Soft oat hover
          200: "#EAE4D9",        // Delicate warm border
          300: "#DDD4C5",
          400: "#C7BAA5",
          700: "#635749",
          800: "#453C32",
          900: "#2B241D",        // Deep espresso action tone
          950: "#1E1813",
        },
        oat: {
          100: "#F2ECE1",
          200: "#EDE7DC",        // Sent bubble tone
          300: "#DED6C7",
          800: "#362F27",
          900: "#26201A",
        },
        caramel: {
          500: "#C28135",        // Warm badge / seen receipt
          600: "#A86B25",
        }
      },
    },
  },
  plugins: [],
};
export default config;
