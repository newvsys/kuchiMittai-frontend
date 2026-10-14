import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import SessionProvider from "@/utils/SessionProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/Providers";
import SessionTimeoutWrapper from "@/components/SessionTimeoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.trynat.com"),
  title: {
    default: "TRYNAT | Natural & Organic Products Online in India",
    template: "%s | TryNat",
  },
  description: "Shop natural food products, cooking oils and traditional snacks online at TRYNAT. Explore our products and order online.",
  keywords: [
    "natural and organic products online",
    "natural food products",
    "cooking oils online",
    "traditional snacks",
  ],
  openGraph: {
    type: "website",
    siteName: "TryNat",
    locale: "en_IN",
    title: "TRYNAT | Natural & Organic Products Online in India",
    description: "Shop natural food products, cooking oils and traditional snacks online at TRYNAT.",
    images: [{ url: "/promo/oilpromo1.png", alt: "TryNat natural oils and pantry products" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Natural & Organic Products Online in India | TryNat",
    description: "Shop pure cold-pressed oils, organic pantry essentials and traditional Indian snacks online at TryNat.",
    images: ["/promo/oilpromo1.png"],
  },
  icons: {
    icon: "/companyLogo/CompanyLogo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  return (
    <html lang="en" data-theme="light">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <SessionTimeoutWrapper />
          <Header />
          <Providers>
            <main className="min-h-screen">
              {children}
            </main>
          </Providers>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
