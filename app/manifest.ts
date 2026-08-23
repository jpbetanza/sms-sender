import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PequenaVia SMS",
    short_name: "PequenaVia",
    description: "Disparo de SMS por grupo",
    start_url: "/compor",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9F6F2",
    theme_color: "#F9F6F2",
    icons: [
      {
        src: "/pequenavia-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pequenavia-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pequenavia-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
