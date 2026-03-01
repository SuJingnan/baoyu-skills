---
name: transitions
description: Video transition types between slides
---

# Transitions

## Available Types

### Basic

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `fade` (default) | Cross-fade between slides | `xfade=transition=fade` |
| `dissolve` | Dissolve blend | `xfade=transition=dissolve` |
| `none` | Hard cut, no transition | Simple concat |

### Wipe

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `wipeleft` | Wipe from right to left | `xfade=transition=wipeleft` |
| `wiperight` | Wipe from left to right | `xfade=transition=wiperight` |
| `wipeup` | Wipe from bottom to top | `xfade=transition=wipeup` |
| `wipedown` | Wipe from top to bottom | `xfade=transition=wipedown` |

### Slide

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `slideleft` | Push left (new slides in from right) | `xfade=transition=slideleft` |
| `slideright` | Push right (new slides in from left) | `xfade=transition=slideright` |
| `slideup` | Push up (new slides in from bottom) | `xfade=transition=slideup` |
| `slidedown` | Push down (new slides in from top) | `xfade=transition=slidedown` |

### Shape

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `circleopen` | Circle expanding from center | `xfade=transition=circleopen` |
| `circleclose` | Circle shrinking to center | `xfade=transition=circleclose` |
| `radial` | Radial sweep (clock wipe) | `xfade=transition=radial` |

### Advanced

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `fadeblack` | Fade out to black, then fade in | `xfade=transition=fadeblack` |
| `fadewhite` | Fade out to white, then fade in | `xfade=transition=fadewhite` |
| `pixelize` | Pixelate transition | `xfade=transition=pixelize` |
| `zoomin` | Zoom-in transition | `xfade=transition=zoomin` |

## Smart Modes

### `auto` Mode

Automatically selects a matching transition based on the current slide's Ken Burns effect:

| Ken Burns | Transition (alternating) |
|-----------|--------------------------|
| `zoom-in` | `circleopen` / `zoomin` |
| `zoom-out` | `circleclose` / `fade` |
| `pan-right` | `wiperight` / `slideright` |
| `pan-left` | `wipeleft` / `slideleft` |
| `pan-down` | `wipedown` / `slidedown` |
| `pan-up` | `wipeup` / `slideup` |
| `zoom-in-pan-right` | `wiperight` / `zoomin` |
| `zoom-in-pan-down` | `wipedown` / `zoomin` |
| `zoom-out-pan-left` | `wipeleft` / `circleclose` |
| `zoom-out-pan-up` | `wipeup` / `circleclose` |
| `drift` | `dissolve` / `fade` |
| `none` | `fade` / `dissolve` |

### `random` Mode

Randomly picks from all available transitions for each slide boundary. Good for dynamic, playful content.

## Per-Slide Transition

Individual slides can override the global transition via `narration.yaml`:

```yaml
slides:
  - slide: 1
    image: 01-cover.png
    ken_burns: "zoom-in"
    transition: "circleopen"   # Override global transition for this slide
```

Priority: per-slide `transition` > global `--transition` flag.

## Default Duration

- **Standard**: 0.5 seconds
- **Minimum**: 0.2 seconds
- **Maximum**: 1.5 seconds

## Selection Guidelines

| Content | Recommended | Reason |
|---------|-------------|--------|
| Professional/business | `fade` | Clean, standard |
| Educational | `fade` or `auto` | Non-distracting, contextual |
| Creative/artistic | `dissolve` or `random` | Softer feel, variety |
| Fast-paced/energetic | `none` | Keeps momentum |
| Technical/data | `fade` | Clear separation |
| Storytelling | `auto` | Matches visual flow |
