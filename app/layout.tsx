import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { Navegacao } from "@/components/Navegacao";
import { fontSans, fontSerif } from "@/config/fonts";

export const metadata: Metadata = {
  title: { default: "Envio de SMS", template: "%s - Envio de SMS" },
  description: "Disparo de SMS por grupo",
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
          <div className="casca-app">
            <main className="flex flex-1 flex-col overflow-x-hidden">{children}</main>
            <Navegacao />
          </div>
        </Providers>
      </body>
    </html>
  );
}
