import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SWRegister from "./sw-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ciboulette Catering - Disponibilidad",
  description: "Confirma tu disponibilidad para eventos de Ciboulette Catering",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ciboulette",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6B7B3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} antialiased bg-[#FAFAF8]`}>
        <SWRegister />
        <div className="min-h-screen flex flex-col max-w-md mx-auto px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
