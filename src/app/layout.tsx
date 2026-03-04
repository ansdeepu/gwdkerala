import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'GWD Office Dashboard',
  description: 'Official dashboard for the Ground Water Department, Government of Kerala. Manage deposit works, investigations, tenders, and more.',
  keywords: ['Ground Water Department', 'GWD', 'Kerala', 'Water Management', 'Government Dashboard'],
  authors: [{ name: 'Ground Water Department, Govt. of Kerala' }],
  creator: 'Ground Water Department, Govt. of Kerala',
  icons: {
    icon: 'https://placehold.co/64x64/2563EB/FFFFFF.png?text=G',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
