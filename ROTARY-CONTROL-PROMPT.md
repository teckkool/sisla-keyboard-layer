# Prompt: SISLA Rotary Layer Control

Paste this whole file into an AI assistant to continue work on this control.

---

You are continuing work on the **SISLA Rotary Layer Control**, the left-side control for SISLA apps. Its purpose is fast navigation: **4 human motions reach any of 100 layers × 12 function menus × 12 buttons = 14,400 controls.**

The owner designed it step by step and reviews every change by looking at it. Keep the behaviour below exactly as written unless the owner asks for a change. Make small changes, and show a screenshot after each visual change.

## Files in this repository (`teckkool/sisla-keyboard-layer`)

- `src/sisla-keyboard-layer.js`: the control. Plain ES module with no dependencies and no app-specific code. Each app passes in its own layer map.
- `demo.html`: a standalone demo with sample menus on layers 1–3.
  - Serve the folder over HTTP (for example `python3 -m http.server 8000`), then open `http://localhost:8000/demo.html`.
  - ES modules don't load from `file://`, so opening the file directly won't work.
- `index.html`: the original first demo. Keep it for reference; don't change it.

The same control is also used by the SISLA Wind Tunnel, at `teckkool/sisla-wind-tunnel`, branch `claude/busy-cerf-5mzdre`, file `shared/keyboard-layer/sisla-keyboard-layer.js`. The copy here was taken from wind-tunnel commit `99c9f9d` and is byte-identical (sha256 `4155a6776970c9475f610ea457e863ceba4be0c485023524c14d294a2705918c`). When you change one copy, update the other, or decide with the owner which copy is the source.

## API

```js
import {mountKeyboardLayer, BUTTON_KEYS} from "./src/sisla-keyboard-layer.js";

const control = mountKeyboardLayer(hostElement, {
  layers: {
    1: { name: "Wind Tunnel", menus: {
      1: { name: "Run", desc: "…", buttons: {
        "1": { label: "Start", desc: "…", run: () => "optional result text" },
        // keys: "1".."9", "0", "-", "="  (BUTTON_KEYS)
      }},
      // menus 1..12
    }},
    // layers 1..100 (0 is always "normal keyboard")
  },
  onLog: message => {},   // optional: called after each button runs
  panel: element,         // optional: hidden while the dial is open (default: nearest <aside>)
});
// control: { openDial(), setLayer(n), openMenu(n), press(key), back(), state() }
// state(): { layer, pick, dialOpen, menu, lastButton }
//   layer = confirmed layer, pick = where the dial points (not confirmed yet)
```

## Agreed behaviour

### Forward: 4 motions

1. **Layer button.** It's the only thing shown when idle. Its label always shows the *confirmed* layer: "Layer OFF" or "Layer 17 · Wind Tunnel". Clicking it opens the pop-up.
2. **Pop-up: select, then confirm.**
   - **Layout, top to bottom:**
     - **Top row:** a large layer number box (3 digits, 24 px semi-bold monospace, white) with a standard blue **Select** button right next to it.
     - **Below:** the rotary dial.
   - **Only the controls show.** The pop-up floats over the panel. While it's open, the rest of the panel is hidden (`visibility:hidden`, so nothing jumps), and so are the section divider, the status line and the Back button.
   - **The number box stays white.** No blue text-selection highlight, no yellow focus outline, no visible caret.
   - **Selecting never changes the layer by itself.** You can select by:
     - clicking or dragging anywhere on the dial (the angle picks the value);
     - scrolling over the dial or the number (±1 per notch);
     - dragging the number box up or down;
     - clicking the number box and typing 0–100 (digits only; values above 100 become 100).
   - **Only Select (or Enter after typing) confirms.** The dial centre is **not** a button.
   - **After confirming,** the pop-up closes and that layer's F1–F12 list appears. Confirming 0 means Layer OFF (normal keyboard).
3. **F1–F12 column.** Each entry reads `F# Name`. Unassigned menus are dimmed. Clicking one, or pressing its F key, opens its buttons.
4. **12-button column** (`1 2 3 4 5 6 7 8 9 0 - =`). Clicking a button, or pressing its key, runs its control. The column stays open so you can press again.

### The dial (final agreed look)

- **Scale:**
  - 0 is at the **top**, and the scale runs clockwise over 340°, so 100 sits just left of the top.
  - A **20° gap separates 0 and 100**, so they never share a position. A click in the gap snaps to the nearer end.
  - In code: `DIAL_START = 270`, `DIAL_SWEEP = 340` (screen degrees, where 0 = right and 90 = down).
- **Ticks:** one per layer (101 in total). Ordinary ticks are short, every 5th is longer, and every 10th is longest.
- **Labels:** numbers sit **outside** the ring every 5 (0, 5 … 100) at **11 px**, with the 10s bold. The owner tried bigger ring numbers and rejected them; only the number box is big.
- **Pointer ("tick wand"):**
  - Yellow, 3.5 px wide, with a dark outline.
  - It runs from a small yellow hub at the centre to **just short of the selected tick**: in line with it, **not covering it and not passing it**.
  - The selected tick and its label are yellow, and the selected tick is drawn slightly thicker.
- **Size:** 210 px; it shrinks to fit narrow panels. The face is round and dark, with a drop shadow. The canvas is drawn at 2× for sharpness.

### Backing out (reverse, one step at a time)

`buttons → F1–F12 → dial (opens at the current layer) → Layer OFF`

- **One step back:** Backspace, right-click on the control, or the Back button. The Back button is hidden while the dial is open.
- **Esc:** straight to Layer OFF from anywhere.
- **Clicking outside the open dial, or clicking the Layer button while it's open:** closes the dial and keeps the confirmed layer.

### Keyboard rules

- Keys are captured only while a layer is on or the dial is open. They're never captured while you type in another text field, select or textarea, or while Ctrl, Alt or Meta is held. When the layer is off, F5, F11, F12 and the rest belong to the browser again.
- F1–F12 open menus. `1–0 - =` press buttons while a menu is open. Esc and Backspace work as described above. Enter confirms a typed layer.

## Things the owner rejected (don't bring them back)

- 0 and 100 at the same spot on a full circle.
- A 300° "volume knob" scale with 0 at the lower left. The owner wants 0 at the top.
- Big (18 px) ring numbers.
- A pointer that passes or covers its tick.
- Confirming by releasing on the dial, or by clicking the dial centre or the number box. Auto-select causes selection errors; confirming is a separate button.
- An in-place dial section that pushes the panel down.
- A highlighted (blue or yellow) number box.

## Ideas discussed but not requested

Don't build these unless the owner asks:
- button types (action, toggle, choice, value, jump);
- "keyboard picks a value button, mouse wheel sets it";
- user remapping saved per user;
- gamepad input;
- a Linux-wide (desktop) controller.

## How to check your work

- Use headless Chromium (Playwright) against `demo.html` served over HTTP. Check that:
  - clicking, dragging and scrolling the dial only change `state().pick`, never `state().layer`;
  - Select and Enter confirm;
  - typed values clamp to 0–100;
  - the panel hides while the dial is open and comes back afterwards;
  - Back, Backspace, right-click, Esc and clicking outside behave as above;
  - F-keys and button keys run the right `run()`;
  - there are no page errors.
- Take a screenshot and show the owner after every visual change.
- Linux is the only build target; don't add Windows or macOS installers or build matrices unless the owner asks.
