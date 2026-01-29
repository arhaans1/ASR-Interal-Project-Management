import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "ASR Media Pro - Project Management",
  description: "Internal project management tool for ASR Media Pro",
};

import { PresenceProvider } from "@/context/PresenceContext";

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} ${jakarta.variable} antialiased font-sans`}>
        <PresenceProvider>
          {children}
        </PresenceProvider>
      </body>
    </html>
  );
}
