# tts-skill

A skill for [Claude Code](https://claude.com/claude-code) and [OpenCode](https://opencode.ai) that turns text into spoken MP3 audio using Google Cloud Gemini TTS.

Invoke `/tts <text>` in any supported session. The skill will:

1. Detect the language (English / Spanish).
2. Ask which voice you want (Lucia, Laura, Luca, Robert).
3. Ask which narrative style — one of 5 presets, or a custom prompt.
4. Generate an MP3 and save it to the current working directory as `tts-YYYYMMDD-HHmmss.mp3`.

## Install

### Claude Code

```bash
git clone <this-repo> ~/projects/tts-skill
ln -s ~/projects/tts-skill ~/.claude/skills/tts
cd ~/projects/tts-skill/scripts && npm install
```

### OpenCode

```bash
git clone <this-repo> ~/projects/tts-skill
mkdir -p ~/.config/opencode/skills
ln -s ~/projects/tts-skill ~/.config/opencode/skills/tts
cd ~/projects/tts-skill/scripts && npm install
```

> If you use both Claude Code and OpenCode, create both symlinks pointing to the same clone — no need to duplicate the repo.

### Environment variables

Set these in `~/.zshrc` (or equivalent):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# optional — falls back to project_id from the JSON
export GOOGLE_CLOUD_PROJECT_ID=my-gcp-project
```

The service account needs **Cloud Text-to-Speech API** access.

## Google Cloud setup

The skill calls `texttospeech.googleapis.com` using a service account key. Follow these steps to create one.

### 1. Create or select a project

Open the [Google Cloud Console](https://console.cloud.google.com) and create a new project or select an existing one. Note the **Project ID** — you will need it.

- [Create a project](https://console.cloud.google.com/projectcreate)

### 2. Enable the Cloud Text-to-Speech API

The skill uses the Cloud Text-to-Speech API with the `gemini-2.5-flash-tts` model.

- [Enable Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)

Click **Enable** and wait a few seconds for it to activate.

> Reference: [Cloud Text-to-Speech documentation](https://cloud.google.com/text-to-speech/docs)

### 3. Create a service account

1. Go to [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Click **Create service account**.
3. Give it a name (e.g. `tts-skill`) and click **Create and continue**.
4. Under **Grant this service account access to project**, select the role **Cloud Text-to-Speech API User** (`roles/cloudtexttospeech.user`).
5. Click **Continue** then **Done**.

> Reference: [Create a service account](https://cloud.google.com/iam/docs/service-accounts-create)

### 4. Create and download a JSON key

1. Click on the service account you just created.
2. Go to the **Keys** tab.
3. Click **Add key → Create new key → JSON → Create**.
4. A `.json` file will download automatically — keep it safe, it cannot be re-downloaded.

> Reference: [Create and delete service account keys](https://cloud.google.com/iam/docs/keys-create-delete)

### 5. Set the environment variable

Move the key to a permanent location and export the path:

```bash
mv ~/Downloads/my-project-abc123.json ~/.config/gcloud/tts-skill-sa.json
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/tts-skill-sa.json"
```

Add the `export` line to your `~/.zshrc` (or `~/.bashrc`) so it persists across sessions.

## Use

In Claude Code or OpenCode:

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
- **Custom** — Don't see what you need? Choose "Other" and the skill will ask you one question ("Describe the tone, pacing, and target audience in one sentence") and build a tailored narrator prompt from your answer.

Presets live in `presets/styles.json` — add your own or edit existing ones.

## Cost

The skill uses the `gemini-2.5-flash-tts` model, priced at **$10 per 1,000,000 input tokens**.

### What does that buy you?

| Unit | Amount for $10 |
|------|----------------|
| Tokens | 1,000,000 |
| Words (≈ 0.75 words/token) | ~750,000 words |
| Audio at 140 wpm narration | ~5,350 min — about **89 hours** |
| Pages (≈ 250 words/page) | ~3,000 pages |

**Cost per page:** ~$0.003 &nbsp;·&nbsp; **Cost per book:** ~$1.00

### Audiobook analogy

A standard novel — say, around 300 pages — contains roughly 75,000 words. Narrated at a comfortable audiobook pace (≈ 140 words per minute) that becomes about 9 hours of audio.

With $10 you can generate the equivalent of **~10 complete audiobooks**. The entire Harry Potter series (≈ 1,084,000 words, ~130 hours of audio) would cost around **$14**.

> Pricing reference: [Google Cloud Text-to-Speech pricing](https://cloud.google.com/text-to-speech/pricing)

## Tip: use pnpm instead of npm

The install commands above use `npm`, but `pnpm` is a better choice:

- **Faster installs** — packages are stored in a global content-addressable store and hard-linked, so repeated installs skip downloading what you already have.
- **Less disk usage** — one copy of each package version across all your projects, not one copy per `node_modules`.
- **Stricter dependency resolution** — prevents packages from accidentally accessing dependencies they didn't declare, catching issues that npm silently ignores.

To use it, replace `npm install` with `pnpm install` in the commands above. If you don't have pnpm yet: `npm install -g pnpm`.

## License

MIT
