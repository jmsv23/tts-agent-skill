# tts-skill

A personal [Claude Code](https://claude.com/claude-code) skill that turns text into spoken MP3 audio using Google Cloud Gemini TTS.

Invoke `/tts <text>` in any Claude Code session. The skill will:

1. Detect the language (English / Spanish).
2. Ask which voice you want (Lucia, Laura, Luca, Robert).
3. Ask which narrative style — one of 5 presets, or a custom prompt.
4. Generate an MP3 and save it to the current working directory as `tts-YYYYMMDD-HHmmss.mp3`.

## Install

```bash
git clone <this-repo> ~/projects/tts-skill
ln -s ~/projects/tts-skill ~/.claude/skills/tts
cd ~/projects/tts-skill/scripts && npm install
```

Then set the env vars (e.g. in `~/.zshrc`):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# optional — falls back to project_id from the JSON
export GOOGLE_CLOUD_PROJECT_ID=my-gcp-project
```

The service account needs **Cloud Text-to-Speech API** access.

## Use

In Claude Code:

```
/tts Once upon a time there was a small brave fox.
```

Or from the shell directly:

```bash
node ~/.claude/skills/tts/scripts/tts.mjs \
  --voice lucia --lang english --style storybook \
  --text "Hello world" --out ./hello.mp3
```

## Voices

| ID     | Gemini name | Character                                                            |
|--------|-------------|----------------------------------------------------------------------|
| lucia  | Kore        | Warm and expressive                                                  |
| laura  | Laomedeia   | Musical and enchanting                                               |
| luca   | Enceladus   | Deep and trustworthy                                                 |
| robert | Fenrir      | Bold and animated                                                    |

## Style presets

- `storybook` — Warm, immersive children's audiobook narrator
- `dramatic` — Theatrical, varied intonation, suspenseful pauses
- `calm` — Slow, meditative, soft and low-energy
- `news-anchor` — Clear, neutral, authoritative, even pacing
- `playful` — Energetic, expressive, conversational, light humor

Presets live in `presets/styles.json` — add your own or edit existing ones.

## License

MIT
