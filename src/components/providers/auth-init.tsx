"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthInit() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return null;
}
