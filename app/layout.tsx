import type { Metadata } from "next";
import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
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
        <QueryProvider>
          <MotionProvider>{children}</MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
