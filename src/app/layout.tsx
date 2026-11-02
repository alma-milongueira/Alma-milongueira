import type { Metadata, Viewport } from "next";
import { Alegreya, Nunito_Sans } from "next/font/google";
import { Portao } from "@/components/Portao";
import { RegistrarSW } from "@/components/RegistrarSW";
import { SessaoProvider } from "@/components/Sessao";
import { AvisosProvider } from "@/components/ui";
import "./globals.css";

const alegreya = Alegreya({ variable: "--font-alegreya", subsets: ["latin"], weight: ["700", "800"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Alma Milongueira", template: "%s · Alma Milongueira" },
  description: "Estúdio de bolso para compositores de música nativista do Rio Grande do Sul.",
  applicationName: "Alma Milongueira",
  appleWebApp: { capable: true, title: "Alma Milongueira", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icones/icone.svg", type: "image/svg+xml" },
    ],
    apple: "/icones/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5a3a1f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${alegreya.variable} ${nunito.variable} antialiased`}>
      <body className="fundo-galpao min-h-dvh">
        <SessaoProvider>
          <AvisosProvider>
            <Portao>{children}</Portao>
          </AvisosProvider>
        </SessaoProvider>
        <RegistrarSW />
      </body>
    </html>
  );
}
