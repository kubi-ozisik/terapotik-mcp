"use client";

import { isToday, isYesterday, subWeeks, subMonths } from "date-fns";
import { useParams } from "next/navigation";
import type { User } from "next-auth";
import { Fragment } from "react";
import useSWR from "swr";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarHistoryItem } from "./chat-history-item";
import { getChatsByUserId } from "@/features/chat/actions/chat-actions";

interface ChatWithMessages {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  visibility: string;
}

type GroupedChats = {
  today: ChatWithMessages[];
  yesterday: ChatWithMessages[];
  lastWeek: ChatWithMessages[];
  lastMonth: ChatWithMessages[];
  older: ChatWithMessages[];
};

const fetcher = async (userId: string) => {
  const result = await getChatsByUserId({
    id: userId,
    limit: 50,
    startingAfter: null,
    endingBefore: null,
  });
  return result.chats;
};

const groupChatsByDate = (chats: ChatWithMessages[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats
  );
};

export function SidebarHistory({ user }: { user: User | null }) {
  const { id } = useParams();
  const { setOpenMobile } = useSidebar();

  const {
    data: chats,
    isLoading,
    mutate,
  } = useSWR(user ? `chats-${user.id}` : null, () =>
    user?.id ? fetcher(user.id) : null
  );

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const groupedChats = groupChatsByDate(chats);

  const timeGroups = [
    { label: "Today", chats: groupedChats.today },
    { label: "Yesterday", chats: groupedChats.yesterday },
    { label: "Last Week", chats: groupedChats.lastWeek },
    { label: "Last Month", chats: groupedChats.lastMonth },
    { label: "Older", chats: groupedChats.older },
  ];

  const handleDelete = (chatId: string) => {
    mutate((currentChats) => {
      if (currentChats) {
        return currentChats.filter((chat) => chat.id !== chatId);
      }
      return currentChats;
    }, false);
  };

  return (
    <>
      {timeGroups.map(({ label, chats }) => {
        if (chats.length === 0) return null;

        return (
          <SidebarGroup key={label}>
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50 font-medium">
              {label}
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === id}
                    onDelete={handleDelete}
                    setOpenMobile={setOpenMobile}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
