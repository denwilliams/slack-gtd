import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Slack GTD Bot",
  description: "A Slack bot for Getting Things Done methodology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
