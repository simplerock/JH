import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Familjen",
    short_name: "Familjen",
    description: "Rutiner, mål och planer för hela familjen.",
    lang: "sv",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#2f6f55",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
