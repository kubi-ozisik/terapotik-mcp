import { cookies } from "next/headers";

import { AppSidebar } from "@/features/chat/components/chat-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/auth";
import Script from "next/script";
import { DataStreamProvider } from "@/features/chat/components/data-stream-provider";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const user = session?.user || null;
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";
  console.log(user);
  return (
    <div className="">
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <div className="h-screen flex w-full ">
        <DataStreamProvider>
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={user} isCollapsed={isCollapsed} />
            <SidebarInset className="flex-1 relative">
              {children}
            </SidebarInset>
          </SidebarProvider>
        </DataStreamProvider>
      </div>
    </div>
  );
}
