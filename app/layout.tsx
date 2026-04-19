import type { Metadata } from "next";
import "./globals.css";
import { FeedbackChat } from '@automate/feedback-lib/FeedbackChat';

export const metadata: Metadata = {
  title: "פשוט להזמין",
  description: "סוכן AI למשלוחי מזון — הסל הכי זול בין רמי לוי ושופרסל",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-gray-900">
        {children}
        <FeedbackChat issuesPath="/feedback-lib-issues" />
      </body>
    </html>
  );
}
