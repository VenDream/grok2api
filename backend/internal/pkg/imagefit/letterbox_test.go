package imagefit

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"
)

func TestLetterboxPortraitIntoLandscape(t *testing.T) {
	// 9:16 style portrait into 16:9 landscape should pillarbox, not stretch.
	src := image.NewRGBA(image.Rect(0, 0, 90, 160))
	for y := 0; y < 160; y++ {
		for x := 0; x < 90; x++ {
			src.Set(x, y, color.RGBA{R: 255, A: 255})
		}
	}
	raw, err := EncodePNG(src)
	if err != nil {
		t.Fatal(err)
	}
	out, mime, changed, err := LetterboxToAspectRatio(raw, "image/png", "16:9")
	if err != nil {
		t.Fatal(err)
	}
	if !changed || mime != "image/jpeg" {
		t.Fatalf("changed=%v mime=%s", changed, mime)
	}
	img, err := jpeg.Decode(bytes.NewReader(out))
	if err != nil {
		t.Fatal(err)
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	// 90x160 → canvas ~284x160 (16:9)
	ratio := float64(w) / float64(h)
	if ratio < 16.0/9.0-0.05 || ratio > 16.0/9.0+0.05 {
		t.Fatalf("canvas ratio = %f (%dx%d), want ~16:9", ratio, w, h)
	}
	// Side pillars should be black; center should stay red.
	left := img.At(b.Min.X+1, b.Min.Y+h/2)
	center := img.At(b.Min.X+w/2, b.Min.Y+h/2)
	if !nearBlack(left) {
		t.Fatalf("left pillar = %#v, want black", left)
	}
	if !nearRed(center) {
		t.Fatalf("center = %#v, want red content", center)
	}
}

func TestLetterboxSkipsMatchingRatio(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 160, 90))
	raw, err := EncodePNG(src)
	if err != nil {
		t.Fatal(err)
	}
	out, _, changed, err := LetterboxToAspectRatio(raw, "image/png", "16:9")
	if err != nil {
		t.Fatal(err)
	}
	if changed || !bytes.Equal(out, raw) {
		t.Fatal("matching ratio should pass through without re-encode")
	}
}

func TestParseAspectRatio(t *testing.T) {
	w, h, ok := ParseAspectRatio("16:9")
	if !ok || w != 16 || h != 9 {
		t.Fatalf("got %d:%d ok=%v", w, h, ok)
	}
	if _, _, ok := ParseAspectRatio("auto"); ok {
		t.Fatal("auto should not parse")
	}
}

func nearBlack(c color.Color) bool {
	r, g, b, _ := c.RGBA()
	return r < 0x1000 && g < 0x1000 && b < 0x1000
}

func nearRed(c color.Color) bool {
	r, g, b, _ := c.RGBA()
	return r > 0x8000 && g < 0x4000 && b < 0x4000
}
