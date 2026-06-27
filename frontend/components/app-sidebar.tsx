"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function AppSidebar({className}: {className?: string}) {
  // const conversations = await fetch(`${process.env.BACKEND_API}/conversations`).then((res) => res.json());

  const supabase = createClient();

  const { setTheme } = useTheme();

  const conversations = [
    { id: 1, name: "Conversation 1" },
    { id: 2, name: "Conversation 2" },
    { id: 3, name: "Conversation 3" },
  ];

  return (
    <Sidebar  >
      <SidebarHeader className="ml-4 mt-1">Purpl AI</SidebarHeader>
      <SidebarContent className="p-2">
        <div className="w-full h-[0.1px] bg-zinc-700"></div>
        <SidebarGroup>
          {conversations.map((conversation: any) => (
            <SidebarMenuButton key={conversation.id}>
              <span className="">{conversation.name}</span>
            </SidebarMenuButton>
          ))}
        </SidebarGroup>
        <SidebarGroup></SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        {" "}
        {/* Settings Button */}
        <SidebarMenu>
          <SidebarMenuItem className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="flex items-center gap-3"
                    variant="outline"
                  />
                }
              >
                Settings <Settings />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mb-1">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>

                  <DropdownMenuItem
                    render={
                      <Link
                        className="flex items-center gap-3"
                        href="/profile"
                      />
                    }
                  >
                    Profile
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem>Billing</DropdownMenuItem> */}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="ml-3">
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuItem
                    onClick={async () => {
                      const { error } = await supabase.auth.signOut({});
                      window.location.href = "/";
                    }}
                  >
                    Logout{" "}
                    <span className="ml-2">
                      <LogOutIcon />
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

        <SidebarRail />

    </Sidebar>
  );
}
