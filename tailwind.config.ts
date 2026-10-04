import type { Config } from "tailwindcss";
// Généré/écrasé par l'Agent Brand Scout (npm run dev → /api/setup → brand.generated.json)
import brand from "./src/brand/brand.generated.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ecf: brand.palette.ecf,
        iwigo: brand.palette.iwigo,
        ink: brand.palette.neutral,
      },
      fontFamily: {
        heading: [brand.fonts.heading, "system-ui", "sans-serif"],
        body: [brand.fonts.body, "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
