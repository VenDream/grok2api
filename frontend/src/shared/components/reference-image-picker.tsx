import { ImagePlus, RefreshCw, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ReferenceImagePreview,
  ReferencePreviewStrip,
} from "@/shared/components/reference-image-preview";
import {
  type ImageReferenceMode,
  type ReferenceImagesController,
} from "@/shared/hooks/use-reference-images";
import { ACCEPTED_LOCAL_IMAGE_ACCEPT } from "@/shared/lib/image-data-url";
import { REFERENCE_PREVIEW_HEIGHT } from "@/shared/lib/reference-preview-layout";
import { cn } from "@/shared/lib/cn";

export function ReferenceImagePicker({
  controller,
  localHint,
  remoteHint,
  disabled = false,
  title,
  triggerLabel,
  triggerActiveLabel,
  icon,
}: {
  controller: ReferenceImagesController;
  localHint: string;
  remoteHint: string;
  disabled?: boolean;
  /** Popover title; defaults to reference-image copy. */
  title?: string;
  /** Trigger label when empty. */
  triggerLabel?: string;
  /** Trigger label when items are selected; falls back to count. */
  triggerActiveLabel?: string;
  icon?: ReactNode;
}) {
  const { t } = useTranslation();
  const {
    maxCount,
    mode,
    setMode,
    localReferences,
    remoteURLs,
    error,
    activeCount,
    hasReferences,
    addFileInputRef,
    replaceFileInputRef,
    appendLocalFiles,
    removeLocalReference,
    beginReplaceLocalReference,
    replaceLocalReference,
    updateRemoteURL,
    addRemoteURLField,
    removeRemoteURLField,
  } = controller;
  const allowMultiple = maxCount > 1;
  const titleText = title ?? t("creativeConsole.referenceImage");
  const emptyLabel = triggerLabel ?? t("creativeConsole.referenceImageShort");
  const activeLabel = triggerActiveLabel
    ?? t("creativeConsole.referenceImageCount", { count: activeCount });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1.5 px-2 font-normal", hasReferences && "bg-secondary/70 text-foreground")}
          aria-label={titleText}
          disabled={disabled}
        >
          {icon ?? <ImagePlus />}
          {hasReferences ? activeLabel : emptyLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium">{titleText}</div>
          <div className="text-[11px] text-muted-foreground">{activeCount}/{maxCount}</div>
        </div>
        <Tabs value={mode} onValueChange={(value) => setMode(value as ImageReferenceMode)}>
          <TabsList className="grid h-8 w-full grid-cols-2 rounded-full bg-secondary/60 p-0.5">
            <TabsTrigger className="rounded-full text-xs" value="local">{t("creativeConsole.referenceModeLocal")}</TabsTrigger>
            <TabsTrigger className="rounded-full text-xs" value="remote">{t("creativeConsole.referenceModeRemote")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "local" ? (
          <div className="space-y-2">
            <input
              ref={addFileInputRef}
              type="file"
              accept={ACCEPTED_LOCAL_IMAGE_ACCEPT}
              multiple={allowMultiple}
              className="hidden"
              onChange={(event) => {
                appendLocalFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={replaceFileInputRef}
              type="file"
              accept={ACCEPTED_LOCAL_IMAGE_ACCEPT}
              className="hidden"
              onChange={(event) => {
                replaceLocalReference(event.target.files);
                event.target.value = "";
              }}
            />
            {localReferences.length === 0 ? (
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-background/40 px-3 py-6 text-xs text-muted-foreground transition-colors hover:bg-secondary/40"
                onClick={() => addFileInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                {t("creativeConsole.uploadReferenceImages")}
              </button>
            ) : (
              <ReferencePreviewStrip>
                {localReferences.map((item) => (
                  <ReferenceImagePreview
                    key={item.id}
                    url={item.previewURL}
                    alt={item.name}
                    actions={(
                      <>
                        <Button type="button" size="icon" variant="ghost" className="size-5 text-white hover:bg-white/15 hover:text-white [&_svg]:size-2.5" aria-label={t("creativeConsole.replaceReferenceImage")} onClick={() => beginReplaceLocalReference(item.id)}>
                          <RefreshCw />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="size-5 text-white hover:bg-white/15 hover:text-white [&_svg]:size-2.5" aria-label={t("creativeConsole.removeReferenceImage")} onClick={() => removeLocalReference(item.id)}>
                          <X />
                        </Button>
                      </>
                    )}
                  />
                ))}
                {localReferences.length < maxCount ? (
                  <button
                    type="button"
                    className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border/80 text-muted-foreground transition-colors hover:bg-secondary/40"
                    style={{ width: REFERENCE_PREVIEW_HEIGHT, height: REFERENCE_PREVIEW_HEIGHT }}
                    aria-label={t("creativeConsole.addReferenceImage")}
                    onClick={() => addFileInputRef.current?.click()}
                  >
                    <ImagePlus className="size-4" />
                  </button>
                ) : null}
              </ReferencePreviewStrip>
            )}
            <p className="text-[11px] leading-4 text-muted-foreground">{localHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {remoteURLs.map((value, index) => {
              const previewURL = value.trim();
              return (
                <div key={`remote-url-${index}`} className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={value}
                    onChange={(event) => updateRemoteURL(index, event.target.value)}
                    placeholder="https://..."
                    aria-label={t("creativeConsole.referenceImageURL", { index: index + 1 })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label={t("creativeConsole.removeReferenceImage")}
                    onClick={() => removeRemoteURLField(index)}
                    disabled={remoteURLs.length === 1 && !previewURL}
                  >
                    <X />
                  </Button>
                </div>
              );
            })}
            {allowMultiple ? (
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={addRemoteURLField} disabled={remoteURLs.length >= maxCount}>
                <ImagePlus className="size-3.5" />
                {t("creativeConsole.addReferenceURL")}
              </Button>
            ) : null}
            {remoteURLs.some((value) => value.trim()) ? (
              <ReferencePreviewStrip>
                {remoteURLs.map((value, index) => {
                  const previewURL = value.trim();
                  if (!previewURL) return null;
                  return (
                    <ReferenceImagePreview
                      key={`remote-preview-${index}-${previewURL}`}
                      url={previewURL}
                      alt={t("creativeConsole.referenceImageURL", { index: index + 1 })}
                    />
                  );
                })}
              </ReferencePreviewStrip>
            ) : null}
            <p className="text-[11px] leading-4 text-muted-foreground">{remoteHint}</p>
          </div>
        )}
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
