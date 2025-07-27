"use client"

import { useCompletion } from "@ai-sdk/react"
import {
  Archive,
  Clock,
  Copy,
  Download,
  Eye,
  History,
  Share,
  Trash2,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const actionButtons = [
  { icon: History, label: "History" },
  { icon: Clock, label: "Recent" },
  { icon: Share, label: "Share" },
  { icon: Eye, label: "Preview" },
  { icon: Copy, label: "Copy" },
  { icon: Download, label: "Download" },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Delete" },
]

export default function App() {
  const { completion, input, handleInputChange, handleSubmit, isLoading } =
    useCompletion({
      api: "/api/generate-response",
    })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-lg font-semibold">Web App • v2</h1>
          </div>
          <div className="flex items-center gap-1">
            {actionButtons.map((button, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <button.icon className="h-4 w-4" />
                <span className="sr-only">{button.label}</span>
              </Button>
            ))}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">
                Content area - ready for your application
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This is where your main content will be displayed
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
