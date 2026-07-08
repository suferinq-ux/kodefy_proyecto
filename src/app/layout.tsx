'use client';

import { useState } from 'react';
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import OfflineIndicator from '@/components/OfflineIndicator';
import DynamicFavicon from '@/components/DynamicFavicon';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="es">
      <head>
        <meta name="description" content="Plataforma de gestión multi-inquilino para negocios profesionales." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#f8fafc] text-slate-900`}>
        <AuthProvider>
          <DynamicFavicon />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                style: { borderColor: '#fecaca' },
              },
            }}
          />
          <OfflineIndicator />
          {isLoginPage ? (
            <main className="min-h-screen w-full overflow-x-hidden">{children}</main>
          ) : (
            children
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
