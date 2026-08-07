import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bathroom Status",
    short_name: "Bathroom",
    description: "Live bathroom occupancy and reservations for your household",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ecdc",
    theme_color: "#f2ecdc",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
