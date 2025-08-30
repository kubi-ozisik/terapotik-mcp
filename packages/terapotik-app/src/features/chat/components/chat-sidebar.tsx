"use client";

import type { User } from "next-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SidebarHistory } from "./chat-history";
import { SidebarUserNav } from "./sidebar-user-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar({
  user,
  isCollapsed,
}: {
  user: User | null;
  isCollapsed: boolean;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar
      className="group-data-[side=left]:border-r-0 max-w-[280px] z-50"
      collapsible="offcanvas"
    >
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/test-chat-2"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Agent Smeet
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/test-chat-2");
                      router.refresh();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Chat</TooltipContent>
              </Tooltip>
              <SidebarTrigger className="p-2 h-fit" />
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
