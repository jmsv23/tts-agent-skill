---
name: tts
description: Use when the user invokes /tts <text> to convert text into an MP3 audio file via Gemini TTS. Asks the user for voice and narrative style, then writes the audio to the current working directory.
---

# /tts — Text to speech via Gemini TTS

When the user invokes `/tts [text]`, follow this workflow exactly.

## Prerequisites (one-time)

Check if setup has already been done:

```bash
SKILL_DIR="$(dirname "$(readlink -f ~/.claude/skills/tts)")"
SETUP_FLAG="$SKILL_DIR/.setup-done"
test -f "$SETUP_FLAG"
```

If the flag file **exists**, skip this entire section and go straight to the Workflow.

If the flag file **does not exist**, run the following steps:

1. Install dependencies:

   ```bash
   SKILL_DIR="$(dirname "$(readlink -f ~/.claude/skills/tts)")"
   test -d "$SKILL_DIR/scripts/node_modules" \
     || (cd "$SKILL_DIR/scripts" && npm install)
   ```

2. Verify env vars: the user must have these set:
   - `GOOGLE_APPLICATION_CREDENTIALS` — path to a Google Cloud service-account JSON with Text-to-Speech API access.
   - `GOOGLE_CLOUD_PROJECT_ID` — optional; if absent, falls back to `project_id` in the JSON.

   If `GOOGLE_APPLICATION_CREDENTIALS` is unset, stop and tell the user.

3. Create the flag file so future invocations skip this section:

   ```bash
   touch "$SKILL_DIR/.setup-done"
   ```

## Workflow

1. **Capture text.** The slash command arg is the text. If empty, ask the user to paste it.

2. **Detect language.** Heuristically detect English vs Spanish from the text (look for ñ, accented vowels, common Spanish words like "el/la/que/los/una"). If ambiguous, ask the user with `AskUserQuestion`. Map to `english` or `spanish`.

3. **Ask the voice** using `AskUserQuestion` (single-select, header "Voice"):
   - **Lucia** — Warm and expressive, perfect for bringing stories to life with emotion
   - **Laura** — Musical and enchanting, ideal for fairy tales and whimsical adventures
   - **Luca** — Deep and trustworthy, excellent for adventure and heroic stories
   - **Robert** — Bold and animated, perfect for action-packed and exciting narratives

4. **Ask the narrative style** using `AskUserQuestion` (single-select, header "Style"):
   - **Storybook** — Warm, immersive children's audiobook narrator
   - **Dramatic** — Theatrical, varied intonation, suspenseful pauses
   - **Calm** — Slow, meditative, soft and low-energy
   - **News anchor** — Clear, neutral, authoritative, even pacing
   - **Playful** — Energetic, expressive, conversational, light humor

   If the user chooses "Other" / custom, ask **one** focused follow-up: "Describe the tone, pacing, and target audience in one sentence." Then synthesize a custom style prompt using this template (substitute language as needed):

   ```
   ## System Prompt start - do not include this in the final output
   ### Role
   Act as a professional narrator. {{role-derived-from-user-description}}.

   ### Style guidelines:
   * **Tone**: {{tone}}
   * **Pacing**: {{pacing}}
   * **Audience**: {{audience}}
   * **Delivery**: Speak with intention; the magic comes from the words, not from exaggeration.
   ## System Prompt end - do not include this in the final output
   ```

5. **Generate.** Write the text to a temp file (so newlines/special chars survive shell quoting), then run:

   ```bash
   SKILL_DIR="$(dirname "$(readlink -f ~/.claude/skills/tts)")"
   TEXT_FILE="$(mktemp --suffix=.txt)"
   # write the text into $TEXT_FILE (use the Write tool or printf)
   OUT="$(pwd)/tts-$(date +%Y%m%d-%H%M%S).mp3"
   node "$SKILL_DIR/scripts/tts.mjs" \
     --voice <lucia|laura|luca|robert> \
     --lang <english|spanish> \
     --style <storybook|dramatic|calm|news-anchor|playful> \
     --text-file "$TEXT_FILE" \
     --out "$OUT"
   ```

   For a custom style, pass `--style-file <path>` instead of `--style <preset>` and write the custom prompt to that file.

6. **Report the result.** Print the absolute path of the generated MP3 to the user. No additional commentary.

## Notes

- The script handles chunking long input internally.
- The MP3 is always written to the **current working directory** (where Claude was launched), not the skill directory.
- Do not commit generated MP3s anywhere; the `.gitignore` excludes them from the skill repo.
