import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLikelyMarkdown(text: string) {
  return /(\n|^)(#{1,6}\s|\d+\.\s|[-*+]\s|>\s)|```|`[^`]+`|\[[^\]]+\]\([^\)]+\)|\*\*[^*]+\*\*|_[^_]+_/m.test(
    text,
  );
}