import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  isAcceptedLocalImage,
  isLocalImageWithinSizeLimit,
  readFileAsDataURL,
} from "@/shared/lib/image-data-url";

export type ImageReferenceMode = "local" | "remote";

export type LocalImageReference = {
  id: string;
  file: File;
  previewURL: string;
  name: string;
};

function createReferenceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useReferenceImages(maxCount: number) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ImageReferenceMode>("local");
  const [localReferences, setLocalReferences] = useState<LocalImageReference[]>([]);
  const [remoteURLs, setRemoteURLs] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const localReferencesRef = useRef(localReferences);

  useEffect(() => {
    localReferencesRef.current = localReferences;
  }, [localReferences]);

  useEffect(() => () => {
    for (const item of localReferencesRef.current) URL.revokeObjectURL(item.previewURL);
  }, []);

  const remoteCount = remoteURLs.map((value) => value.trim()).filter(Boolean).length;
  const activeCount = mode === "local" ? localReferences.length : remoteCount;
  const hasReferences = activeCount > 0;

  function appendLocalFiles(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return;
    const remaining = maxCount - localReferences.length;
    if (remaining <= 0) {
      setError(t("creativeConsole.errors.imageReferenceLimit", { count: maxCount }));
      return;
    }
    const next: LocalImageReference[] = [];
    let nextError = "";
    for (const file of Array.from(fileList)) {
      if (next.length >= remaining) {
        nextError = t("creativeConsole.errors.imageReferenceLimit", { count: maxCount });
        break;
      }
      if (!isAcceptedLocalImage(file)) {
        nextError = t("creativeConsole.errors.imageReferenceType");
        continue;
      }
      if (!isLocalImageWithinSizeLimit(file)) {
        nextError = t("creativeConsole.errors.imageReferenceTooLarge");
        continue;
      }
      next.push({
        id: createReferenceId(),
        file,
        previewURL: URL.createObjectURL(file),
        name: file.name,
      });
    }
    if (next.length > 0) setLocalReferences((current) => [...current, ...next]);
    setError(nextError);
  }

  function removeLocalReference(id: string): void {
    setLocalReferences((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewURL);
      return current.filter((item) => item.id !== id);
    });
    setError("");
  }

  function beginReplaceLocalReference(id: string): void {
    replaceTargetIdRef.current = id;
    replaceFileInputRef.current?.click();
  }

  function replaceLocalReference(fileList: FileList | null): void {
    const targetId = replaceTargetIdRef.current;
    replaceTargetIdRef.current = null;
    const file = fileList?.[0];
    if (!targetId || !file) return;
    if (!isAcceptedLocalImage(file)) {
      setError(t("creativeConsole.errors.imageReferenceType"));
      return;
    }
    if (!isLocalImageWithinSizeLimit(file)) {
      setError(t("creativeConsole.errors.imageReferenceTooLarge"));
      return;
    }
    setLocalReferences((current) => current.map((item) => {
      if (item.id !== targetId) return item;
      URL.revokeObjectURL(item.previewURL);
      return {
        id: item.id,
        file,
        previewURL: URL.createObjectURL(file),
        name: file.name,
      };
    }));
    setError("");
  }

  function updateRemoteURL(index: number, value: string): void {
    setRemoteURLs((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setError("");
  }

  function addRemoteURLField(): void {
    setRemoteURLs((current) => {
      if (current.length >= maxCount) {
        setError(t("creativeConsole.errors.imageReferenceLimit", { count: maxCount }));
        return current;
      }
      setError("");
      return [...current, ""];
    });
  }

  function removeRemoteURLField(index: number): void {
    setRemoteURLs((current) => {
      if (current.length <= 1) return [""];
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
    setError("");
  }

  async function resolveURLs(): Promise<string[]> {
    if (mode === "remote") {
      return remoteURLs.map((value) => value.trim()).filter(Boolean).slice(0, maxCount);
    }
    return Promise.all(localReferences.slice(0, maxCount).map((item) => readFileAsDataURL(item.file)));
  }

  function clear(): void {
    setLocalReferences((current) => {
      for (const item of current) URL.revokeObjectURL(item.previewURL);
      return [];
    });
    setRemoteURLs([""]);
    setError("");
    replaceTargetIdRef.current = null;
  }

  return {
    maxCount,
    mode,
    setMode,
    localReferences,
    remoteURLs,
    error,
    setError,
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
    resolveURLs,
    clear,
  };
}

export type ReferenceImagesController = ReturnType<typeof useReferenceImages>;
