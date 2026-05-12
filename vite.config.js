import { defineConfig } from "vite";

// Project Pages URL: https://co851002.github.io/bb_lenis/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/bb_lenis/" : "/",
}));
