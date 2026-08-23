import { Inter, Playfair_Display } from "next/font/google";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
