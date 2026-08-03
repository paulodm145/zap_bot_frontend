import type { Metadata } from 'next';
import { InternalLoginForm } from '@/components/superadmin/internal-auth';

export const metadata: Metadata = { title: 'Acesso superadmin' };
export default function InternalLoginPage() { return <InternalLoginForm />; }
