"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  name?: string | null
  image?: string | null
  className?: string
  size?: "default" | "sm" | "lg"
}

export function UserAvatar({ name, image, className, size = "default" }: UserAvatarProps) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Avatar size={size} className={cn("border border-border/40 shadow-sm", className)}>
      {image && <AvatarImage src={image} alt={name || "User Avatar"} className="object-cover" />}
      <AvatarFallback className="bg-gradient-to-br from-brand-teal/20 to-brand-navy/10 text-brand-teal font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
