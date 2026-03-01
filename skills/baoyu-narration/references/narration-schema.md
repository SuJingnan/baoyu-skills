---
name: narration-schema
description: YAML schema for narration.yaml output
---

# Narration Schema

## Full Schema

```yaml
slides:
  - slide: 1                          # Slide sequence number
    image: 01-slide-cover.png         # Image filename
    sentences:
      - text: "Narration sentence."   # Narration text for this segment
        focus: "center"               # Focus region (see focus-regions.md)
        duration_hint: 3.5            # Estimated duration in seconds
      - text: "Second sentence."
        focus: "top-left"
        duration_hint: 2.8
    ken_burns: "zoom-in"              # Ken Burns effect for this slide
    transition: "circleopen"          # (Optional) Per-slide transition override
```

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slides` | array | yes | Ordered list of slides |
| `slides[].slide` | int | yes | 1-based slide sequence number |
| `slides[].image` | string | yes | Image filename (must exist in input directory) |
| `slides[].sentences` | array | yes | Ordered narration sentences for this slide |
| `slides[].sentences[].text` | string | yes | Narration text (one sentence) |
| `slides[].sentences[].focus` | string | yes | Focus region code (see focus-regions.md) |
| `slides[].sentences[].duration_hint` | float | yes | Estimated speaking duration in seconds |
| `slides[].ken_burns` | string | yes | Ken Burns effect type |
| `slides[].transition` | string | no | Per-slide transition override (see transitions.md) |

## Ken Burns Values

| Value | Description |
|-------|-------------|
| `zoom-in` | Slowly zoom into focus area |
| `zoom-out` | Start zoomed in, slowly zoom out |
| `pan-left` | Slow pan from right to left |
| `pan-right` | Slow pan from left to right |
| `pan-up` | Slow pan from bottom to top |
| `pan-down` | Slow pan from top to bottom |
| `zoom-in-pan-right` | Zoom in while panning right |
| `zoom-in-pan-down` | Zoom in while panning down |
| `zoom-out-pan-left` | Zoom out while panning left |
| `zoom-out-pan-up` | Zoom out while panning up |
| `drift` | Gentle floating motion with breathing feel |
| `none` | Static frame, no animation |

## Transition Values (Optional)

| Value | Description |
|-------|-------------|
| `fade` | Cross-fade |
| `dissolve` | Dissolve blend |
| `none` | Hard cut |
| `wipeleft` / `wiperight` / `wipeup` / `wipedown` | Directional wipe |
| `slideleft` / `slideright` / `slideup` / `slidedown` | Directional slide push |
| `circleopen` / `circleclose` | Circle expand/shrink |
| `radial` | Radial sweep |
| `fadeblack` / `fadewhite` | Fade through black/white |
| `pixelize` | Pixelate transition |
| `zoomin` | Zoom-in transition |

## Duration Hint Guidelines

| Language | Chars/second | Example |
|----------|-------------|---------|
| English | ~15 chars/s | "Hello world" (11 chars) ≈ 0.7s |
| Chinese | ~4 chars/s | "你好世界" (4 chars) ≈ 1.0s |
| Japanese | ~5 chars/s | "こんにちは" (5 chars) ≈ 1.0s |

Add 0.3-0.5s padding per sentence for natural pauses.

## Example

```yaml
slides:
  - slide: 1
    image: 01-slide-cover.png
    sentences:
      - text: "Today we explore the future of artificial intelligence."
        focus: "title"
        duration_hint: 3.5
      - text: "This topic has gained widespread attention recently."
        focus: "subtitle"
        duration_hint: 2.8
    ken_burns: "zoom-in"
    transition: "circleopen"
  - slide: 2
    image: 02-slide-key-trends.png
    sentences:
      - text: "First, large language models are expanding to multimodal."
        focus: "top-left"
        duration_hint: 3.2
      - text: "Second, the concept of AI agents is becoming reality."
        focus: "bottom-right"
        duration_hint: 2.5
    ken_burns: "pan-right"
```
