// src/components/chat.tsx
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { ChatHeader } from './chat-header';
import { VisibilityType } from './visibility-selector';
import { Session } from 'next-auth';
import { Attachment, ChatMessage } from '../core/types';
import { Messages } from './messages';
import { fetcher, fetchWithErrorHandlers } from '../lib/chat-utils';
import { ChatVote } from '@prisma/client';
import useSWR, { unstable_serialize, useSWRConfig } from 'swr';
import { generateUUID } from '@/lib/utils';
import { useDataStream } from './data-stream-provider';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { ChatSDKError } from '../core/errors';
import { toast } from 'sonner';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { MultimodalInput } from './multimodal-input';
import { Artifact } from './artifact';

export function Chat({
  chatId, 
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  chatId: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const [input, setInput] = useState<string>('');
  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  
  const { 
    messages, 
    sendMessage, 
    setMessages,
    status,
    stop,
    regenerate,
    resumeStream
  } = useChat({
    id: chatId,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({messages, id, body}) {
        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: initialChatModel,
            selectedVisibilityType: initialVisibilityType,
            ...body,
          }
        }
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : [dataPart]));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      }
    }
  });

  const { data: votes } = useSWR<Array<ChatVote>>(
    messages.length >= 2 ? `/api/chat/vote?chatId=${chatId}` : null,
    fetcher,
  );

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={chatId}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />
        <Messages
          chatId={chatId}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />
        <div className="sticky bottom-0 flex gap-2 px-4 pb-4 mx-auto w-full bg-background md:pb-6 md:max-w-3xl z-[1] border-t-0">
          {!isReadonly && (
            <MultimodalInput
              chatId={chatId}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={initialVisibilityType}
            />
          )}
        </div>
      </div>
      <Artifact
        chatId={chatId}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={initialVisibilityType}
      />
    </>
  );
}