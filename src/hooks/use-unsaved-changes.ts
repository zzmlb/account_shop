"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Hook to warn users about unsaved changes before leaving the page.
 * Pass `isDirty` as true when form has unsaved modifications.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!dirtyRef.current) return;
    e.preventDefault();
    // Modern browsers ignore custom messages but still show the dialog
    e.returnValue = "您有未保存的更改，确定要离开吗？";
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);
}
