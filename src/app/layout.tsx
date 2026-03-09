import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strictly the Good Stuff",
  description:
    "Curated travel recommendations from Denna's Strict List. AI-powered itineraries built from personally vetted restaurants, hotels, and experiences around the world.",
  openGraph: {
    title: "Strictly the Good Stuff",
    description:
      "Curated travel recommendations from Denna's Strict List. AI-powered itineraries built from personally vetted restaurants, hotels, and experiences around the world.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#B8937A" />
      </head>
      <body className="bg-cream font-mono antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
