#!/usr/bin/env node
// Stop hook: an answer longer than LIMIT characters is sent back once to be rewritten as a tldr.
// A prompt asking for detail ("подробно", "detail") lets a long answer through.
import { readFileSync } from "node:fs";

const LIMIT = Number(process.env.TLDR_LIMIT ?? 600);
const DETAIL = /подробн|\bdetail/i;

async function readInput() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return JSON.parse(text || "{}");
}

const parse = (line) => {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
};

const textOf = (content) =>
  typeof content === "string"
    ? content
    : (content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

const isPrompt = (entry) =>
  entry.type === "user" &&
  // A task notification is a user entry too; older transcripts have no origin.
  (entry.origin?.kind ?? "human") === "human" &&
  !entry.isMeta &&
  !entry.isSidechain &&
  textOf(entry.message?.content).trim() !== "";

export const lastTurn = (lines) => {
  const entries = lines.map(parse).filter(Boolean);
  const start = entries.findLastIndex(isPrompt);
  const answer = entries
    .slice(start + 1)
    .filter((entry) => entry.type === "assistant" && !entry.isSidechain)
    .map((entry) => textOf(entry.message?.content))
    .join("\n")
    .trim();
  return { answer, prompt: start < 0 ? "" : textOf(entries[start].message.content) };
};

if (process.argv.includes("--test")) {
  const { default: assert } = await import("node:assert/strict");
  const line = (entry) => JSON.stringify(entry);
  const turn = lastTurn([
    line({ type: "user", origin: { kind: "human" }, message: { content: "review" } }),
    line({ type: "user", origin: { kind: "task-notification" }, message: { content: "HrisTransportDetails" } }),
    line({ type: "assistant", message: { content: [{ type: "text", text: "long answer" }] } }),
  ]);
  assert.equal(turn.prompt, "review");
  assert.equal(DETAIL.test("HrisTransportDetails"), false);
  assert.equal(DETAIL.test("show details"), true);
  assert.equal(DETAIL.test("объясни подробнее"), true);
  console.log("ok");
  process.exit(0);
}

const input = await readInput();
if (input.stop_hook_active || !input.transcript_path) process.exit(0);

// The transcript is written asynchronously and may miss the final message; last_assistant_message has it.
const turn = lastTurn(readFileSync(input.transcript_path, "utf8").split("\n"));
const answer = (input.last_assistant_message ?? turn.answer).trim();
const prompt = turn.prompt;
if (answer.length <= LIMIT || DETAIL.test(prompt)) process.exit(0);

process.stderr.write(
  `Answer is ${answer.length} characters, limit ${LIMIT}. Rewrite it as a tldr below, following ASD-STE100 writing rules adapted to the answer's language: one idea per sentence, active voice, one word per meaning, no terms coined in this session.`,
);
process.exit(2);
