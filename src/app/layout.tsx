import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASR Media Pro - Project Management",
  description: "Internal project management tool for ASR Media Pro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
