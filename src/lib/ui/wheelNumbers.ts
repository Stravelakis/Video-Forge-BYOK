// ---------------------------------------------------------------------------
// The mouse wheel changes numbers (Ak, 11 Nov 2026): roll over any number box
// to raise or lower it by one step. Sliders too, once you have clicked them,
// so rolling down a page full of sliders still scrolls the page.
// One listener for the whole app, so every number box gets it, new ones too.
// React hears the change as if it was typed.
// ---------------------------------------------------------------------------

const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;

function nudge(el: HTMLInputElement, up: boolean, times: number): boolean {
  const before = el.value;
  for (let i = 0; i < times; i++) {
    try { if (up) el.stepUp(); else el.stepDown(); }
    catch {
      // step="any": move by a hundredth of the range, or 1
      const span = Number(el.max) - Number(el.min);
      const step = Number.isFinite(span) && span > 0 ? span / 100 : 1;
      const n = (Number(el.value) || 0) + (up ? step : -step);
      const clamped = Math.min(el.max === "" ? Infinity : Number(el.max), Math.max(el.min === "" ? -Infinity : Number(el.min), n));
      el.value = String(Math.round(clamped * 1000) / 1000);
    }
  }
  if (el.value === before) return false;
  const v = el.value;
  el.value = before;          // let React see a real change
  setValue.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function installWheelNumbers(root: Document = document): void {
  root.addEventListener("wheel", (e) => {
    const el = (e.target as Element | null)?.closest?.("input");
    if (!(el instanceof HTMLInputElement) || el.disabled || el.readOnly) return;
    const isNumber = el.type === "number";
    const isSlider = el.type === "range" && root.activeElement === el;
    if (!isNumber && !isSlider) return;
    if (!e.deltaY) return;
    e.preventDefault();
    nudge(el, e.deltaY < 0, e.shiftKey ? 10 : 1);
  }, { passive: false });
}
