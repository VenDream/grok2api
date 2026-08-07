// Package imagefit prepares reference images for video generation so upstream
// models do not stretch content when the source ratio differs from the target.
package imagefit

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"math"
	"strconv"
	"strings"

	_ "image/gif"  // register GIF decoder
	_ "image/jpeg" // register JPEG decoder
)

const (
	// maxEdge caps the longer canvas side after letterboxing to bound memory.
	maxEdge = 4096
	// ratioEpsilon treats near-matching ratios as equal (no re-encode).
	ratioEpsilon = 0.02
	jpegQuality  = 92
)

// LetterboxToAspectRatio pads image bytes into targetAspect (e.g. "16:9") using
// a black canvas (contain). Returns the original payload when ratio is empty,
// unparsable, already matching, or the image cannot be decoded.
func LetterboxToAspectRatio(data []byte, mimeType, targetAspect string) (out []byte, outMIME string, changed bool, err error) {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	targetAspect = strings.TrimSpace(targetAspect)
	if len(data) == 0 || targetAspect == "" {
		return data, mimeType, false, nil
	}
	tw, th, ok := ParseAspectRatio(targetAspect)
	if !ok {
		return data, mimeType, false, nil
	}
	img, _, decodeErr := image.Decode(bytes.NewReader(data))
	if decodeErr != nil {
		// Unsupported codecs (e.g. webp without decoder) pass through unchanged.
		return data, mimeType, false, nil
	}
	bounds := img.Bounds()
	srcW, srcH := bounds.Dx(), bounds.Dy()
	if srcW <= 0 || srcH <= 0 {
		return data, mimeType, false, nil
	}
	srcAspect := float64(srcW) / float64(srcH)
	target := float64(tw) / float64(th)
	if math.Abs(srcAspect-target)/target <= ratioEpsilon {
		return data, mimeType, false, nil
	}

	canvasW, canvasH := containCanvas(srcW, srcH, target)
	canvasW, canvasH = capMaxEdge(canvasW, canvasH)
	// Fit source inside canvas (scale is 1 unless max-edge cap shrank the canvas).
	scale := math.Min(float64(canvasW)/float64(srcW), float64(canvasH)/float64(srcH))
	drawW := max(1, int(math.Round(float64(srcW)*scale)))
	drawH := max(1, int(math.Round(float64(srcH)*scale)))

	dst := image.NewRGBA(image.Rect(0, 0, canvasW, canvasH))
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: color.Black}, image.Point{}, draw.Src)
	offsetX := (canvasW - drawW) / 2
	offsetY := (canvasH - drawH) / 2
	targetRect := image.Rect(offsetX, offsetY, offsetX+drawW, offsetY+drawH)
	if drawW == srcW && drawH == srcH {
		draw.Draw(dst, targetRect, img, bounds.Min, draw.Src)
	} else {
		// Nearest-neighbor scale into the target rect without external deps.
		scaleDraw(dst, targetRect, img, bounds)
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return nil, "", false, fmt.Errorf("encode letterboxed jpeg: %w", err)
	}
	return buf.Bytes(), "image/jpeg", true, nil
}

// ParseAspectRatio parses "W:H" style ratios used by the video API.
func ParseAspectRatio(value string) (width, height int, ok bool) {
	value = strings.TrimSpace(value)
	parts := strings.Split(value, ":")
	if len(parts) != 2 {
		return 0, 0, false
	}
	w, errW := strconv.Atoi(strings.TrimSpace(parts[0]))
	h, errH := strconv.Atoi(strings.TrimSpace(parts[1]))
	if errW != nil || errH != nil || w <= 0 || h <= 0 {
		return 0, 0, false
	}
	return w, h, true
}

func containCanvas(srcW, srcH int, targetAspect float64) (int, int) {
	srcAspect := float64(srcW) / float64(srcH)
	if srcAspect > targetAspect {
		// Wider than target → grow height (letterbox).
		return srcW, max(1, int(math.Round(float64(srcW)/targetAspect)))
	}
	// Taller than target → grow width (pillarbox). 9:16 into 16:9 hits this path.
	return max(1, int(math.Round(float64(srcH)*targetAspect))), srcH
}

func capMaxEdge(w, h int) (int, int) {
	long := max(w, h)
	if long <= maxEdge {
		return w, h
	}
	scale := float64(maxEdge) / float64(long)
	return max(1, int(math.Round(float64(w)*scale))), max(1, int(math.Round(float64(h)*scale)))
}

// scaleDraw copies src into dstRect with nearest-neighbor sampling.
func scaleDraw(dst *image.RGBA, dstRect image.Rectangle, src image.Image, srcBounds image.Rectangle) {
	srcW := srcBounds.Dx()
	srcH := srcBounds.Dy()
	dstW := dstRect.Dx()
	dstH := dstRect.Dy()
	if srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0 {
		return
	}
	for y := 0; y < dstH; y++ {
		sy := srcBounds.Min.Y + y*srcH/dstH
		for x := 0; x < dstW; x++ {
			sx := srcBounds.Min.X + x*srcW/dstW
			dst.Set(dstRect.Min.X+x, dstRect.Min.Y+y, src.At(sx, sy))
		}
	}
}

// EncodePNG is used by tests to build fixtures without jpeg round-trips.
func EncodePNG(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
