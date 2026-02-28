---
name: confirm-options
description: Video generation option confirmation prompts
---

# Confirm Options (Step 3)

Use AskUserQuestion for all questions. Language follows user's input language.

## Question 1: Voice

```
header: "Voice"
question: "Which voice for the narration?"
options:
  - label: "alloy (Recommended)"
    description: "Neutral and balanced (OpenAI)"
  - label: "nova"
    description: "Friendly and upbeat (OpenAI)"
  - label: "onyx"
    description: "Deep and authoritative (OpenAI)"
```

Note: Options adapt based on available TTS provider.

## Question 2: Speed

```
header: "Speed"
question: "Narration speed?"
options:
  - label: "1.0x Normal (Recommended)"
    description: "Standard speaking pace"
  - label: "0.8x Slower"
    description: "More deliberate, easier to follow"
  - label: "1.2x Faster"
    description: "Quicker pace, more energetic"
```

## Question 3: Ken Burns

```
header: "Animation"
question: "Camera animation style?"
options:
  - label: "Auto (Recommended)"
    description: "AI selects best effect per slide"
  - label: "Zoom in"
    description: "Gentle zoom into content"
  - label: "None"
    description: "Static images, no camera movement"
```

## Question 4: Subtitle

```
header: "Subtitle"
question: "Include subtitles in the video?"
options:
  - label: "Yes (Recommended)"
    description: "Overlay narration text as subtitles"
  - label: "No"
    description: "Video without subtitle overlay"
```
