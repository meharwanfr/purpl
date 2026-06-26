import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings } from "lucide-react";
import { ModeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export async function AppSidebar() {
  // const conversations = await fetch(`${process.env.BACKEND_API}/conversations`).then((res) => res.json());

  const conversations = [
    { id: 1, name: "Conversation 1" },
    { id: 2, name: "Conversation 2" },
    { id: 3, name: "Conversation 3" },
  ];
  return (
    <Sidebar>
      <SidebarHeader></SidebarHeader>
      <SidebarContent className="p-2">
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
        <SidebarMenu >
          <SidebarMenuItem className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button className="flex items-center gap-3" variant="outline" />}>
                Settings <Settings/>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuItem>Subscription</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
