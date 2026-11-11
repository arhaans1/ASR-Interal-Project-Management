import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
    title: 'Client Portal - ASR Media Pro',
};

// The one address every client uses. After signing in they land on their own portal.
export default function ClientLoginPage() {
    return <LoginForm variant="client" />;
}
