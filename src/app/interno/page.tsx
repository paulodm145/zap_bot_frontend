import type { Metadata } from 'next';
import { InternalDashboard } from '@/components/superadmin/internal-dashboard';

export const metadata: Metadata = { title: 'Superadmin' };
export default function InternalHomePage() { return <InternalDashboard />; }
