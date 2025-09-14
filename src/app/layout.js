import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomCursor from './components/CustomCursor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BuyNote",
  description: "App para hacer listas de la compra",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}