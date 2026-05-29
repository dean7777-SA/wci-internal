// Minimal toast shim — logs to console. Replace with a real toast library later.
export function useToast() {
  function toast({ title, variant }: { title: string; variant?: "destructive" | "default" }) {
    if (variant === "destructive") console.error("[toast]", title);
    else console.log("[toast]", title);
  }
  return { toast };
}
