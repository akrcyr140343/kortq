import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KortQ × KD",
    short_name: "KortQ",
    description: "ระบบจัดคิวก๊วนแบด KHONDEE-TEEBAD แบบเรียลไทม์",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6ed",
    theme_color: "#1d3322",
    categories: ["sports", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
