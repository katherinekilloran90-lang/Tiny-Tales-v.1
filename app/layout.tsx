import type { Metadata, Viewport } from "next";
import "./globals.css";

// Note: we deliberately use a system font stack (defined in globals.css)
// instead of next/font/google. That keeps the production build fully
// self-contained — it never needs to reach fonts.googleapis.com at build
// time, which makes builds faster and more reliable in locked-down CI/build
// environments. Swap in next/font/google (e.g. Baloo 2 + Nunito) if you'd
// like custom webfonts and your build environment has open internet access.

export const metadata: Metadata = {
  title: "Tiny Tales — Every bedtime begins with an idea",
  description:
    "Tell Tiny Tales an idea and watch it write and illustrate a one-of-a-kind children's storybook, just for your child.",
};

export const viewport: Viewport = {
  themeColor: "#ff4fa3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
