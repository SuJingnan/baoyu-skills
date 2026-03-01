---
name: baoyu-narration
description: Generates structured narration scripts (narration.yaml) from image sequences and source content. Produces sentence-level narration aligned with visual elements and focus regions. Use when user asks to "generate narration", "create voiceover script", or needs narration for slides/images.
---

# Narration Script Generator

Generates structured narration scripts from image sequences and their source content. Outputs `narration.yaml` with sentence-level text, focus regions, and Ken Burns effect recommendations.

## Usage

```bash
/baoyu-narration slide-deck/ai-future-trends/
/baoyu-narration xhs-images/ai-tips/
/baoyu-narration comic/enigma-story/
/baoyu-narration slide-deck/ai-future/ --lang zh
```

## Options

| Option | Description |
|--------|-------------|
| `<input-dir>` | Directory containing images and source content |
| `--lang <code>` | Narration language (default: auto-detect from content) |
| `--style formal\|casual\|educational` | Narration tone (default: educational) |

## Input Directory Detection

The skill auto-detects the source skill type from directory structure:

| Source Skill | Expected Files | Key Info Source |
|-------------|----------------|----------------|
| `baoyu-slide-deck` | `prompts/*.md`, `outline.md`, `source-*.md` | prompts → outline → source |
| `baoyu-xhs-images` | `prompts/*.md`, `source-*.md` | prompts → source |
| `baoyu-comic` | `prompts/*.md`, `source-*.md` | prompts → source |
| `baoyu-infographic` | `prompts/*.md`, `source-*.md` | prompts → source |
| Generic | `*.png`/`*.jpg` + any `*.md` | images + markdown files |

## Information Priority

| Priority | Source | Role |
|----------|--------|------|
| **0 (highest)** | **`narration-brief.md`** | **User-provided narration guidance: full text, key points, or style directives** |
| 1 | `prompts/*.md` | Exact visual elements and positions per image |
| 2 | `outline.md` | Narrative structure and logical flow |
| 3 | `source-*.md` | Original content details |
| 4 (lowest) | Images (visual) | Verify actual rendering |

**Key Principle**: If `narration-brief.md` exists, it takes highest priority. When it provides full text per slide, use that text directly (only add focus and duration_hint). When it provides key points or style directives, generate narration following those guidelines. Otherwise, narration follows what the image shows (from prompts), not the original article.

## Workflow

```
Narration Progress:
- [ ] Step 1: Analyze input directory
- [ ] Step 2: Read information sources
- [ ] Step 3: Generate narration per slide
- [ ] Step 4: Output narration.yaml
```

### Step 1: Analyze Input Directory

1. List all image files (sorted by name: `01-*.png`, `02-*.png`, ...)
2. Detect source skill type from directory structure
3. Identify available info sources: prompts/, outline.md, source-*.md

### Step 2: Read Information Sources

Read in priority order:

0. **narration-brief.md** (if exists): User-provided narration guidance
   - Check: `test -f <input-dir>/narration-brief.md`
   - Three usage modes (auto-detected from content):
     - **Full text**: Contains complete narration per slide → use directly, add focus/duration_hint
     - **Key points**: Contains bullet points or keywords per slide → generate text following these points
     - **Style directives**: Contains tone/style/length constraints → apply as generation guidelines
   - See `references/narration-brief-format.md` for format details

1. **prompts/*.md**: For each image, read its corresponding prompt file
   - Extract visual elements and their positions
   - Extract layout structure
   - This determines WHAT to narrate and WHERE the focus is

2. **outline.md** (if exists): Read for narrative arc
   - Extract slide titles and content summaries
   - Understand logical flow between slides

3. **source-*.md** (if exists): Read for detail
   - Fill in specifics that prompts may have abbreviated
   - Get exact quotes, statistics, references

4. **Images**: Read images directly to verify
   - Confirm text content on slides
   - Verify element positions

### Step 3: Generate Narration Per Slide

For each image (in order):

1. **Analyze prompt** to identify visual elements and positions
2. **Draft sentences** that describe/explain the visual content
   - Each sentence should be 10-25 words (English) or 15-40 characters (Chinese)
   - 2-4 sentences per slide typically
   - Use conversational, engaging tone
3. **Assign focus regions** based on prompt position descriptions
   - See `references/focus-regions.md` for region codes
   - Map prompt keywords ("left panel", "top section") to focus codes
4. **Estimate duration** per sentence
   - English: ~15 characters/second + 0.3s pause
   - Chinese: ~4 characters/second + 0.3s pause
5. **Choose Ken Burns effect** based on content:

| Content Type | Recommended Effect |
|-------------|-------------------|
| Title/cover slides | `zoom-in` |
| Overview/summary | `zoom-out` |
| Left-to-right flow (timelines) | `pan-right` |
| Top-to-bottom flow (lists) | `pan-down` |
| Detail/close-up content | `zoom-in` |
| Landscape/wide content | `pan-left` or `pan-right` |
| Content with directional flow + depth | `zoom-in-pan-right` / `zoom-in-pan-down` / `zoom-out-pan-left` / `zoom-out-pan-up` |
| Ambient/mood slides | `drift` |
| Static diagrams | `none` |

6. **(Optional) Choose per-slide transition** if the slide needs a specific transition effect:

| Content Transition | Recommended Transition |
|-------------------|----------------------|
| Zoom-in reveal | `circleopen` or `zoomin` |
| Directional flow right | `wiperight` or `slideright` |
| Directional flow down | `wipedown` or `slidedown` |
| Scene change | `fadeblack` or `fadewhite` |
| Default (omit field) | Uses global `--transition` setting |

### Step 4: Output narration.yaml

Write `narration.yaml` to the input directory.

Schema: `references/narration-schema.md`

**Validation checklist**:
- Every image has at least 1 sentence
- Every sentence has focus and duration_hint
- Total narration covers all slides
- Logical flow between slides (transitions make sense)
- Duration hints are realistic (not too fast/slow)

## Output

```yaml
slides:
  - slide: 1
    image: 01-slide-cover.png
    sentences:
      - text: "Today we explore the future of AI."
        focus: "title"
        duration_hint: 3.5
      - text: "This topic has gained widespread attention."
        focus: "subtitle"
        duration_hint: 2.8
    ken_burns: "zoom-in"
```

Full schema: `references/narration-schema.md`

## Narration Guidelines

### Tone

| Style | Description | Use When |
|-------|-------------|----------|
| `formal` | Professional, objective | Business, research |
| `casual` | Conversational, friendly | Social media, vlogs |
| `educational` (default) | Clear, explanatory | Tutorials, explainers |

### Principles

1. **Follow the visuals**: Narrate what the image shows, not the original article
2. **One idea per sentence**: Keep sentences focused and atomic
3. **Natural transitions**: Connect slides with smooth narrative flow
4. **Avoid redundancy**: Don't describe what's obviously visible; add insight instead
5. **Match pacing**: Important points get longer sentences, transitions are brief

## References

| File | Content |
|------|---------|
| `references/narration-schema.md` | YAML output schema |
| `references/focus-regions.md` | Focus region codes and derivation rules |
| `references/narration-brief-format.md` | narration-brief.md format and examples |
