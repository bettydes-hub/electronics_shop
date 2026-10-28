import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electronics Shop API",
  description: "API server for the electronics shop",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
