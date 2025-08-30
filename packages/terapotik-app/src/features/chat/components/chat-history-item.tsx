"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { deleteChatById } from "@/features/chat/actions/chat-actions";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  visibility: string;
}

interface SidebarHistoryItemProps {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}

export function SidebarHistoryItem({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: SidebarHistoryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const deletePromise = deleteChatById({ id: chat.id });

      toast.promise(deletePromise, {
        loading: "Deleting chat...",
        success: () => {
          onDelete(chat.id);
          return "Chat deleted successfully";
        },
        error: "Failed to delete chat",
      });

      await deletePromise;
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidebarMenuItem className="group/item">
      <div className="flex items-center w-full">
        <SidebarMenuButton asChild isActive={isActive} className="flex-1">
          <Link
            href={`/test-chat/${chat.id}`}
            onClick={() => setOpenMobile(false)}
          >
            <span className="truncate text-sm font-medium">{chat.title}</span>
          </Link>
        </SidebarMenuButton>

        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 p-0 shrink-0 mr-1 transition-opacity",
                "opacity-0 group-hover/item:opacity-100",
                isActive && "opacity-100"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
              onSelect={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarMenuItem>
  );
}
