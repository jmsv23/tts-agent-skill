#!/usr/bin/env node
// tts.mjs — Generate MP3 audio from text via Google Cloud Gemini TTS.
//
// Usage:
//   node tts.mjs --voice <lucia|laura|luca|robert> \
//                --lang  <english|spanish> \
//                (--style <preset-id> | --style-file <path> | --style-text "...") \
//                (--text "..." | --text-file <path>) \
//                --out <path-to-output.mp3>
//
// Env:
//   GOOGLE_APPLICATION_CREDENTIALS — path to service-account JSON (required)
//   GOOGLE_CLOUD_PROJECT_ID        — project id (optional; falls back to JSON.project_id)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const TTS_MODEL = "gemini-2.5-flash-tts";

const VOICE_MAP = {
  lucia: "Kore",
  laura: "Laomedeia",
  luca: "Enceladus",
  robert: "Fenrir",
};

const LANG_CODE = {
  english: "en-us",
  spanish: "es-us",
};

const MAX_CHUNK_CHARS = 2500;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = val;
      i++;
    }
  }
  return out;
}

function die(msg, code = 1) {
  process.stderr.write(`tts: ${msg}\n`);
  process.exit(code);
}

function loadStylePrompt(args, lang) {
  if (args["style-text"]) return String(args["style-text"]);
  if (args["style-file"]) return fs.readFileSync(args["style-file"], "utf8");
  if (args.style) {
    const presetsPath = path.resolve(__dirname, "..", "presets", "styles.json");
    const presets = JSON.parse(fs.readFileSync(presetsPath, "utf8"));
    const preset = presets[args.style];
    if (!preset) die(`unknown style preset: ${args.style}`);
    const p = preset.prompts[lang];
    if (!p) die(`preset "${args.style}" has no prompt for language "${lang}"`);
    return p;
  }
  die("must provide one of --style, --style-file, or --style-text");
}

function loadText(args) {
  if (args["text-file"]) return fs.readFileSync(args["text-file"], "utf8");
  if (args.text) return String(args.text);
  die("must provide --text or --text-file");
}

// Simple chunker: prefer sentence boundaries, then fall back to hard char cap.
function chunkText(text, maxChars = MAX_CHUNK_CHARS) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return [clean];
  const sentences = clean.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || [clean];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    if (sentence.length > maxChars) {
      // sentence itself too big — hard split
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars).trim());
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function getAccessToken() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    die(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a service-account JSON key with Text-to-Speech access."
    );
  }
  if (!fs.existsSync(keyFile)) {
    die(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${keyFile}`);
  }
  const auth = new GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) die("Failed to obtain Google Cloud access token");
  return token.token;
}

function resolveProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) return process.env.GOOGLE_CLOUD_PROJECT_ID;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const json = JSON.parse(fs.readFileSync(keyFile, "utf8"));
    if (json.project_id) return json.project_id;
  } catch {
    // ignore
  }
  die("Cannot determine project id. Set GOOGLE_CLOUD_PROJECT_ID or use a JSON key with project_id.");
}

async function synthesizeChunk({ chunk, stylePrompt, voiceName, languageCode, accessToken, projectId }) {
  const body = {
    input: { prompt: stylePrompt, text: chunk },
    voice: { languageCode, name: voiceName, model_name: TTS_MODEL },
    audioConfig: { audioEncoding: "MP3" },
  };
  const res = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": projectId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    let msg = `Gemini TTS API ${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const data = await res.json();
  if (!data.audioContent) throw new Error("No audioContent in TTS response");
  return Buffer.from(data.audioContent, "base64");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const voiceId = String(args.voice || "").toLowerCase();
  const voiceName = VOICE_MAP[voiceId];
  if (!voiceName) die(`invalid --voice "${args.voice}". Expected one of: ${Object.keys(VOICE_MAP).join(", ")}`);

  const lang = String(args.lang || "").toLowerCase();
  const languageCode = LANG_CODE[lang];
  if (!languageCode) die(`invalid --lang "${args.lang}". Expected one of: english, spanish`);

  const text = loadText(args).trim();
  if (!text) die("text is empty");

  const stylePrompt = loadStylePrompt(args, lang);

  const out = args.out;
  if (!out) die("missing --out");
  const outAbs = path.resolve(out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });

  const accessToken = await getAccessToken();
  const projectId = resolveProjectId();

  const chunks = chunkText(text);
  process.stderr.write(`tts: ${chunks.length} chunk(s), voice=${voiceId}(${voiceName}), lang=${lang}\n`);

  const buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stderr.write(`tts: synthesizing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)\n`);
    const buf = await synthesizeChunk({
      chunk: chunks[i],
      stylePrompt,
      voiceName,
      languageCode,
      accessToken,
      projectId,
    });
    buffers.push(buf);
  }

  fs.writeFileSync(outAbs, Buffer.concat(buffers));
  process.stdout.write(`${outAbs}\n`);
}

main().catch((err) => {
  die(err?.message || String(err));
});
