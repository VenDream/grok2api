// Multi-preview strip: unified height within [min, max]; extreme aspect ratios use cover.
export const REFERENCE_PREVIEW_HEIGHT_MIN = 80;
export const REFERENCE_PREVIEW_HEIGHT_MAX = 160;
export const REFERENCE_PREVIEW_HEIGHT = 120;
export const REFERENCE_PREVIEW_WIDTH_MIN = REFERENCE_PREVIEW_HEIGHT_MIN;
export const REFERENCE_PREVIEW_WIDTH_MAX = REFERENCE_PREVIEW_HEIGHT_MAX * 2;

export type NaturalImageSize = {
  width: number;
  height: number;
};

export type PreviewBoxLayout = {
  width: number;
  height: number;
  objectFit: "contain" | "cover";
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeReferencePreviewLayout(size: NaturalImageSize | null): PreviewBoxLayout {
  const height = clampNumber(REFERENCE_PREVIEW_HEIGHT, REFERENCE_PREVIEW_HEIGHT_MIN, REFERENCE_PREVIEW_HEIGHT_MAX);
  if (!size || size.width <= 0 || size.height <= 0) {
    return { width: height, height, objectFit: "contain" };
  }
  const aspect = size.width / size.height;
  const naturalWidth = height * aspect;
  if (naturalWidth < REFERENCE_PREVIEW_WIDTH_MIN || naturalWidth > REFERENCE_PREVIEW_WIDTH_MAX) {
    return {
      width: clampNumber(naturalWidth, REFERENCE_PREVIEW_WIDTH_MIN, REFERENCE_PREVIEW_WIDTH_MAX),
      height,
      objectFit: "cover",
    };
  }
  return { width: naturalWidth, height, objectFit: "contain" };
}
