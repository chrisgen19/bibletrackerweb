import type { MetadataRoute } from "next";

/**
 * Installable, not offline: the app needs the server for every write, so there is no
 * service worker. Colours are the light theme's page background; the browser bar follows
 * the device through the theme-color tags in the root layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bible Daily",
    short_name: "Bible Daily",
    description:
      "A daily Bible reading tracker. One chapter a day, tracked on a monthly calendar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#fbfaf8",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
