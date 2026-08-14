package web

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/chenyme/grok2api/backend/internal/infra/provider"
)

func TestWebImageRejects2k(t *testing.T) {
	// Resolve keys off upstream model names, not public IDs.
	for _, model := range []string{"grok-imagine-image", "grok-imagine-image-quality", "grok-imagine-image-2.0"} {
		response, err := (&Adapter{}).GenerateImage(context.Background(), provider.ImageGenerationRequest{
			Model: model, Prompt: "cat", Count: 1, Resolution: "2k",
		})
		if err != nil {
			t.Fatalf("%s err=%v", model, err)
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusBadRequest {
			t.Fatalf("%s status=%d", model, response.StatusCode)
		}
		body, _ := io.ReadAll(response.Body)
		var payload map[string]any
		_ = json.Unmarshal(body, &payload)
		errObj, _ := payload["error"].(map[string]any)
		msg, _ := errObj["message"].(string)
		if !strings.Contains(strings.ToLower(msg), "2k") {
			t.Fatalf("%s message=%q body=%s", model, msg, body)
		}
	}
}
