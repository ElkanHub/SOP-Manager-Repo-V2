"use client"

import { useState } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VersionHistorySheet } from "@/components/library/version-history-sheet"
import { SopVersion } from "@/types/app.types"

function VersionHistorySheetButton({
  versions,
  currentVersion,
}: {
  versions: SopVersion[]
  currentVersion: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-primary">
        <History className="h-4 w-4 mr-2" />
        Version History
      </Button>
      <VersionHistorySheet
        open={open}
        onOpenChange={setOpen}
        versions={versions}
        currentVersion={currentVersion}
      />
    </>
  )
}

export default VersionHistorySheetButton
