import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ips.ipec.com",
      "ips.ipecgroup.net",
      "ibpm.ipec.com",
      "ibpm.ipecgroup.net",
      "ibpm.ipec",
    ],
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ips.ipec.com",
      "ips.ipecgroup.net",
      "ibpm.ipec.com",
      "ibpm.ipecgroup.net",
      "ibpm.ipec",
    ],
  },
});
