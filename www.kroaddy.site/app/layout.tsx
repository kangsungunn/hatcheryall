import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "AI 첨삭 서비스",
    description: "서술형 답안을 AI가 교정해드립니다",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className="antialiased" suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}

