import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  build: {
    outDir: "dist",
    // Source maps would publish ~2.8MB of readable source alongside the
    // bundle — larger than the app itself. Set to true locally if you need
    // to debug a production build.
    sourcemap: false,
  },
});
