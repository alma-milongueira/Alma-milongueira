import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Galpão Estúdio",
    short_name: "Galpão",
    description: "Estúdio de bolso para compositores de música nativista do Rio Grande do Sul.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6eedc",
    theme_color: "#5a3a1f",
    categories: ["music", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo projeto", url: "/projetos?novo=1" },
      { name: "Ideias de acordes", url: "/ideias" },
    ],
  };
}
