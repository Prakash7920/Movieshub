import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { LanguageProvider } from "@/components/providers/language-provider";

export const metadata: Metadata = {
  title: "NexaFilm | One Platform. Every Language. Endless Stories.",
  description: "Discover a premium legal streaming experience for cinema across Indian languages. Playback is available only for content with verified distribution rights.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <div className="min-h-screen bg-background text-white">
            <Navbar />
            <main>{children}</main>
            <Footer />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
