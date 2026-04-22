import { toast } from "sonner"

interface DownloadOptions {
    url: string
    filename: string
    label: string // e.g. "Exporting slides"
}

/**
 * Fetch a file in the background and trigger an in-page download.
 * Shows a sonner toast with a simulated progress percentage (the server
 * doesn't stream progress, so we ease toward 92% and snap to 100% on receipt).
 */
export async function downloadWithProgress({ url, filename, label }: DownloadOptions) {
    const toastId = `download-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    let progress = 0
    const render = (pct: number, status: "loading" | "success" | "error", message?: string) => {
        const pctText = status === "error" ? "" : ` — ${Math.round(pct)}%`
        const msg = message ?? `${label}${pctText}`
        if (status === "loading") toast.loading(msg, { id: toastId })
        else if (status === "success") toast.success(msg, { id: toastId })
        else toast.error(msg, { id: toastId })
    }

    render(0, "loading")

    const interval = setInterval(() => {
        if (progress >= 92) return
        progress = Math.min(92, progress + Math.max(0.5, (92 - progress) * 0.06))
        render(progress, "loading")
    }, 400)

    try {
        const res = await fetch(url, { method: "GET" })

        if (!res.ok) {
            clearInterval(interval)
            let msg = `${label} failed`
            try {
                const body = await res.json()
                if (body?.error) msg = body.error
            } catch {
                // body wasn't JSON
            }
            render(0, "error", msg)
            return
        }

        // Read body into blob with progress if content-length is available.
        const total = Number(res.headers.get("content-length") || 0)
        let blob: Blob

        if (total > 0 && res.body) {
            const reader = res.body.getReader()
            const chunks: Uint8Array[] = []
            let received = 0
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) {
                    chunks.push(value)
                    received += value.length
                    // Real progress mapped into 92%-99% window
                    const realPct = 92 + (received / total) * 7
                    progress = Math.min(99, realPct)
                    render(progress, "loading")
                }
            }
            blob = new Blob(chunks as BlobPart[], {
                type: res.headers.get("content-type") || "application/octet-stream",
            })
        } else {
            blob = await res.blob()
        }

        clearInterval(interval)
        progress = 100
        render(progress, "loading")

        // Trigger in-page download
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)

        render(100, "success", `${label} — download ready`)
    } catch (e: any) {
        clearInterval(interval)
        render(0, "error", e?.message || `${label} failed`)
    }
}
