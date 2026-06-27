"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  LogOutIcon,
  Settings,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import {
  getConversations,
  createConversation,
  deleteConversation,
  type Conversation,
} from "@/lib/api";

export function AppSidebar() {
  const router = useRouter();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const supabase = createClient();
  const { setTheme } = useTheme();

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    setActiveConvId(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("conv")
        : null,
    );
  }, []);

  useEffect(() => {
    const refetch = () => fetchConversations();
    const onUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveConvId(params.get("conv"));
    };
    const onTitleUpdate = (e: Event) => {
      const { id, title } = (e as CustomEvent).detail;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    };

    window.addEventListener("conversation-created", refetch);
    window.addEventListener("conversation-updated", refetch);
    window.addEventListener("conversation-title", onTitleUpdate);
    window.addEventListener("popstate", onUrlChange);

    return () => {
      window.removeEventListener("conversation-created", refetch);
      window.removeEventListener("conversation-updated", refetch);
      window.removeEventListener("conversation-title", onTitleUpdate);
      window.removeEventListener("popstate", onUrlChange);
    };
  }, [fetchConversations]);

  async function handleNewConversation() {
    setCreating(true);
    try {
      const { conversation } = await createConversation();
      setActiveConvId(String(conversation.id));
      router.push(`/chat?conv=${conversation.id}`);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (deleting === id) return;
    setDeleting(id);
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === String(id)) {
        setActiveConvId(null);
        router.push("/chat");
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  function handleSelectConversation(id: number) {
    setActiveConvId(String(id));
    router.push(`/chat?conv=${id}`);
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-2">
        <span className="font-semibold text-sm">Purpl AI</span>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={handleNewConversation}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </SidebarHeader>

      <div className="px-3">
        <div className="h-px bg-border" />
      </div>

      <SidebarContent className="p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <SidebarGroup>
            {conversations.map((conv) => {
              const isActive = activeConvId === String(conv.id);
              return (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="group flex items-center gap-2 w-full"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm text-left">
                      {conv.title || "Untitled"}
                    </span>

                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost">
                            {" "}
                            <Trash2 />{" "}
                          </Button>
                        }
                      ></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your this conversation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(e, conv.id)}
                            variant="destructive"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* <span
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted cursor-pointer"
                    >

                      {deleting === conv.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      )}
                    </span> */}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="flex items-center gap-3 w-full"
                    variant="outline"
                  />
                }
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mb-1 w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem
                    render={
                      <a className="flex items-center gap-3" href="/profile" />
                    }
                  >
                    Profile
                  </DropdownMenuItem>
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
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                  >
                    <LogOutIcon className="w-4 h-4 mr-2" />
                    Logout
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
