import type { ImageTarget } from "@/lib/types";

export type ImageSlotStatus = "loading" | "success" | "error";

export interface ImageSlotState {
  status: ImageSlotStatus;
  image?: string;
}

export type ImageSlotMap = Record<string, ImageSlotState>;

export function slotKey(target: ImageTarget): string {
  return target === "cover" ? "cover" : `page-${target}`;
}
