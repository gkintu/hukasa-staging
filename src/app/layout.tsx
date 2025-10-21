import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
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
  const cookieStore = cookies();
  const storedTheme =
    cookieStore.get("theme")?.value ??
    cookieStore.get("next-theme")?.value ??
    "system";

  const systemPreference =
    headers().get("sec-ch-prefers-color-scheme") === "dark" ? "dark" : "light";

  const initialTheme =
    storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : systemPreference;

  const htmlClassName = [
    GeistSans.variable,
    initialTheme === "dark" ? "dark" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang="en"
      className={htmlClassName}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme={initialTheme}
          enableSystem
          disableTransitionOnChange
          initialTheme={initialTheme}
          storageKey="theme"
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
