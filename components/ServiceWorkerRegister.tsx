"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // sw.js lives at the site root incl. project basePath.
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    // A newly deployed build takes over the open page instead of waiting for a
    // full browser restart. Reload at most once per session to avoid a loop.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem("sw-reloaded") === "1") return;
      sessionStorage.setItem("sw-reloaded", "1");
      window.location.reload();
    });

    navigator.serviceWorker
      .register(`${base}/sw.js`, {
        scope: `${base}/`,
        // Never trust a cached copy of sw.js, so version bumps apply immediately.
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch((error) => console.error("Service worker registration failed:", error));
  }, []);

  return null;
}
