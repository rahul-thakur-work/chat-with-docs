import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf-parse and pdfjs-dist on the server (not bundled) so the PDF worker
  // resolves correctly from node_modules instead of .next
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
