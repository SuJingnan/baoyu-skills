# baoyu-skills

Skills shared by Baoyu for improving daily work efficiency with Claude Code.

## Prerequisites

- Node.js environment installed
- Ability to run `npx bun` commands

## Installation

### Register as Plugin Marketplace

Run the following command in Claude Code:

```bash
/plugin marketplace add jimliu/baoyu-skills
```

### Install Skills

**Option 1: Via Browse UI**

1. Select **Browse and install plugins**
2. Select **baoyu-skills**
3. Select **content-skills**
4. Select **Install now**

**Option 2: Direct Install**

```bash
/plugin install content-skills@baoyu-skills
```

## Available Skills

### gemini-web

Interacts with Gemini Web to generate text and images.

**Text Generation:**

```bash
/gemini-web "Hello, Gemini"
/gemini-web --prompt "Explain quantum computing"
```

**Image Generation:**

```bash
/gemini-web --prompt "A cute cat" --image cat.png
/gemini-web --promptfiles system.md content.md --image out.png
```

### xhs-images

Xiaohongshu (RedNote) infographic series generator. Breaks down content into 1-10 cartoon-style infographics.

```bash
# Specify article path
/xhs-images posts/ai-future/article.md

# Direct content input
/xhs-images 今日星座运势
```

## Disclaimer

### gemini-web

This skill uses the Gemini Web API (reverse-engineered).

**Warning:** This project uses unofficial API access via browser cookies. Use at your own risk.

- First run opens Chrome to authenticate with Google
- Cookies are cached for subsequent runs
- No guarantees on API stability or availability

## License

MIT
