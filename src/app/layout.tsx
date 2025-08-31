import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutProvider } from "@/lib/layout-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Hukasa - AI Virtual Staging Platform",
  description: "Transform property listings with AI-powered virtual staging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LayoutProvider>
            {children}
            <Toaster />
          </LayoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
