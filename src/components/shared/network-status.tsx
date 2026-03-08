"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

export default function NetworkStatus() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true;
      toast.error("网络连接已断开", {
        id: "network-status",
        description: "请检查您的网络连接，部分功能可能暂不可用",
        duration: Infinity,
        icon: <WifiOff className="h-4 w-4" />,
      });
    };

    const handleOnline = () => {
      if (wasOffline.current) {
        wasOffline.current = false;
        toast.success("网络已恢复", {
          id: "network-status",
          description: "您的网络连接已恢复正常",
          duration: 3000,
          icon: <Wifi className="h-4 w-4" />,
        });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
