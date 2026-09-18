import { Suspense } from 'react';
import { ChatView } from '@/components/tenant/chat-view';
export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <ChatView />
    </Suspense>
  );
}
