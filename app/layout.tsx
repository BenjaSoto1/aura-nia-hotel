import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({ weight: ["400", "500", "600"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-cormorant" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const instrument = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: "Aura · Hotel Boutique & Casa de Mar",
  description: "Demo hotelero con Nía, concierge digital de Flowy AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable} ${instrument.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
