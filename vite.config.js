import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const isProdBuild = command === "build";

  function productionBase() {
    return process.env.GITHUB_PAGES_BUILD === "1" ? "/bb_lenis/" : "/";
  }

  return {
    base: isProdBuild ? productionBase() : "/",
  };
});
