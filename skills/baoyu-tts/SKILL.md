---
name: baoyu-tts
description: Text-to-speech generation with OpenAI, Google, and Azure TTS APIs. Returns audio files with duration metadata. Use when user asks to "generate speech", "text to speech", "TTS", or needs voice narration for content.
---

# Text-to-Speech (TTS)

Official API-based text-to-speech. Supports OpenAI, Google, and Azure providers.

## Script Directory

**Agent Execution**:
1. `SKILL_DIR` = this SKILL.md file's directory
2. Script path = `${SKILL_DIR}/scripts/main.ts`

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .baoyu-skills/baoyu-tts/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.baoyu-skills/baoyu-tts/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────┬───────────────────┐
│                     Path                     │     Location      │
├──────────────────────────────────────────────┼───────────────────┤
│ .baoyu-skills/baoyu-tts/EXTEND.md            │ Project directory │
├──────────────────────────────────────────────┼───────────────────┤
│ $HOME/.baoyu-skills/baoyu-tts/EXTEND.md      │ User home         │
└──────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, apply settings                                               │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Use defaults                                                              │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default provider | Default voice per provider | Default speed | Default language

Schema: `references/config/preferences-schema.md`

## Usage

```bash
# Basic text-to-speech
npx -y bun ${SKILL_DIR}/scripts/main.ts --text "Hello world" --output hello.mp3

# From file
npx -y bun ${SKILL_DIR}/scripts/main.ts --textfile narration.md --output narration.mp3

# With voice and speed
npx -y bun ${SKILL_DIR}/scripts/main.ts --text "Hello" --output hello.mp3 --voice alloy --speed 1.0

# Specific provider
npx -y bun ${SKILL_DIR}/scripts/main.ts --textfile narration.md --output narration.mp3 --provider google --lang zh-CN

# JSON output with duration metadata
npx -y bun ${SKILL_DIR}/scripts/main.ts --text "Hello" --output hello.mp3 --json
```

## Options

| Option | Description |
|--------|-------------|
| `--text <text>` | Direct text input |
| `--textfile <path>` | Read text from file |
| `--output <path>`, `-o` | Output audio path (mp3) (required) |
| `--provider openai\|google\|azure` | TTS provider (auto-detect by default) |
| `--voice <name>` | Voice name |
| `--speed <float>` | Speaking speed 0.5-2.0 (default: 1.0) |
| `--lang <code>` | Language code (e.g., en-US, zh-CN) |
| `--json` | JSON output with duration metadata |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_TTS_MODEL` | OpenAI TTS model (default: tts-1) |
| `OPENAI_TTS_VOICE` | OpenAI default voice (default: alloy) |
| `OPENAI_BASE_URL` | Custom OpenAI endpoint |
| `GOOGLE_TTS_API_KEY` | Google TTS API key |
| `GOOGLE_API_KEY` | Google API key (fallback for TTS) |
| `GOOGLE_TTS_VOICE` | Google default voice |
| `AZURE_TTS_KEY` | Azure TTS subscription key |
| `AZURE_TTS_REGION` | Azure TTS region (e.g., eastus) |
| `AZURE_TTS_VOICE` | Azure default voice |

**Load Priority**: CLI args > EXTEND.md > env vars > `<cwd>/.baoyu-skills/.env` > `~/.baoyu-skills/.env`

## Provider Selection

1. `--provider` specified → use it
2. Only one API key available → use that provider
3. Multiple available → first found (openai > google > azure)

## Available Voices

### OpenAI

| Voice | Description |
|-------|-------------|
| `alloy` | Neutral, balanced |
| `echo` | Warm, confident |
| `fable` | Expressive, storytelling |
| `onyx` | Deep, authoritative |
| `nova` | Friendly, upbeat |
| `shimmer` | Clear, gentle |

### Google

Voice names follow pattern: `{lang}-{region}-{type}-{variant}` (e.g., `en-US-Standard-D`, `zh-CN-Wavenet-A`).

### Azure

Voice names follow pattern: `{lang}-{region}-{name}Neural` (e.g., `en-US-JennyNeural`, `zh-CN-XiaoxiaoNeural`).

## JSON Output

When `--json` is used, output includes duration metadata for video alignment:

```json
{
  "output": "/path/to/output.mp3",
  "duration": 3.52,
  "provider": "openai",
  "voice": "alloy",
  "speed": 1.0,
  "textLength": 42
}
```

## Error Handling

- Missing API key → error with setup instructions
- TTS failure → auto-retry once
- Invalid speed → error with valid range

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
