---
name: preferences-schema
description: EXTEND.md YAML schema for baoyu-video user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_voice: null          # Voice name (provider-specific)|null
default_provider: null       # openai|google|azure|null (TTS provider)
default_speed: null          # 0.5-2.0|null (null = 1.0)
default_lang: null           # e.g., "en-US", "zh-CN"|null

default_resolution: null     # 720p|1080p|4k|null (null = 1080p)
default_fps: null            # integer|null (null = 30)
default_transition: null     # fade|dissolve|none|null (null = fade)
default_ken_burns: null      # zoom-in|zoom-out|pan-left|pan-right|auto|null (null = auto)
default_subtitle: null       # true|false|null (null = true)
default_bgm: null            # path to background music|null
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_voice` | string\|null | null | Default TTS voice |
| `default_provider` | string\|null | null | Default TTS provider |
| `default_speed` | float\|null | null | Speaking speed (null = 1.0) |
| `default_lang` | string\|null | null | Language code |
| `default_resolution` | string\|null | null | Output resolution |
| `default_fps` | int\|null | null | Frame rate |
| `default_transition` | string\|null | null | Transition type |
| `default_ken_burns` | string\|null | null | Ken Burns default |
| `default_subtitle` | bool\|null | null | Include subtitles |
| `default_bgm` | string\|null | null | Background music path |

## Examples

**Minimal**:
```yaml
---
version: 1
default_voice: "alloy"
default_lang: "zh-CN"
---
```

**Full**:
```yaml
---
version: 1
default_voice: "alloy"
default_provider: "openai"
default_speed: 1.0
default_lang: "zh-CN"
default_resolution: "1080p"
default_fps: 30
default_transition: "fade"
default_ken_burns: "auto"
default_subtitle: true
---
```
