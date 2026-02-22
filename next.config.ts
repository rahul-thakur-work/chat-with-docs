import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdfjs-dist on the server (not bundled) so the PDF worker
  // resolves correctly from node_modules instead of .next
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
