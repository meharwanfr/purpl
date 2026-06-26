"use client"

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBrandGithub } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export default function Auth() {
    console.log("lmao :: ",process.env.NEXT_PUBLIC_SUPABASE_URL);
    

  async function signInWithGithub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="bg-black dark w-screen min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute opacity-10 inset-0 h-full w-full bg-[linear-gradient(to_right,#d678d0_0.6px,transparent_0.6px),linear-gradient(to_bottom,#e2e8f0_0.6px,transparent_0.6px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_90%_55%_at_50%_50%,#000_70%,transparent_100%)]"
        aria-hidden="true"
      />
      <Card size="sm" className="relative z-10 w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>

        <CardFooter>
          <Button onClick={signInWithGithub} variant="outline" size="sm" className="w-full curosr-pointer">
            Sign In With Github <pre> </pre> <IconBrandGithub />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
