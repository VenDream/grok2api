import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useNaturalImageSize } from "@/shared/hooks/use-natural-image-size";
import { computeReferencePreviewLayout } from "@/shared/lib/reference-preview-layout";
import { cn } from "@/shared/lib/cn";

export function ReferencePreviewStrip({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max items-center gap-2">
        {children}
      </div>
    </div>
  );
}

export function ReferenceImagePreview({ url, alt, actions }: { url: string; alt: string; actions?: ReactNode }) {
  const { t } = useTranslation();
  const { status, size } = useNaturalImageSize(url);
  const layout = computeReferencePreviewLayout(size);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen]);

  return (
    <>
      <div
        className="group relative shrink-0 overflow-hidden rounded-lg bg-muted"
        style={{ width: layout.width, height: layout.height }}
      >
        {status === "failed" ? (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
            {t("creativeConsole.referencePreviewFailed")}
          </div>
        ) : (
          <button
            type="button"
            className="relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxOpen(true)}
            aria-label={t("creativeConsole.openReferencePreview")}
            disabled={status !== "ready"}
          >
            <img
              src={url}
              alt={alt}
              className={cn(
                "h-full w-full",
                layout.objectFit === "cover" ? "object-cover" : "object-contain",
                status === "loading" && "opacity-0",
              )}
              draggable={false}
              referrerPolicy="no-referrer"
            />
            {status === "loading" ? (
              <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
            ) : null}
          </button>
        )}
        {actions ? (
          <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-end gap-px bg-black/55 px-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            {actions}
          </div>
        ) : null}
      </div>

      {lightboxOpen && status === "ready"
        ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-label={t("creativeConsole.openReferencePreview")}
            onClick={() => setLightboxOpen(false)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-[101] size-9 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
              aria-label={t("common.close")}
              onClick={() => setLightboxOpen(false)}
            >
              <X className="size-4" />
            </Button>
            <img
              src={url}
              alt={alt}
              className="max-h-[90vh] max-w-[min(96vw,1200px)] object-contain shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
