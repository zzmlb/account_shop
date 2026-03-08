import { Loader2 } from "lucide-react";

export default function ShopLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2
        className="h-10 w-10 animate-spin"
        style={{ color: "var(--primary)" }}
      />
      <p
        className="text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        加载中...
      </p>
    </div>
  );
}
