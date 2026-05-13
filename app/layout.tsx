import type { Metadata } from "next";
import "./globals.css";
import "highlight.js/styles/github-dark.min.css";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "BeBlocky IDE",
  description:
    "Work through lesson steps, write code, and run it in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
