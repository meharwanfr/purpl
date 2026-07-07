"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { LogOut, Mail, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconBrandGithub } from "@tabler/icons-react";

export default function UserProfile() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        setUser(user);
      }
      setLoading(false);
    }

    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  const { avatar_url, user_name, full_name } = user.user_metadata;

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4 mt-10">
      <Card className="w-full max-w-md overflow-hidden border border-border/50 shadow-lg bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center pt-6 pb-2">
          <Avatar className="w-24 h-24 border-2 border-border shadow-inner ring-3 ring-muted">
            <AvatarImage src={avatar_url} alt={`${user_name}'s avatar`} />
            <AvatarFallback className="text-xl bg-secondary font-semibold">
              {(full_name || user_name || "?").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center mt-4 space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {full_name || user_name}
            </CardTitle>
            <CardDescription className="text-md mt-3 font-medium text-muted-foreground flex items-center justify-center gap-2">
              <IconBrandGithub className="w-3.5 h-3.5" /> @{user_name}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 py-1">
          <hr className="border-border/60" />
          
          <div className="flex items-center gap-3 text-sm rounded-lg p-3 bg-muted/40 border border-muted-foreground/10">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email Address</p>
              <p className="font-medium truncate text-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm rounded-lg p-3 bg-muted/40 border border-muted-foreground/10">
            <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Account ID</p>
              <p className="font-mono text-xs truncate text-muted-foreground select-all">{user.id}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-6 pb-6 pt-2">
          <Button 
            onClick={handleSignOut} 
            variant="destructive" 
            className="w-full cursor-pointer flex items-center justify-center gap-2 font-medium shadow-sm transition-transform active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}