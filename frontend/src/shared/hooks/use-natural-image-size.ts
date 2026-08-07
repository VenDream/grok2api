import { useEffect, useState } from "react";

import type { NaturalImageSize } from "@/shared/lib/reference-preview-layout";

export type { NaturalImageSize };

type ImageProbeState =
  | { status: "loading"; size: null; url: string }
  | { status: "ready"; size: NaturalImageSize; url: string }
  | { status: "failed"; size: null; url: string };

export function useNaturalImageSize(url: string): {
  status: "loading" | "ready" | "failed";
  size: NaturalImageSize | null;
} {
  const [state, setState] = useState<ImageProbeState>({ status: "loading", size: null, url });

  // Keep status/size tied to the latest URL without resetting synchronously in the effect body.
  const resolved = state.url === url
    ? state
    : { status: "loading" as const, size: null, url };

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.decoding = "async";
    // Do not set crossOrigin: many remote hosts lack CORS headers, which would
    // block dimension probing even when the browser can still display the image.
    image.onload = () => {
      if (cancelled) return;
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width <= 0 || height <= 0) {
        setState({ status: "failed", size: null, url });
        return;
      }
      setState({ status: "ready", size: { width, height }, url });
    };
    image.onerror = () => {
      if (cancelled) return;
      setState({ status: "failed", size: null, url });
    };
    image.src = url;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      image.src = "";
    };
  }, [url]);

  return { status: resolved.status, size: resolved.size };
}
