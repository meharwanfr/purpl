import { Suspense } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="relative w-full ">
        <SidebarTrigger className="m-2 w-6 h-6 " />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
    </SidebarProvider>
  )
}