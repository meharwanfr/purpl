import { Button } from "@/components/ui/button";
import { IconArrowUpRight } from "@tabler/icons-react";
import { NotchNavbar } from "@/components/ui/notch-navbar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-black dark w-screen min-h-screen overflow-hidden">
      <NotchNavbar />
      <div className="relative min-h-screen w-full bg-black text-white">
        <div
          className="absolute opacity-10 inset-0 h-full w-full bg-[linear-gradient(to_right,#e2e8f0_0.6px,transparent_0.6px),linear-gradient(to_bottom,#e2e8f0_0.6px,transparent_0.6px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_90%_55%_at_50%_50%,#000_70%,transparent_100%)]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
          <h1 className="text-6xl font-bold tracking-tight mb-7">Purpl AI</h1>
          <h2 className="text-3xl opacity-90 font-bold tracking-tight">
            Your Personal AI Assistent
          </h2>
          <Link
            href="/auth"
          >
            <Button className="cursor-pointer mt-5">
              Try Now <IconArrowUpRight />
            </Button>
          
          </Link>
        </div>
      </div>
    </div>
  );
}
