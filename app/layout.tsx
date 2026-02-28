import type { Metadata } from "next";
import "./globals.css";
import "highlight.js/styles/github-dark.min.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/context/auth-context";

export const metadata: Metadata = {
  title: "Beblocky IDE",
  description: "Created with Beblocky",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
