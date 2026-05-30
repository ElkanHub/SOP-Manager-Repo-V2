"use client"

import { Download, Share } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useInstallPrompt } from "@/hooks/use-install-prompt"

export function InstallButton() {
  const { canInstall, isIos, installed, promptInstall } = useInstallPrompt()

  if (installed) return null
  if (!canInstall && !isIos) return null

  const handleClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall()
      if (outcome === "accepted") {
        toast.success("App installed")
      }
      return
    }
    // iOS fallback — show share-sheet instructions
    toast("Install QMS-MANAJA", {
      description:
        "Tap the Share button in Safari, then choose 'Add to Home Screen'.",
      duration: 8000,
    })
  }

  const Icon = canInstall ? Download : Share

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={handleClick}
            aria-label="Install app"
          />
        }
      >
        <Icon className="h-5 w-5" />
        <span className="sr-only">Install app</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {canInstall ? "Install app" : "How to install on iOS"}
      </TooltipContent>
    </Tooltip>
  )
}
