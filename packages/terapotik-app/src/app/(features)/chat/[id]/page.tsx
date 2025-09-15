import { getChatById, getMessagesByChatId } from "@/features/chat/actions/chat-actions";
import { Chat } from "@/features/chat/components/chat";
import { DataStreamHandler } from "@/features/chat/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/core/models";
import { convertToUIMessages } from "@/features/chat/lib/chat-utils";
import { getCurrentUser } from "@/shared/helpers";
import { notFound } from "next/navigation";


const ChatPage = async ({ params }: { params: Promise<{ id: string }> }) => {

    const { id } = await params;
    const chat = await getChatById({ id });

    if (!chat) {
        return notFound();
    }

    const user = await getCurrentUser();
    if (!user) {
        return notFound();
    }

    const messages = await getMessagesByChatId({ id });
    const uiMessages = convertToUIMessages(messages);

    return (
        <>
          <Chat
            chatId={chat.id}
            initialMessages={uiMessages}
            initialChatModel={DEFAULT_CHAT_MODEL}
            initialVisibilityType={"private"}
            isReadonly={user?.id !== chat.userId}
            session={user}
            autoResume={true}
          />
          <DataStreamHandler />
        </>
      );
};

export default ChatPage;