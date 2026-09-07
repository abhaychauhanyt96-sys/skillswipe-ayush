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
        // SkillSwipe Academic Credential Palette
        brand: {
          navy: "#101830",       // Deep ink navy (primary background / headers)
          paper: "#F7F5EF",      // Warm paper white (card backgrounds, certificate stock)
          gold: "#D4A017",       // Muted brass/gold (accents, verified seals, CTAs)
          teal: "#1F6F5C",       // Deep teal-green (company accent, success states)
          brick: "#C0392B",      // Restrained brick red (left-swipe/reject)
          slate: "#3A3F4B",      // Slate grey (body text, secondary UI)
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
