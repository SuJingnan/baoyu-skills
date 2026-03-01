---
name: ken-burns
description: Ken Burns effect types and selection guidelines
---

# Ken Burns Effects

## Effect Types

### Basic Effects

| Effect | Description | FFmpeg zoompan |
|--------|-------------|----------------|
| `zoom-in` | Slowly zoom into focus area | z increases from 1.0 to 1.15 |
| `zoom-out` | Start zoomed, slowly reveal full frame | z decreases from 1.15 to 1.0 |
| `pan-left` | Slow horizontal pan right-to-left | x decreases over time |
| `pan-right` | Slow horizontal pan left-to-right | x increases over time |
| `pan-up` | Slow vertical pan bottom-to-top | y decreases over time |
| `pan-down` | Slow vertical pan top-to-bottom | y increases over time |

### Combo Effects

| Effect | Description | FFmpeg zoompan |
|--------|-------------|----------------|
| `zoom-in-pan-right` | Zoom in while panning right | z 1.0→1.12 + x increases |
| `zoom-in-pan-down` | Zoom in while panning down | z 1.0→1.12 + y increases |
| `zoom-out-pan-left` | Zoom out while panning left | z 1.12→1.0 + x decreases |
| `zoom-out-pan-up` | Zoom out while panning up | z 1.12→1.0 + y decreases |

### Special Effects

| Effect | Description | FFmpeg zoompan |
|--------|-------------|----------------|
| `drift` | Gentle floating motion with breathing feel | z 1.0→1.05, x/y sinusoidal drift |
| `none` | Static frame, no animation | z fixed at 1.0, centered |

## Easing

All effects use ease-in-out easing for natural motion:

```
t = (1 - cos(PI * frame / totalFrames)) / 2
```

This creates smooth acceleration at the start and deceleration at the end, avoiding abrupt motion.

## Auto-Selection Rules

| Content Type | Effect | Reason |
|-------------|--------|--------|
| Title/cover slide | `zoom-in` | Draws attention to title |
| Summary/conclusion | `zoom-out` | Reveals full picture |
| Timeline/process | `pan-right` | Follows left-to-right reading |
| List/steps (vertical) | `pan-down` | Follows top-to-bottom reading |
| Detail/data point | `zoom-in` | Focuses on specific area |
| Overview/landscape | `pan-left` or `pan-right` | Showcases width |
| Before/after comparison | `pan-right` | Natural left-to-right transition |
| Ambient/mood slides | `drift` | Adds subtle life without distraction |
| Static diagrams | `none` | Keeps detail sharp |
| Content with directional flow | `zoom-in-pan-*` / `zoom-out-pan-*` | Follows visual direction while adding depth |

## Speed Guidelines

Ken Burns speed is automatically calculated from audio duration:

- **Slow** (long narration): Subtle, barely noticeable movement — feels cinematic
- **Medium** (normal narration): Gentle movement — keeps visual interest
- **Fast** (short narration): More noticeable — may feel rushed if too fast

**Target**: Full zoom/pan range should take 5-15 seconds. Shorter clips scale proportionally.

## Focus Area Integration

The Ken Burns effect targets the focus region specified in `narration.yaml`:

1. Camera starts near the first sentence's focus region
2. Slowly moves toward the last sentence's focus region
3. Combined with zoom creates a natural "reading" motion

For single-sentence slides, the camera centers on the focus point with gentle zoom only.
