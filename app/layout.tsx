import "@/styles/globals.css";
import type { Metadata } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { Navegacao } from "@/components/Navegacao";
import { fontSans, fontSerif } from "@/config/fonts";

export const metadata: Metadata = {
  title: { default: "Envio de SMS", template: "%s - Envio de SMS" },
  description: "Disparo de SMS por grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <head />
      <body
        suppressHydrationWarning
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontSerif.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col min-h-screen">
            <Navegacao />
            <main className="flex-grow">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
