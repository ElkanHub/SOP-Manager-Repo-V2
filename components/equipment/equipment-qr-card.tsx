"use client"

import { useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, Download, Share2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Props {
    equipmentId: string
    equipmentName: string
    assetId: string
}

export function EquipmentQrCard({ equipmentId, equipmentName, assetId }: Props) {
    const qrContainerRef = useRef<HTMLDivElement>(null)
    const [copied, setCopied] = useState(false)
    const [downloading, setDownloading] = useState(false)

    const baseUrl =
        (typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL) ||
        "http://localhost:3000"
    const publicUrl = `${baseUrl}/e/${equipmentId}`
    const filenameBase = `qr-${assetId || equipmentId}`.replace(/[^a-z0-9-_]/gi, "_")

    const downloadPng = async () => {
        const svg = qrContainerRef.current?.querySelector("svg")
        if (!svg) return

        setDownloading(true)
        try {
            const clone = svg.cloneNode(true) as SVGSVGElement
            if (!clone.getAttribute("xmlns")) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
            }
            const serialized = new XMLSerializer().serializeToString(clone)
            const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" })
            const url = URL.createObjectURL(svgBlob)

            const img = new window.Image()
            img.crossOrigin = "anonymous"
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve()
                img.onerror = () => reject(new Error("Failed to load QR SVG"))
                img.src = url
            })

            // Render at 4x size for print quality, with caption underneath
            const scale = 4
            const qrSize = 256 * scale
            const captionHeight = 80
            const canvas = document.createElement("canvas")
            canvas.width = qrSize
            canvas.height = qrSize + captionHeight
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas not supported")

            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, qrSize, qrSize)

            ctx.fillStyle = "#0D2B55"
            ctx.textAlign = "center"
            ctx.font = `bold ${18 * scale / 2}px system-ui, -apple-system, sans-serif`
            ctx.fillText(equipmentName, qrSize / 2, qrSize + 28)
            ctx.fillStyle = "#64748b"
            ctx.font = `${12 * scale / 2}px monospace`
            ctx.fillText(assetId, qrSize / 2, qrSize + 54)

            const pngUrl = canvas.toDataURL("image/png")
            const link = document.createElement("a")
            link.href = pngUrl
            link.download = `${filenameBase}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("QR download failed:", err)
        } finally {
            setDownloading(false)
        }
    }

    const handleShare = async () => {
        const shareData = {
            title: `${equipmentName} (${assetId})`,
            text: `Equipment: ${equipmentName}`,
            url: publicUrl,
        }
        if (typeof navigator !== "undefined" && "share" in navigator) {
            try {
                await (navigator as any).share(shareData)
                return
            } catch {
                // user cancelled or share failed — fall through to copy
            }
        }
        try {
            await navigator.clipboard.writeText(publicUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Clipboard write failed:", err)
        }
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">QR Code</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                        Scan to view
                    </span>
                </div>

                <div className="flex justify-center">
                    <div
                        ref={qrContainerRef}
                        className="p-3 rounded-lg bg-white ring-1 ring-border dark:ring-white/10"
                    >
                        <QRCodeSVG
                            value={publicUrl}
                            size={144}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#0D2B55"
                            marginSize={0}
                        />
                    </div>
                </div>

                <p className="text-xs text-center text-muted-foreground break-all">
                    {publicUrl}
                </p>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadPng}
                        disabled={downloading}
                        className="w-full"
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {downloading ? "Saving..." : "Download"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="w-full"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 mr-1.5 text-brand-teal" />
                                Copied
                            </>
                        ) : (
                            <>
                                {typeof navigator !== "undefined" && "share" in navigator ? (
                                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Share
                            </>
                        )}
                    </Button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground/60 leading-relaxed">
                    Print and fix to the machine. Technicians assigned to PM will jump
                    straight into the app; others see a public detail page.
                </p>
            </CardContent>
        </Card>
    )
}
