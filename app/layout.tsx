import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
