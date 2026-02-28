---
name: focus-regions
description: Focus region codes for Ken Burns camera targeting
---

# Focus Regions

Focus regions define where the Ken Burns camera effect should target during narration.

## Region Codes

```
┌────────────┬──────────────┬─────────────┐
│  top-left  │  top-center  │  top-right  │
├────────────┼──────────────┼─────────────┤
│ center-left│    center    │center-right │
├────────────┼──────────────┼─────────────┤
│bottom-left │bottom-center │bottom-right │
└────────────┴──────────────┴─────────────┘
```

## Standard Regions

| Code | X Range | Y Range | Common Use |
|------|---------|---------|------------|
| `top-left` | 0-33% | 0-33% | Logos, numbering |
| `top-center` | 33-66% | 0-33% | Headlines, titles |
| `top-right` | 66-100% | 0-33% | Secondary info |
| `center-left` | 0-33% | 33-66% | Left column content |
| `center` | 33-66% | 33-66% | Main content area |
| `center-right` | 66-100% | 33-66% | Right column content |
| `bottom-left` | 0-33% | 66-100% | Footnotes, sources |
| `bottom-center` | 33-66% | 66-100% | Bottom content |
| `bottom-right` | 66-100% | 66-100% | Page numbers, CTAs |

## Semantic Aliases

| Alias | Maps To | When to Use |
|-------|---------|-------------|
| `title` | `top-center` | Slide title/headline area |
| `subtitle` | `center` | Subtitle or subheading |
| `main` | `center` | Primary content area |
| `full` | `center` | Full-slide content (wide zoom) |

## Deriving Focus from Prompts

When analyzing image generation prompts:

1. Look for positional keywords: "top-left", "upper right", "center", "bottom"
2. Look for layout descriptions: "left column shows...", "right side features..."
3. Map element descriptions to grid positions
4. Default to `center` when position is ambiguous

### Examples

| Prompt Fragment | Focus Region |
|----------------|--------------|
| "Title at the top: AI Future" | `title` |
| "Left panel: trend chart" | `center-left` |
| "Bottom right: QR code" | `bottom-right` |
| "Central illustration of..." | `center` |
| "Header with logo" | `top-left` |
