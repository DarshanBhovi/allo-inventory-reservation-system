import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Allo Reservations',
  description: 'Reservation demo for product stock and checkout holds.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <main className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
