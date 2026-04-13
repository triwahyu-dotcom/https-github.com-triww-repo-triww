import type { Metadata } from "next";
import "./globals.css";
import { Inter, Cedarville_Cursive } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const signature = Cedarville_Cursive({ 
  weight: "400", 
  subsets: ["latin"],
  variable: "--font-signature" 
});

export const metadata: Metadata = {
  title: "Project Tracker JUARAEVENT",
  description: "Dashboard internal untuk monitoring project JUARAEVENT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${signature.variable}`}>
      <body suppressHydrationWarning className={inter.className}>{children}</body>
    </html>
  );
}
