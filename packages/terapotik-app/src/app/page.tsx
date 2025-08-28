// src/app/page.tsx
import { Chat } from '@/components/chat';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Chat />
    </div>
  );
}