import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-yellow':'#FED700', 'custom-lightblue':'#B9CCFB','custom-lightblack':'#97B3F8',
      },
      keyframes: {
        progress: {
          '0%':   { marginLeft: '-40%', width: '40%' },
          '50%':  { marginLeft: '60%',  width: '40%' },
          '100%': { marginLeft: '100%', width: '0%'  },
        },
      },
      animation: {
        progress: 'progress 1.4s ease-in-out infinite',
      },
    },
  },  
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms"), require("daisyui")],
};
export default config;
