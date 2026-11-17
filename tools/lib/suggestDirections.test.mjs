// Run: npm test. AI directing keeps only real choices on real lines and words (10 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedTags, readSuggestions, suggestPrompt, batches } from "../../src/lib/direct/suggest.ts";

const cast = [{ id: "a", label: "Maria", actions: ["waves", "nods"] }, { id: "b", label: "Nikos", actions: ["shrugs"] }];
const words = (...w) => w.map((word, k) => ({ word, at: k / w.length }));
const lines = [
  { i: 0, speakerId: "a", text: "Hello Nikos, how are you", words: words("Hello", "Nikos,", "how", "are", "you") },
  { i: 1, speakerId: "b", text: "I don't know", words: words("I", "don't", "know") },
];

test("each speaker may use the Direct step's own choices, and only their own actions", () => {
  const a = allowedTags(cast[0], cast);
  assert.ok(a.includes("walks to Nikos") && a.includes("faces Nikos") && a.includes("camera close on Maria") && a.includes("waves"));
  assert.ok(!a.includes("walks to Maria") && !a.includes("shrugs"));
});

test("the prompt numbers every word and lists each speaker's tags", () => {
  const p = suggestPrompt(lines, cast, { note: "warm" });
  assert.match(p.user, /0\. Maria: \[0\]Hello \[1\]Nikos,/);
  assert.match(p.user, /Nikos: \[.*"shrugs"/);
  assert.match(p.user, /tone: warm/);
});

test("answers are checked: invented tags, wrong speakers' actions and unknown lines are dropped", () => {
  const answer = JSON.stringify({ lines: [
    { line: 0, directions: [{ tag: "Waves", word: 0 }, { tag: "faces nikos", word: 1 }, { tag: "does a backflip", word: 2 }, { tag: "shrugs", word: 2 }] },
    { line: 1, directions: [{ tag: "shrugs", word: 2 }, { tag: "feels confusion", word: 99 }] },
    { line: 7, directions: [{ tag: "waves", word: 0 }] },
  ] });
  const got = readSuggestions(answer, lines, cast);
  assert.deepEqual(got[0], [{ tag: "waves", at: 0, ai: true }, { tag: "faces Nikos", at: 0.2, ai: true }]);
  assert.equal(got[1][0].tag, "shrugs");
  assert.equal(got[1][1].at, 2 / 3, "a word past the end lands on the last word");
  assert.equal(got[7], undefined);
});

test("never more than three per line, no repeats, and junk answers give nothing", () => {
  const many = JSON.stringify({ lines: [{ line: 0, directions: ["waves", "waves", "nods", "camera wide", "faces camera"].map((tag) => ({ tag, word: 0 })) }] });
  assert.deepEqual(readSuggestions(many, lines, cast)[0].map((x) => x.tag), ["waves", "nods", "camera wide"]);
  assert.deepEqual(readSuggestions("not json", lines, cast), {});
  assert.deepEqual(readSuggestions("```json\n{\"lines\":[{\"line\":1,\"directions\":[{\"tag\":\"faces camera\",\"word\":0}]}]}\n```", lines, cast)[1], [{ tag: "faces camera", at: 0, ai: true }]);
});

test("long scripts go in batches", () => {
  assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("the camera does not cut on two lines in a row, and two people never walk at each other", () => {
  const three = [...lines, { i: 2, speakerId: "a", text: "Look", words: words("Look") }];
  const answer = JSON.stringify({ lines: [
    { line: 0, directions: [{ tag: "camera wide", word: 0 }, { tag: "walks to Nikos", word: 1 }] },
    { line: 1, directions: [{ tag: "camera close on Nikos", word: 0 }, { tag: "walks to Maria", word: 0 }] },
    { line: 2, directions: [{ tag: "camera close on Maria", word: 0 }] },
  ] });
  const got = readSuggestions(answer, three, cast);
  assert.deepEqual(got[0].map((x) => x.tag), ["camera wide"], "Maria's walk goes: Nikos is the one who comes");
  assert.deepEqual(got[1].map((x) => x.tag), ["walks to Maria"], "no second cut straight after the first");
  assert.deepEqual(got[2].map((x) => x.tag), ["camera close on Maria"]);
});

test("other answer shapes small models use are still read", () => {
  assert.equal(readSuggestions(JSON.stringify({ script: [{ line: "1", directions: ["faces camera"] }] }), lines, cast)[1][0].tag, "faces camera");
  assert.equal(readSuggestions(JSON.stringify([{ index: 0, items: [{ tag: "nods", word: 2 }] }]), lines, cast)[0][0].tag, "nods");
});

test("your own server: the address gets /v1, junk clears it, and a missing address is a plain message", async () => {
  const { setCustomBase, chat } = await import("./explainerLlm.mjs");
  assert.equal(setCustomBase("http://localhost:1234"), "http://localhost:1234/v1");
  assert.equal(setCustomBase("http://203.0.113.10:20128/v1/"), "http://203.0.113.10:20128/v1");
  assert.equal(setCustomBase("file:///etc"), "");
  await assert.rejects(chat({ provider: "custom", key: "none", model: "x", messages: [] }), /no address yet/);
});
