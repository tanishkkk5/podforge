import "./globals.css";
import Header from "./components/Header";

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
          <div className="af-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
