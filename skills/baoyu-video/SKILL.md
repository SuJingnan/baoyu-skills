---
name: baoyu-video
description: Generates narrated videos from image sequences (slide-deck, xhs-images, comic, infographic). Orchestrates narration generation, text-to-speech, and FFmpeg video composition with Ken Burns animation and subtitles. Use when user asks to "make video", "generate video", "create video from slides", or "convert to video".
---

# Video Generator

Transform image sequences into narrated videos with Ken Burns animation, synchronized speech, and subtitles.

## Usage

```bash
/baoyu-video slide-deck/ai-future-trends/
/baoyu-video xhs-images/ai-tips/
/baoyu-video slide-deck/ai-future/ --voice alloy --speed 1.0 --lang zh
/baoyu-video slide-deck/ai-future/ --no-subtitle
/baoyu-video slide-deck/ai-future/ --resolution 1080p
/baoyu-video slide-deck/ai-future/ --narration-only
/baoyu-video slide-deck/ai-future/ --audio-only
```

## Script Directory

**Agent Execution**:
1. `SKILL_DIR` = this SKILL.md file's directory
2. Script path = `${SKILL_DIR}/scripts/<script-name>.ts`

| Script | Purpose |
|--------|---------|
| `scripts/compose.ts` | FFmpeg video composition (images + audio → video) |
| `scripts/subtitle.ts` | Generate SRT subtitle file from narration.yaml |

## Options

| Option | Description |
|--------|-------------|
| `<input-dir>` | Directory with images (from slide-deck/xhs-images/comic/etc.) |
| `--voice <name>` | TTS voice name |
| `--speed <float>` | Speaking speed 0.5-2.0 (default: 1.0) |
| `--lang <code>` | Narration language |
| `--aspect auto\|16:9\|9:16\|3:4\|4:3` | Output aspect ratio (default: auto — detects from first image) |
| `--ken-burns <mode>` | Ken Burns: zoom-in / zoom-out / pan-left / pan-right / pan-up / pan-down / zoom-in-pan-right / zoom-in-pan-down / zoom-out-pan-left / zoom-out-pan-up / drift / none / auto (default: auto) |
| `--subtitle` / `--no-subtitle` | Include subtitles (default: yes) |
| `--resolution <res>` | Output: 720p / 1080p / 4k (default: 1080p) |
| `--fps <n>` | Frame rate (default: 30) |
| `--transition <type>` | Transition: fade / dissolve / none / auto / random / wipeleft / wiperight / wipeup / wipedown / slideleft / slideright / slideup / slidedown / circleopen / circleclose / radial / fadeblack / fadewhite / pixelize / zoomin (default: fade) |
| `--bgm <path>` | Background music file (optional) |
| `--narration-only` | Generate narration script only |
| `--audio-only` | Generate narration + audio, skip video |
| `--quick` | Skip confirmation prompts |

## Prerequisites

| Dependency | Required For | Install |
|-----------|-------------|---------|
| FFmpeg | Video composition | `brew install ffmpeg` |
| TTS API key | Speech generation | See baoyu-tts SKILL.md |
| Bun | Script runtime | Existing |

## Workflow

Copy this checklist and check off items as you complete them:

```
Video Progress:
- [ ] Step 0: Load preferences (EXTEND.md)
- [ ] Step 1: Analyze input directory
- [ ] Step 2: Read source content
- [ ] Step 3: Confirm options
- [ ] Step 4: Generate narration (baoyu-narration → narration.yaml)
- [ ] Step 5: Review narration (optional)
- [ ] Step 6: Generate audio (baoyu-tts → audio/*.mp3)
- [ ] Step 7: Generate subtitle (scripts/subtitle.ts → subtitle.srt)
- [ ] Step 8: Compose video (scripts/compose.ts → output.mp4)
- [ ] Step 9: Completion report
```

### Flow

```
Input → Preferences → Analyze → Read Content → Confirm → Narration → [Review?] → TTS Audio → Subtitle → Compose → Complete
```

### Step 0: Load Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .baoyu-skills/baoyu-video/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.baoyu-skills/baoyu-video/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────┬───────────────────┐
│                       Path                       │     Location      │
├──────────────────────────────────────────────────┼───────────────────┤
│ .baoyu-skills/baoyu-video/EXTEND.md              │ Project directory │
├──────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.baoyu-skills/baoyu-video/EXTEND.md        │ User home         │
└──────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, display summary                                              │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Use defaults                                                              │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default voice | TTS provider | Speed | Language | Resolution | FPS | Transition | Ken Burns | Subtitle | BGM

Schema: `references/config/preferences-schema.md`

### Step 1: Analyze Input Directory

1. Verify input directory exists
2. Detect source skill type:
   - `slide-deck/` → slide-deck (has `outline.md`, `prompts/`)
   - `xhs-images/` → xhs-images
   - `comic/` → comic
   - `infographic/` → infographic
   - Other → generic image sequence
3. List all image files (sorted: `01-*.png`, `02-*.png`, ...)
4. Count images, verify at least 1 exists

### Step 2: Read Source Content

Read available materials for narration context:

| File | Action |
|------|--------|
| `prompts/*.md` | Read all prompt files (primary narration source) |
| `outline.md` | Read if exists (narrative structure) |
| `source-*.md` | Read if exists (original content) |

### Step 3: Confirm Options

**Skip if `--quick` flag is set.**

Display summary:
- Source: [directory path]
- Images: N files detected
- Source skill: [slide-deck/xhs-images/comic/etc.]

Use AskUserQuestion for options. See `references/workflow/confirm-options.md` for question templates.

### Step 4: Generate Narration

Call `baoyu-narration` skill:

1. Load `skills/baoyu-narration/SKILL.md`
2. Execute narration generation workflow on the input directory
3. Output: `narration.yaml` in the video output directory

**If `--narration-only`**: Stop here, output narration.yaml location.

### Step 5: Review Narration (Optional)

Display narration summary:

```
Narration Summary:
| Slide | Image | Sentences | Est. Duration |
|-------|-------|-----------|---------------|
| 1 | 01-slide-cover.png | 2 | 6.3s |
| 2 | 02-slide-intro.png | 3 | 8.5s |
| ... | ... | ... | ... |
Total: ~45.2s estimated
```

Use AskUserQuestion:
```
header: "Confirm"
question: "Proceed with narration?"
options:
  - label: "Yes, generate audio (Recommended)"
    description: "Start TTS generation"
  - label: "Edit narration"
    description: "Interactively review and edit narration text"
  - label: "Regenerate narration"
    description: "Create new narration with different approach"
```

**Interactive Edit Flow** (when user selects "Edit narration"):

1. For each slide, display current narration text:
   ```
   Slide N (image: NN-xxx.png):
     1. "Current sentence one."
     2. "Current sentence two."
   ```
2. Use AskUserQuestion per slide:
   - "Keep as is" → skip
   - "Edit this slide" → user provides replacement text or modification instructions
3. Apply changes: if user provides exact replacement text, use it directly; if user provides instructions (e.g., "more concise", "add humor"), regenerate that slide's narration accordingly
4. Update `narration.yaml` with changes
5. Display updated summary table and re-confirm

### Step 6: Generate Audio

For each sentence in `narration.yaml`:

1. Load `skills/baoyu-tts/SKILL.md` for TTS parameters
2. Generate audio for each sentence:
   ```bash
   npx -y bun ${TTS_SKILL_DIR}/scripts/main.ts --text "<sentence>" --output audio/NN-sentence-SSS.mp3 --voice <voice> --speed <speed> --json
   ```
   - `NN`: Slide number (zero-padded)
   - `SSS`: Sentence index (zero-padded)
3. Parse JSON output to get actual duration
4. Save metadata to `audio/meta.json`:
   ```json
   [
     {"file": "01-sentence-000.mp3", "duration": 3.52, "slide": 1, "sentence": 0},
     {"file": "01-sentence-001.mp3", "duration": 2.81, "slide": 1, "sentence": 1}
   ]
   ```
5. Report progress: "Audio N/M generated"

**If `--audio-only`**: Stop here, output audio directory location.

### Step 7: Generate Subtitle

```bash
npx -y bun ${SKILL_DIR}/scripts/subtitle.ts <video-output-dir>
```

Output: `subtitle.srt` in the video output directory.

### Step 8: Compose Video

```bash
npx -y bun ${SKILL_DIR}/scripts/compose.ts <video-output-dir> --resolution <res> --fps <fps> --transition <type>
```

Options passed from user selections:
- `--resolution`: From Step 3 or default
- `--fps`: From Step 3 or default
- `--transition`: From Step 3 or default
- `--subtitle`: Path to subtitle.srt (if enabled)
- `--bgm`: Path to background music (if provided)

### Step 9: Completion Report

```
Video Complete!

Source: [input directory]
Output: video/{topic-slug}/{topic-slug}.mp4
Duration: ~N seconds
Slides: N
Resolution: 1920x1080

Files:
- narration.yaml (narration script)
- audio/ (N audio files)
- subtitle.srt (subtitle file)
- {topic-slug}.mp4 (final video)
```

## Output Directory

```
video/{topic-slug}/
├── source-{slug}.{ext}       # Source content (copied)
├── narration.yaml             # Narration script
├── audio/                     # TTS audio files
│   ├── 01-sentence-000.mp3
│   ├── 01-sentence-001.mp3
│   ├── 02-sentence-000.mp3
│   ├── ...
│   └── meta.json              # Audio duration metadata
├── subtitle.srt               # Subtitle file
└── {topic-slug}.mp4           # Final video
```

## Partial Workflows

| Option | Workflow |
|--------|----------|
| `--narration-only` | Steps 0-4 (narration script only) |
| `--audio-only` | Steps 0-6 (narration + audio, no video) |
| Full (default) | Steps 0-9 (complete video) |

## Ken Burns Details

See `references/ken-burns.md` for:
- Effect types and descriptions
- Auto-selection rules by content type
- Speed calculation from audio duration
- Focus area integration

## Transition Details

See `references/transitions.md` for:
- Available transition types
- Duration guidelines
- Selection recommendations

## Error Handling

- FFmpeg not installed → error with install instructions
- TTS API key missing → error with setup instructions
- Image file missing → warning, skip slide
- Audio generation failure → auto-retry once per sentence
- Video composition failure → error with FFmpeg output

## References

| File | Content |
|------|---------|
| `references/ken-burns.md` | Ken Burns effect types and selection |
| `references/transitions.md` | Transition types and guidelines |
| `references/config/preferences-schema.md` | EXTEND.md schema |
| `references/workflow/confirm-options.md` | Confirmation question templates |

## Extension Support

Custom configurations via EXTEND.md. See **Step 0** for paths and supported options.
