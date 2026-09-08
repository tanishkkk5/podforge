import "./globals.css";

export const metadata = {
  title: "Guest Intake — Profit Streams® Podcast",
  description: "Pre-recording guest intake for the Profit Streams® Podcast by Applied Frameworks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
