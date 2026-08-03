import type { Metadata } from 'next';
import { InternalTwoFactorForm } from '@/components/superadmin/internal-auth';

export const metadata: Metadata = { title: 'Verificação superadmin' };
export default function InternalTwoFactorPage() { return <InternalTwoFactorForm />; }
