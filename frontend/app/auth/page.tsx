"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBrandGithub } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export default function Auth() {
  const siteUrl = process.env.NEXT_PUBLIC_LOCAL_SITE_URL;

  async function signInWithGithub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
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
          <CardTitle className="text-center font-bold ">Sign In</CardTitle>
        </CardHeader>
  <CardContent>
        <p>
         you have to login via your github profile to use this app.
        </p>
      </CardContent>
        <CardFooter>
          <Button onClick={signInWithGithub} variant="outline" size="lg" className="w-full curosr-pointer">
            Sign In With Github <pre> </pre> <IconBrandGithub />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
