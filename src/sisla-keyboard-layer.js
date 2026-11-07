// SISLA Keyboard Layer: left-side control for SISLA apps.
// Ported from https://github.com/teckkool/sisla-keyboard-layer (index.html demo).
//
// Four motions to any of 100 × 12 × 12 controls:
//   1. Layer button  -> the rotary dial pops up (only the button shows otherwise)
//   2. Pick a layer  -> turn (click/drag the ring), scroll, drag the number or type it;
//                       nothing changes until you press Select (or
//                       Enter). Then the dial hides and F1–F12 appear.
//   3. F1–F12        -> that menu's 12 buttons appear
//   4. 1–0 - =       -> the control runs
// Back (Backspace, right-click or the Back button) reverses one step:
//   buttons -> F1–F12 -> dial (showing the current layer) -> layer 0 (normal).
// Esc goes straight to layer 0. Layer 0 is the normal keyboard.
// Each app supplies its own layer map; the module has no app knowledge.
//
//   mountKeyboardLayer(hostElement, {
//     layers: { 1: { name, menus: { 1: { name, desc, buttons: { "1": { label, desc, run } } } } } },
//     onLog: (message) => {},           // optional
//     panel: element                    // optional: hidden around the open dial (default: nearest <aside>)
//   }) -> { openDial(), setLayer(n), openMenu(n), press(key), back(), state() }

// Dial scale in screen degrees (0 = right, 90 = down, 270 = top): 0 at the top, clockwise
// to 100 just left of the top. The 20° gap keeps 0 and 100 apart.
const DIAL_START = 270, DIAL_SWEEP = 340;
const DIAL_SIZE = 210;

export const BUTTON_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

const CSS = `
.skl{font-size:12.5px;position:relative}
/* While the dial is open, the rest of the panel is hidden so only the controls show. */
.skl-dial-open > :not(:has(.skl)){visibility:hidden}
.skl-dial-open > :has(.skl){border-color:transparent}
/* The dial floats over the panel: only the round dial shows, nothing around it. */
.skl-top{position:absolute;left:50%;top:44px;transform:translateX(-50%);z-index:50;width:210px;max-width:100%;display:flex;flex-direction:column;align-items:center;gap:6px}
.skl-dial{position:relative;width:100%;aspect-ratio:1}
.skl-dial canvas{width:100%;height:100%;cursor:pointer;border-radius:50%;background:#0b1424;display:block;box-shadow:0 6px 22px rgba(0,0,0,.65),0 0 0 1px #24344f}
.skl-num{width:92px;height:42px;line-height:42px;text-align:center;background:#0a1220;border:1px solid #3a4d6e;border-radius:6px;font:600 24px ui-monospace,Menlo,Consolas,monospace;cursor:ns-resize;user-select:none;color:#e8eef8;padding:0;box-shadow:0 4px 14px rgba(0,0,0,.6)}
/* The number stays white: no selection highlight and no focus outline (typing still replaces it). */
.skl-num:focus{cursor:text;outline:none}
.skl-row{display:flex;gap:8px;align-items:center}
.skl-ok{height:42px;padding:0 18px;font-weight:700;background:var(--acc,#2f8cf0);border-color:var(--acc,#2f8cf0);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.6)}
.skl-num::selection{background:transparent;color:#e8eef8}
.skl-num{caret-color:transparent}
.skl-toggle{width:100%;padding:7px 10px;font-weight:600;text-align:left}
.skl-hide{display:none!important}
.skl-back{width:100%;margin-top:6px;padding:4px 8px;font-size:12px}
.skl-cols{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.skl-cols:empty{display:none}
.skl-col{display:flex;flex-direction:column;gap:2px}
.skl-col button{height:22px;padding:0 6px;font-size:12px;text-align:left;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skl-col button b{display:inline-block;min-width:14px;margin-right:3px;color:#fbbf24}
.skl-col button.lit{background:#004488}
.skl-col button.sel{background:#0066cc;border-color:#ffff00;color:#ffff00;font-weight:700}
.skl-col button.na{opacity:.45}
.skl-status{margin-top:6px;color:#8da0bd;font-size:11.5px;min-height:16px}
`;

function pad3(n) { return String(Math.max(0, Math.min(100, n))).padStart(3, "0"); }

export function mountKeyboardLayer(host, {layers = {}, onLog = () => {}, panel = host.closest("aside") || host.parentElement} = {}) {
  if (!document.getElementById("skl-css")) {
    const st = document.createElement("style"); st.id = "skl-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  host.classList.add("skl");
  host.innerHTML = `
    <button class="skl-toggle">Layer OFF</button>
    <div class="skl-top skl-hide">
      <div class="skl-row">
        <input class="skl-num" type="text" inputmode="numeric" maxlength="3" value="000" aria-label="Layer number" title="Type 0–100, drag up/down or scroll to change. Press Select (or Enter) to confirm.">
        <button class="skl-ok">Select</button>
      </div>
      <div class="skl-dial"><canvas width="420" height="420" title="Click, drag or scroll to select a layer"></canvas></div>
    </div>
    <div class="skl-cols"></div>
    <button class="skl-back skl-hide">Back</button>
    <div class="skl-status">Normal keyboard · Layer 0</div>`;
  const canvas = host.querySelector("canvas"), g = canvas.getContext("2d");
  const okBtn = host.querySelector(".skl-ok"), num = host.querySelector(".skl-num"), toggle = host.querySelector(".skl-toggle"), top = host.querySelector(".skl-top");
  const cols = host.querySelector(".skl-cols"), status = host.querySelector(".skl-status"), backBtn = host.querySelector(".skl-back");
  let layer = 0, pick = 0, dialOpen = false, menu = null, lastButton = null, typed = false;  // pick = dial position, not yet confirmed

  const layerDef = n => layers[n] || null;
  const menuDef = (n, m) => layerDef(n)?.menus?.[m] || null;

  // 0 at the top, clockwise to 100 just left of it, with a small gap so 0 and
  // 100 never share a position. One line per layer,
  // a longer line with its number outside every 5, the current layer in yellow.
  function drawDial(v) {
    const S = DIAL_SIZE, k = canvas.width / S, c = S / 2, r = 76;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.setTransform(k, 0, 0, k, 0, 0);
    const ang = n => (DIAL_START + n / 100 * DIAL_SWEEP) * Math.PI / 180;
    const pt = (n, rad) => [c + Math.cos(ang(n)) * rad, c + Math.sin(ang(n)) * rad];
    g.beginPath(); g.arc(c, c, r, ang(0), ang(100)); g.strokeStyle = "#3a4d6e"; g.lineWidth = 1.5; g.stroke();
    for (let n = 0; n <= 100; n++) {
      const five = n % 5 === 0, ten = n % 10 === 0, cur = n === v;
      const [x0, y0] = pt(n, r - (ten ? 13 : five ? 11 : 6)), [x1, y1] = pt(n, r);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
      g.strokeStyle = cur ? "#ffff00" : five ? "#c7d3e6" : "#6f82a3"; g.lineWidth = cur ? 2.6 : ten ? 1.6 : five ? 1.3 : 0.8; g.stroke();
    }
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let n = 0; n <= 100; n += 5) {
      const [x, y] = pt(n, r + 15);
      g.fillStyle = v === n ? "#ffff00" : n % 10 === 0 ? "#dbe5f3" : "#9fb0ca"; g.font = `${n % 10 === 0 ? 700 : 500} 11px system-ui`;
      g.fillText(String(n), x, y);
    }
    // Pointer: from the centre hub up to just short of the selected tick, in line with it
    // but not covering it (the tick itself stays yellow). Dark outline for contrast.
    const tickLen = v % 10 === 0 ? 13 : v % 5 === 0 ? 11 : 6;
    const [px0, py0] = pt(v, 0), [px1, py1] = pt(v, r - tickLen - 2.5);
    g.lineCap = "butt";
    g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.strokeStyle = "#05090f"; g.lineWidth = 6.5; g.stroke();
    g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.strokeStyle = "#ffff00"; g.lineWidth = 3.5; g.stroke();
    g.beginPath(); g.arc(c, c, 6, 0, Math.PI * 2); g.fillStyle = "#ffff00"; g.fill(); g.strokeStyle = "#05090f"; g.lineWidth = 1.5; g.stroke();
    g.lineCap = "butt";
  }

  function say(msg) { status.textContent = msg; }

  function renderCols() {
    cols.innerHTML = "";
    if (layer === 0 || dialOpen) return;
    const fcol = document.createElement("div"); fcol.className = "skl-col";
    for (let m = 1; m <= 12; m++) {
      const md = menuDef(layer, m), b = document.createElement("button");
      b.innerHTML = `<b>F${m}</b> ${md ? md.name : ""}`; b.title = md ? `${md.name}: ${md.desc || ""}` : "Not assigned on this layer";
      if (!md) b.classList.add("na"); if (m === menu) b.classList.add("sel");
      b.onclick = () => openMenu(m); b.onmouseenter = () => { b.classList.add("lit"); if (md) say(`F${m} · ${md.name}${md.desc ? " · " + md.desc : ""}`); };
      b.onmouseleave = () => b.classList.remove("lit");
      fcol.appendChild(b);
    }
    cols.appendChild(fcol);
    const md = menu ? menuDef(layer, menu) : null;
    if (!md) return;
    const bcol = document.createElement("div"); bcol.className = "skl-col";
    for (const key of BUTTON_KEYS) {
      const bd = md.buttons?.[key], b = document.createElement("button");
      b.innerHTML = `<b>${key}</b> ${bd ? bd.label : "–"}`; b.title = bd ? (bd.desc || bd.label) : "Not assigned";
      if (!bd) b.classList.add("na"); if (key === lastButton) b.classList.add("sel");
      b.onclick = () => press(key); b.onmouseenter = () => { b.classList.add("lit"); if (bd) say(`${key} · ${bd.desc || bd.label}`); };
      b.onmouseleave = () => b.classList.remove("lit");
      bcol.appendChild(b);
    }
    cols.appendChild(bcol);
  }

  function layerLabel() {
    const ld = layerDef(layer);
    return layer === 0 ? "Layer OFF" : `Layer ${layer} · ${ld ? ld.name : "empty"}`;
  }

  function render() {
    top.classList.toggle("skl-hide", !dialOpen);
    toggle.textContent = layerLabel(); toggle.classList.toggle("on", layer > 0);
    renderCols();
    backBtn.classList.toggle("skl-hide", dialOpen || layer === 0);
    status.style.visibility = dialOpen ? "hidden" : "";
    panel?.classList.toggle("skl-dial-open", dialOpen);
  }

  // Move the dial only (scroll, drag, ring). The active layer changes on confirm.
  function dialTo(n) {
    n = Math.max(0, Math.min(100, Math.round(+n) || 0));
    pick = n; typed = false; num.value = pad3(n); if (document.activeElement === num) num.select();
    drawDial(n);
    say(`Layer ${n}${layerDef(n) ? " · " + layerDef(n).name : n ? " · empty" : " · normal keyboard"} · press Select to confirm`);
  }

  function openDial() {
    dialOpen = true; pick = layer; drawDial(pick); num.value = pad3(pick); typed = false; render();
    say("Choose a layer"); num.focus(); num.select();
  }

  // Confirm a layer: the dial hides, F1–F12 show (or layer 0 = normal keyboard).
  function setLayer(n) {
    dialTo(n); layer = pick; dialOpen = false; menu = null; lastButton = null;
    if (document.activeElement === num) num.blur();
    render();
    const ld = layerDef(layer);
    say(layer === 0 ? "Normal keyboard · Layer 0" : ld ? `Layer ${layer} · press F1–F12` : `Layer ${layer} has no controls in this app · Back to choose another`);
  }

  function openMenu(m) {
    if (!layer) return false;
    const md = menuDef(layer, m); dialOpen = false; menu = m; lastButton = null;
    if (document.activeElement === num) num.blur();
    render();
    say(md ? `F${m} · ${md.name} · press 1–0 - =` : `F${m} is not assigned on layer ${layer}`);
    return !!md;
  }

  function press(key) {
    const bd = layer && menu && !dialOpen ? menuDef(layer, menu)?.buttons?.[key] : null;
    if (!bd) { say(`${key} is not assigned${menu ? " in F" + menu : ""}`); return false; }
    lastButton = key; renderCols();
    try { const out = bd.run(); const msg = `F${menu}·${key} ${bd.label}${typeof out === "string" ? " → " + out : ""}`; say(msg); onLog(msg); }
    catch (e) { say(`F${menu}·${key} failed: ${e.message}`); onLog(`Keyboard layer F${menu}·${key} failed: ${e.message}`); }
    return true;
  }

  // One step back: buttons -> F1–F12 -> dial -> layer 0.
  function back() {
    if (dialOpen) { setLayer(0); return; }
    if (menu) { menu = null; lastButton = null; render(); say(`Layer ${layer} · press F1–F12`); return; }
    if (layer > 0) openDial();
  }

  // Dial: release on the ring, scroll or drag the number then click it, or type + Enter.
  let ringDrag = false, numDrag = null;
  const fromEvent = e => {
    const r = canvas.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 360) % 360;
    const rel = (deg - DIAL_START + 360) % 360;
    if (rel > DIAL_SWEEP) return rel > DIAL_SWEEP + (360 - DIAL_SWEEP) / 2 ? 0 : 100;  // in the gap: nearest end
    return Math.round(rel / DIAL_SWEEP * 100);
  };
  const confirmPick = () => setLayer(typed && num.value !== "" ? +num.value : pick);
  canvas.addEventListener("mousedown", e => { if (e.button !== 0) return; e.preventDefault(); ringDrag = true; dialTo(fromEvent(e)); });  // dial = select only
  okBtn.addEventListener("mousedown", e => e.preventDefault());   // keep typed digits until the click
  okBtn.onclick = confirmPick;                                     // Select = confirm
  window.addEventListener("mousemove", e => {
    if (ringDrag) dialTo(fromEvent(e));
    if (numDrag && (numDrag.moved || Math.abs(numDrag.y - e.clientY) > 3)) { numDrag.moved = true; dialTo(numDrag.v + Math.round((numDrag.y - e.clientY) / 3)); }
  });
  window.addEventListener("mouseup", () => {
    if (ringDrag) { ringDrag = false; num.focus(); num.select(); return; }  // the dial only selects; Select confirms
    if (numDrag) { const moved = numDrag.moved; numDrag = null; num.focus(); num.select(); }  // click = type, drag = change
  });
  num.addEventListener("mousedown", e => { if (e.button !== 0) return; e.preventDefault(); numDrag = {y: e.clientY, v: pick, moved: false}; });
  num.addEventListener("input", () => { num.value = num.value.replace(/\D/g, "").slice(0, 3); typed = true; });
  num.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); setLayer(num.value === "" ? pick : +num.value); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setLayer(0); }
  });
  num.addEventListener("blur", () => { if (!dialOpen) return; num.value = pad3(pick); typed = false; });
  const wheel = e => { e.preventDefault(); dialTo(pick + (e.deltaY < 0 ? 1 : -1)); };
  canvas.addEventListener("wheel", wheel, {passive: false}); num.addEventListener("wheel", wheel, {passive: false});
  toggle.onclick = () => { if (dialOpen) setLayer(layer); else openDial(); };  // while open: close, keep the confirmed layer
  backBtn.onclick = back;
  // Click outside the floating dial closes it and keeps the confirmed layer.
  document.addEventListener("mousedown", e => { if (dialOpen && !top.contains(e.target) && !toggle.contains(e.target)) setLayer(layer); }, true);
  host.addEventListener("contextmenu", e => { if (dialOpen || layer > 0) { e.preventDefault(); back(); } });

  // Keyboard: only while a layer is on or the dial is open, never while typing in a field.
  document.addEventListener("keydown", e => {
    if ((!layer && !dialOpen) || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target, typing = t && (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || (t.tagName === "INPUT" && !/^(checkbox|radio|range|button|file)$/.test(t.type)));
    if (typing) return;
    if (e.key === "Escape") { e.preventDefault(); setLayer(0); return; }
    if (e.key === "Backspace") { e.preventDefault(); back(); return; }
    const f = /^F(\d{1,2})$/.exec(e.key);
    if (f && layer && +f[1] >= 1 && +f[1] <= 12) { e.preventDefault(); openMenu(+f[1]); return; }
    if (menu && !dialOpen && BUTTON_KEYS.includes(e.key)) { e.preventDefault(); press(e.key); }
  });

  setLayer(0);
  return {openDial, setLayer, openMenu, press, back, state: () => ({layer, pick, dialOpen, menu, lastButton})};
}
