import "./globals.css";

export const metadata = {
  title: "Guest Intake — Profit Streams® Podcast",
  description: "Pre-recording guest intake for the Profit Streams® Podcast by Applied Frameworks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
