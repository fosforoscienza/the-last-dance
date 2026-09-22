import type { MetadataRoute } from "next";

// Permette di aggiungere l'app alla schermata Home come una vera app (a tutto schermo)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The LAST Dance",
    short_name: "LAST Dance",
    description: "Punti e ticket cibo di The LAST Dance",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#5a0e18",
    theme_color: "#5a0e18",
    icons: [
      { src: "/icon/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
