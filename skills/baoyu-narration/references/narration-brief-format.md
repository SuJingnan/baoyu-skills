---
name: narration-brief-format
description: Format specification for narration-brief.md user input
---

# Narration Brief Format

Place `narration-brief.md` in the input directory to control narration content. Supports three granularity levels (auto-detected).

## Mode 1: Full Text

Provide complete narration per slide. The skill uses text directly, only adding `focus` and `duration_hint`.

```markdown
## Slide 1
Welcome to today's daily skill recommendation. Today we're featuring the UI/UX Designer skill.

## Slide 2
After installing this skill, Claude Code instantly becomes a professional design expert, covering design systems, user research, and accessibility.
```

**Detection**: Slide sections contain 1+ complete sentences (ending with period/exclamation/question mark).

## Mode 2: Key Points

Provide bullet points or keywords per slide. The skill generates narration following these points.

```markdown
## Slide 1
- Opening: daily skill recommendation series
- Introduce today's skill name

## Slide 2
- Core selling point: instant design expert
- Mention key areas: design systems, user research, accessibility
- Keep it concise, under 2 sentences
```

**Detection**: Slide sections contain bullet points or keywords without full sentences.

## Mode 3: Style Directives

Provide global constraints only. The skill generates narration following these guidelines.

```markdown
# Style
Casual and engaging, targeting tech professionals. Slightly humorous.

# Constraints
- 2-3 sentences per slide maximum
- Total duration under 60 seconds
- End with call-to-action
- Don't mention version numbers
- Use "you" to address the viewer directly
```

**Detection**: No per-slide sections, only global directives.

## Mixed Mode

Combine modes freely. Global directives apply to all slides; per-slide directives override for specific slides.

```markdown
# Style
Educational but friendly tone.

# Constraints
- Total under 45 seconds
- Each slide 1-2 sentences

## Slide 1
Today's daily skill pick: UI/UX Designer.

## Slide 3-4
- Focus on the design system capabilities
- Don't go into too much detail

## Slide 7
End with: "Follow for daily skill recommendations!"
```

## Slide Range Notation

- `## Slide 1` — single slide
- `## Slide 3-4` — slides 3 and 4
- `## Slide 5+` — slide 5 and all after
- `## Opening` / `## Ending` — aliases for first/last slide

## Priority Rules

| narration-brief.md provides | Other sources role |
|------------------------------|-------------------|
| Full text per slide | Only add focus regions and duration_hint |
| Key points per slide | Generate text following points, use prompts for focus regions |
| Style directives only | Generate freely following style, use prompts + outline as usual |
| Not present | Standard generation from prompts → outline → source |
