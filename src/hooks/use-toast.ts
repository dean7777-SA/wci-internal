import { toast as sonnerToast } from "sonner";

export function useToast() {
  function toast({ title, variant }: { title: string; variant?: "destructive" | "default" }) {
    if (variant === "destructive") sonnerToast.error(title);
    else sonnerToast.success(title);
  }
  return { toast };
}
