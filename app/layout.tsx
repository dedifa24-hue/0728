import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GOOGLE_ANALYTICS_ID = "G-5TE8Y1SKDC";

export const metadata: Metadata = {
  title: "행운 번호 | 로또 6/45 번호 추첨기",
  description: "1부터 45까지 중복 없이 여섯 개의 행운 번호를 뽑아보세요.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
