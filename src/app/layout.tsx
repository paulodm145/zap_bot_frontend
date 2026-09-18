import type { Metadata } from 'next';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: { default: 'ZapBot', template: '%s | ZapBot' },
  description: 'Automação de conversas com fluxos inteligentes.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
