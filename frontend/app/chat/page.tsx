import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowBigUp, ArrowBigUpDash } from "lucide-react";

export default async function Chat() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="">
      <AppSidebar />

        <h1 className="text-center fixed top-1/3 right-1/2 transform translate-1/2 text-3xl font-bold opactiy-90 ">Good Morning, Meharwan</h1>

        <div className="w-lg h-12 flex items-center gap-2 fixed right-1/2 top-1/2 transform translate-1/2" >
          <Input className="w-full h-full" placeholder="Ask Anything gng"></Input>
          <Button className="h-full scale-90 aspect-square cursor-pointer"> <ArrowBigUp/> </Button>
        </div>

      {/* <main className="min-h-1/2 min-w-1/2 flex items-center justify-center p-4">
      <Input className="w-40" placeholder="Type a message..." />

      </main> */}
    </div>
  );
}
