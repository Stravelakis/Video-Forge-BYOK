// Shared keys never wipe keys (ported from Image Forge's 17 Nov 2026 fix, B6/B7).
// "Could not read" must never be treated as "empty", and keys another app
// wrote must survive a save from this one.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyStoreUnreadable, putShared, readShared, sharedValues } from "./forgeKeys.mjs";

const setup = () => ({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vf-keys-")), "shared-keys.bin"), crypt: fakeLock() });
function fakeLock() {
  const c = {
    available: true, failUnlock: false,
    lock: async (t) => Buffer.from(t, "utf8").reverse(),
    unlock: async (b) => { if (c.failUnlock) throw new Error("powershell timed out"); return Buffer.from(b).reverse().toString("utf8"); },
  };
  return c;
}
const writeLockedJson = (file, data) => fs.writeFileSync(file, Buffer.from(JSON.stringify(data), "utf8").reverse());
const readLockedJson = (file) => JSON.parse(Buffer.from(fs.readFileSync(file)).reverse().toString("utf8"));

test("refuses to save when the file cannot be unlocked, and keeps it as it was", async () => {
  const { file, crypt } = setup();
  await putShared({ gemini: "FAKE-G", openrouter: "FAKE-O" }, "image-forge", { file, crypt });
  const before = fs.readFileSync(file);
  crypt.failUnlock = true;
  await assert.rejects(putShared({ gemini: "FAKE-NEW" }, "video-forge", { file, crypt }), KeyStoreUnreadable);
  await assert.rejects(putShared({ gemini: "FAKE-NEW" }, "video-forge", { file, crypt }), /nothing was saved/);
  assert.ok(fs.readFileSync(file).equals(before));
  assert.deepEqual(await readShared({ file, crypt }), {});
  crypt.failUnlock = false;
  assert.deepEqual(await sharedValues({ file, crypt }), { gemini: "FAKE-G", openrouter: "FAKE-O" });
});

test("refuses to save over a damaged file", async () => {
  const { file, crypt } = setup();
  fs.writeFileSync(file, "garbage");
  await assert.rejects(putShared({ gemini: "FAKE-NEW" }, "video-forge", { file, crypt }), KeyStoreUnreadable);
  assert.equal(fs.readFileSync(file, "utf8"), "garbage");
});

test("keeps keys written by another app that this app does not know", async () => {
  const { file, crypt } = setup();
  writeLockedJson(file, { v: 1, keys: {
    gemini: { value: "FAKE-G", at: 1, from: "image-forge" },
    "future-forge-key": { value: "FAKE-FUTURE", at: 1, from: "sound-forge" },
  } });
  await putShared({ "gemini-extra": "FAKE-GX" }, "video-forge", { file, crypt });
  const keys = readLockedJson(file).keys;
  assert.equal(keys.gemini.value, "FAKE-G");
  assert.deepEqual(keys["future-forge-key"], { value: "FAKE-FUTURE", at: 1, from: "sound-forge" });
  assert.equal(keys["gemini-extra"].value, "FAKE-GX");
});
