// Run: npm test. Google Flow helper: real prompts in, checked answers out (10 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { imagePromptRequest, motionIdeasRequest, videoPromptRequest, readImagePrompt, readIdeas, readVideoPrompt } from "../../src/lib/flow/flowPrompts.ts";

const long = (n) => Array.from({ length: n }, (_, i) => "word" + i).join(" ");

test("the requests carry the place, the style, the shape and the loop rules", () => {
  assert.match(imagePromptRequest({ place: "a bakery", look: "flat cartoon", aspect: "9:16" }).user, /a bakery[\s\S]*flat cartoon[\s\S]*9:16/);
  assert.match(motionIdeasRequest("a bakery with a window").user, /SEAMLESS LOOP/);
  const v = videoPromptRequest("a bakery", ["curtain moves"]).user;
  assert.match(v, /curtain moves/); assert.match(v, /camera does not move/);
});

test("answers are read and checked; thin or broken ones are refused", () => {
  assert.equal(readImagePrompt(JSON.stringify({ title: "Bakery", prompt: long(40) })).title, "Bakery");
  assert.equal(readImagePrompt(JSON.stringify({ prompt: "too short" })), null);
  assert.equal(readImagePrompt("not json"), null);
  const ideas = readIdeas(JSON.stringify({ ideas: [{ label: "Curtain", motion: "The curtain sways.", strength: "medium" }, { label: "", motion: "x" }] }));
  assert.deepEqual(ideas, [{ label: "Curtain", motion: "The curtain sways.", strength: "medium" }]);
  assert.ok(readVideoPrompt("```json\n" + JSON.stringify({ prompt: long(30) }) + "\n```"));
});
