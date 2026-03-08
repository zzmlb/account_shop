"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ShareButtonsProps {
  title: string;
  url?: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getUrl = () =>
    url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      toast.success("链接已复制");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const shareToWeibo = () => {
    const shareUrl = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(getUrl())}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const shareToTelegram = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(getUrl())}&text=${encodeURIComponent(title)}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">分享</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 text-[var(--success)]" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          复制链接
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToWeibo} className="gap-2 cursor-pointer">
          <span className="flex h-4 w-4 items-center justify-center text-xs font-bold text-red-500">
            微
          </span>
          分享到微博
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTelegram} className="gap-2 cursor-pointer">
          <span className="flex h-4 w-4 items-center justify-center text-xs font-bold text-sky-500">
            T
          </span>
          分享到Telegram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
