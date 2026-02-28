---
name: preferences-schema
description: EXTEND.md YAML schema for baoyu-tts user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_provider: null      # openai|google|azure|null (null = auto-detect)

default_voice:
  openai: null               # e.g., "alloy", "echo", "fable", "onyx", "nova", "shimmer"
  google: null               # e.g., "en-US-Standard-D", "zh-CN-Standard-A"
  azure: null                # e.g., "en-US-JennyNeural", "zh-CN-XiaoxiaoNeural"

default_speed: null          # 0.5-2.0|null (null = 1.0)

default_lang: null           # e.g., "en-US", "zh-CN"|null (null = auto-detect)
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_provider` | string\|null | null | Default TTS provider (null = auto-detect) |
| `default_voice.openai` | string\|null | null | Default OpenAI voice |
| `default_voice.google` | string\|null | null | Default Google voice |
| `default_voice.azure` | string\|null | null | Default Azure voice |
| `default_speed` | float\|null | null | Speaking speed (null = 1.0) |
| `default_lang` | string\|null | null | Language code (null = auto-detect) |

## Examples

**Minimal**:
```yaml
---
version: 1
default_provider: openai
---
```

**Full**:
```yaml
---
version: 1
default_provider: openai
default_voice:
  openai: "alloy"
  google: "zh-CN-Standard-A"
  azure: "zh-CN-XiaoxiaoNeural"
default_speed: 1.0
default_lang: "zh-CN"
---
```
