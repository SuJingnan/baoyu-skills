---
name: transitions
description: Video transition types between slides
---

# Transitions

## Available Types

| Type | Description | FFmpeg xfade |
|------|-------------|-------------|
| `fade` (default) | Cross-fade between slides | `xfade=transition=fade` |
| `dissolve` | Dissolve blend | `xfade=transition=dissolve` |
| `none` | Hard cut, no transition | Simple concat |

## Default Duration

- **Standard**: 0.5 seconds
- **Minimum**: 0.2 seconds
- **Maximum**: 1.5 seconds

## Selection Guidelines

| Content | Recommended | Reason |
|---------|-------------|--------|
| Professional/business | `fade` | Clean, standard |
| Educational | `fade` | Non-distracting |
| Creative/artistic | `dissolve` | Softer feel |
| Fast-paced/energetic | `none` | Keeps momentum |
| Technical/data | `fade` | Clear separation |
