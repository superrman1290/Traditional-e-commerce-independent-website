import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/analytics-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traditional Commerce",
  description: "Single-merchant ecommerce storefront"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
