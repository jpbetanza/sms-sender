import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { Navegacao } from "@/components/Navegacao";
import { CabecalhoApp } from "@/components/CabecalhoApp";
import { RegistroPwa } from "@/components/RegistroPwa";
import { fontSans, fontSerif } from "@/config/fonts";

export const metadata: Metadata = {
  title: { default: "PequenaVia SMS", template: "%s - PequenaVia SMS" },
  description: "Disparo de SMS por grupo",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PequenaVia SMS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F9F6F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <head />
      <body
        suppressHydrationWarning
        className={clsx("font-sans antialiased", fontSans.variable, fontSerif.variable)}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <RegistroPwa />
          <div className="casca-app">
            <CabecalhoApp />
            <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
              {children}
            </main>
            <Navegacao />
          </div>
        </Providers>
      </body>
    </html>
  );
}
