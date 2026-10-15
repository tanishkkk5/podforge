import "./globals.css";
import Header from "./components/Header";
import SectionTabs from "./components/SectionTabs";

export const metadata = {
  title: "Podforge — Profit Streams® Podcast",
  description: "Podforge: podcast operations for the Profit Streams® Podcast by Applied Frameworks.",
  icons: {
    icon: "/af-swoosh-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="af-shell">
          <Header />
          <main className="af-main">
            <SectionTabs />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
