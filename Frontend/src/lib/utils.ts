import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function openExternalLink(url: string) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export function formatItemType(type: string | null | undefined): string {
  return (type || "document")
    .replace("image_presentation", "presentation")
    .replace(/_/g, " ");
}
