"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  UserIcon,
  LinkIcon,
  BellIcon,
  ShieldIcon,
  ServerIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const settingsMenu = [
  {
    title: "Profile",
    url: "/settings/profile",
    icon: UserIcon,
  },
  {
    title: "Integrations",
    url: "/settings/integrations",
    icon: LinkIcon,
  },
  {
    title: "Terapotik API",
    url: "/settings/terapotik-api",
    icon: ServerIcon,
  },
  {
    title: "Notifications",
    url: "/settings/notifications",
    icon: BellIcon,
  },
  {
    title: "Security",
    url: "/settings/security",
    icon: ShieldIcon,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      <Sidebar className="border-r">
        <SidebarHeader className="p-6">
          <h2 className="text-lg font-semibold">Settings</h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {settingsMenu.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
