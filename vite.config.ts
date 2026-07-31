import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/BitLab/",
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    tsConfigPaths(),
    react({
      babel: {
        plugins: ["babel-plugin-formatjs"],
      },
    }),
  ],
});
