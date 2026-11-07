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
//     layers: { 1: { desc, menus: { 1: { desc, buttons: { "1": { label, desc, run, mount } } } } } },
//     onLog: (message) => {},           // optional
//     panel: element                    // optional: hidden around the open dial (default: nearest <aside>)
//   }) -> { openDial(), setLayer(n), openMenu(n), press(key), back(), state() }

// Dial scale in screen degrees (0 = right, 90 = down, 270 = top): 0 at the top, clockwise
// to 100 just left of the top. The 20° gap keeps 0 and 100 apart.
const DIAL_START = 270, DIAL_SWEEP = 340;
const DIAL_SIZE = 210;
const WAND_TAB_RADIUS = 39;
const WAND_TAB_HIT_RADIUS = 14;

export const BUTTON_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

const CSS = `
.skl{font-size:12.5px;position:relative}
/* While the dial is open, the rest of the panel is hidden so only the controls show. */
.skl-dial-open > :not(:has(.skl)){visibility:hidden}
.skl-dial-open > :has(.skl){border-color:transparent}
/* The dial floats over the panel: only the round dial shows, nothing around it. */
.skl-top{position:absolute;left:50%;top:0;transform:translateX(-50%);z-index:50;width:228px;max-width:100%;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;background:#0f1a2e;border:1px solid #24344f;border-radius:11px}
.skl-layer-preview,.skl-hover-preview,.skl-splash{box-sizing:border-box;width:100%;min-height:82px;overflow:auto;padding:8px 10px;border:1px solid #3a4d6e;border-radius:8px;background:#0b1424;color:#c9d6ea}
.skl-layer-preview strong,.skl-hover-preview h2,.skl-splash h2{display:block;margin:0;color:#fff;font-size:16px}
.skl-hover-preview p,.skl-splash p{margin:0}
.skl-hover-preview{pointer-events:none}
.skl-layer-preview,.skl-hover-preview{height:82px}
@media(max-width:639px){
  .skl:has(.skl-col) > .skl-hover-preview.skl-hide{display:block!important;visibility:hidden}
}
@media(min-width:640px){
  aside:has(.skl){overflow:visible}
  .skl-layer-preview,.skl-hover-preview,.skl-splash{position:absolute;top:56px;left:calc(100% + 16px);z-index:50;
    width:min(520px,calc(100vw - 270px));height:auto;min-height:160px;
    padding:24px;font-size:20px;line-height:1.4;
    box-shadow:0 8px 24px #0009}
  .skl-hover-preview,.skl-splash{left:calc(100% + 17px)}
  .skl-layer-preview strong,.skl-hover-preview h2,.skl-splash h2{margin-bottom:8px;font-size:30px}
}
.skl-dial{position:relative;width:100%;aspect-ratio:1}
.skl-dial canvas{touch-action:none;width:100%;height:100%;cursor:pointer;border-radius:50%;background:#0b1424;display:block;box-shadow:0 6px 22px rgba(0,0,0,.65),0 0 0 1px #24344f}
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
.skl-cols{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.skl-nav{display:flex;gap:6px;margin-top:8px}
.skl-nav button{flex:1;white-space:nowrap}
.skl-selected{background:#0066cc;border:1px solid #ffff00;border-radius:4px;color:#ffff00;padding:5px 8px;font-weight:700}
.skl-col button:is(.lit,:focus-visible){background:#004488;border-color:#2f8cf0}
.skl-col button:active{background:#0066cc;border-color:#ffff00}
.skl-cols:empty{display:none}
.skl-col{display:flex;flex-direction:column;gap:2px}
.skl-col button{min-height:24px;padding:0 6px;font-size:12px;text-align:left;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skl-col button{position:relative;overflow:visible}
.skl-col button.na:is(.lit,:focus-visible){opacity:1}
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
    <button class="skl-toggle">Layer</button>
    <div class="skl-top skl-hide">
      <div class="skl-layer-preview" aria-live="polite"><strong></strong><span></span></div>
      <div class="skl-row">
        <input class="skl-num" type="text" inputmode="numeric" maxlength="3" value="000" aria-label="Layer number" title="Type 0–100, drag up/down or scroll to change. Press Select (or Enter) to confirm.">
        <button class="skl-ok">Select</button>
      </div>
      <div class="skl-dial"><canvas width="420" height="420" title="Click, drag or scroll to select a layer"></canvas></div>
      <div class="skl-nav"><button data-back>Back</button></div>
    </div>
    <div class="skl-cols"></div>
    <div class="skl-nav skl-screen-nav skl-hide"><button data-back>Back</button><button data-desktop>Desktop</button></div>
    <div class="skl-status">Desktop</div>`;
  const layerPreview = host.querySelector(".skl-layer-preview");
  const layerPreviewTitle = layerPreview.querySelector("strong");
  const layerPreviewBody = layerPreview.querySelector("span");
  const canvas = host.querySelector("canvas"), g = canvas.getContext("2d");
  const okBtn = host.querySelector(".skl-ok"), num = host.querySelector(".skl-num"), toggle = host.querySelector(".skl-toggle"), top = host.querySelector(".skl-top");
  const cols = host.querySelector(".skl-cols"), status = host.querySelector(".skl-status"), screenNav = host.querySelector(".skl-screen-nav");
  let layer = null, pick = 0, dialOpen = false, menu = null, returnedMenu = null, lastButton = null, returnedButton = null, typed = false;  // pick = dial position, not yet confirmed

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
    const [tx, ty] = pt(v, WAND_TAB_RADIUS);
    g.beginPath(); g.arc(tx, ty, 11, 0, Math.PI * 2);
    g.fillStyle = "#fbbf24"; g.fill();
    g.strokeStyle = "#05090f"; g.lineWidth = 1.5; g.stroke();
    for (const offset of [-3, 0, 3]) {
      g.beginPath(); g.moveTo(tx - 4, ty + offset); g.lineTo(tx + 4, ty + offset);
      g.strokeStyle = "#594009"; g.lineWidth = 1; g.stroke();
    }
    g.lineCap = "butt";
  }

  function say(msg) { status.textContent = msg; }

  const preview = document.createElement("section");
  preview.className = "skl-hover-preview skl-hide";
  const previewTitle = document.createElement("h2");
  const previewBody = document.createElement("p");
  preview.append(previewTitle, previewBody);
  host.insertBefore(preview, cols);

  function showPreview(title, description) {
    previewTitle.textContent = title;
    previewBody.textContent = description;
    preview.classList.remove("skl-hide");
  }

  function restorePreview() {
    preview.classList.add("skl-hide");
    if (dialOpen || lastButton !== null || menuTransition !== undefined) return;

    const action = menuDef(layer, menu)?.buttons?.[returnedButton];
    if (action) {
      const number = BUTTON_KEYS.indexOf(returnedButton) + 1;
      showPreview(`F${menu} · Button ${number} · ${action.label}`, action.desc || "");
      return;
    }

    const previousFunction = menu === null && menuDef(layer, returnedMenu);
    if (previousFunction) {
      showPreview(`F${returnedMenu}`, previousFunction.desc || "");

    }
  }

  function bindPreview(button, title, description) {
    button.setAttribute("aria-label", title);
    const show = () => showPreview(title, description);
    const hide = () => restorePreview();
    button.addEventListener("click", event => {
      if (event.pointerType !== "touch" || preview.dataset.touchLabel === title) return;
      event.stopImmediatePropagation();
      cols.querySelector(".lit")?.classList.remove("lit");
      button.classList.add("lit");
      show();
      preview.dataset.touchLabel = title;
    }, true);
    button.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse") return;
      button.classList.add("lit");
      show();
    });
    button.addEventListener("pointerleave", event => {
      if (event.pointerType !== "mouse") return;
      button.classList.remove("lit");
      hide();
    });
    button.addEventListener("focus", () => { if (button.matches(":focus-visible")) show(); });
    button.addEventListener("blur", hide);
  }

  let disposeTool;

  function renderCols() {
    const cleanup = disposeTool;
    disposeTool = undefined;
    if (cleanup) {
      try { cleanup(); }
      catch (error) { onLog(`Tool cleanup failed: ${error.message}`); }
    }
    preview.classList.add("skl-hide");
    delete preview.dataset.touchLabel;
    cols.innerHTML = "";
    if (layer === null || dialOpen) return;
    const md = menuDef(layer, menu);
    if (md) {
      if (lastButton !== null) {
        const splash = document.createElement("section");
        splash.className = "skl-splash";
        const badge = document.createElement("span");
        badge.className = "skl-selected";
        badge.textContent = `F${menu} · Button ${BUTTON_KEYS.indexOf(lastButton) + 1}`;
        const title = document.createElement("h2");
        title.textContent = md.buttons[lastButton].label;
        const description = document.createElement("p");
        description.textContent = md.buttons[lastButton].desc || "";
        const nav = screenNav.cloneNode(true);
        nav.classList.remove("skl-hide", "skl-screen-nav");
        nav.querySelector("[data-back]").onclick = back;
        const desktop = nav.querySelector("[data-desktop]");
        desktop.classList.remove("skl-hide");
        desktop.onclick = () => setLayer(0);
        const tool = document.createElement("div");
        splash.append(badge, title, description, tool, nav);
        cols.appendChild(splash);
        const action = md.buttons[lastButton];
        if (typeof action.mount === "function") {
          try { disposeTool = action.mount(tool, {layer, menu, key: lastButton, back}); }
          catch (error) { tool.textContent = error.message; onLog(`Tool failed to open: ${error.message}`); }
        }
        return;
      }
    }
    if (!md) {
      const fcol = document.createElement("div"); fcol.className = "skl-col";
      for (let m = 1; m <= 12; m++) {
        const md = menuDef(layer, m), b = document.createElement("button");
        b.textContent = `F${m}`;
        const lettering = md ? `F${m}` : `F${m} · Unassigned`;
        bindPreview(b, lettering, md?.desc || "This function has no menu assigned on this layer.");
        if (!md) b.classList.add("na"); if (m === returnedMenu) b.classList.add("sel");
        b.onclick = () => openMenu(m);
        fcol.appendChild(b);
      }
      cols.appendChild(fcol);
      restorePreview();
      return;
    }
    const bcol = document.createElement("div"); bcol.className = "skl-col";
    for (const key of BUTTON_KEYS) {
      const bd = md.buttons?.[key], b = document.createElement("button");
      const number = BUTTON_KEYS.indexOf(key) + 1;
      b.textContent = String(number);
      const lettering = `F${menu} · Button ${number}`;
      bindPreview(b, lettering, bd?.desc || "This button has no action assigned in this menu.");
      if (!bd) b.classList.add("na"); if (key === returnedButton) b.classList.add("sel");
      b.onclick = () => press(key);
      bcol.appendChild(b);
    }
    cols.appendChild(bcol);
    restorePreview();
  }

  function layerLabel() {
    if (layer === null) return "Layer";
    const path = [`Layer ${layer}`];
    if (menu !== null) path.push(`F${menu}`);
    const button = lastButton ?? returnedButton;
    if (button !== null) path.push(`Button ${BUTTON_KEYS.indexOf(button) + 1}`);
    return path.join(" · ");
  }

  let menuTransition;

  function render() {
    clearTimeout(menuTransition);
    menuTransition = undefined;
    top.classList.toggle("skl-hide", !dialOpen);
    toggle.textContent = layerLabel(); toggle.classList.toggle("on", layer > 0);
    renderCols();
    screenNav.classList.toggle("skl-hide", dialOpen || layer === null || lastButton !== null);
    screenNav.querySelector("[data-desktop]").classList.toggle("skl-hide", returnedButton !== null && lastButton === null);
    status.classList.toggle("skl-hide", dialOpen || layer === null);
    panel?.classList.toggle("skl-dial-open", dialOpen);
  }

  // Move the dial only (scroll, drag, ring). The active layer changes on confirm.
  function describeLayer(n) {
    layerPreviewTitle.textContent = n === 0 ? "No selection" : `Layer ${n}`;
    layerPreviewBody.textContent = n === 0 ? "" : layerDef(n)?.desc || "No description has been assigned to this layer.";
  }

  function dialTo(n) {
    n = Math.max(0, Math.min(100, Math.round(+n) || 0));
    pick = n; typed = false; num.value = pad3(n); if (document.activeElement === num) num.select();
    drawDial(n);
    describeLayer(n);
  }

  function openDial() {
    returnedMenu = null;
    dialOpen = true; dialTo(layer ?? 0); render();
    num.focus(); num.select();
  }

  // Confirm a layer: the dial hides, F1–F12 show (or layer 0 = normal keyboard).
  function setLayer(n) {
    dialTo(n); layer = pick || null; dialOpen = false; menu = null; returnedMenu = null; lastButton = null; returnedButton = null;
    if (document.activeElement === num) num.blur();
    render();
    const ld = layerDef(layer);
    say(layer === null ? "Desktop" : ld ? `Layer ${layer} · press F1–F12` : `Layer ${layer} has no controls in this app · Back to choose another`);
  }

  function openMenu(m) {
    if (!layer) return false;
    const md = menuDef(layer, m);
    if (!md) { say(`F${m} is not assigned on layer ${layer}`); return false; }
    if (menuTransition !== undefined) return false;
    cols.querySelectorAll(".sel").forEach(button => button.classList.remove("sel"));
    cols.querySelectorAll(".skl-col button")[m - 1]?.classList.add("sel");
    preview.classList.add("skl-hide");
    menuTransition = setTimeout(() => {
      dialOpen = false; menu = m; returnedMenu = null; lastButton = null; returnedButton = null;
      if (document.activeElement === num) num.blur();
      render();
      say(`F${m} · press 1–0 - =`);
    }, 180);
    return !!md;
  }

  function press(key) {
    if (menuTransition !== undefined) return false;
    const bd = layer && menu && !dialOpen && lastButton === null ? menuDef(layer, menu)?.buttons?.[key] : null;
    if (!bd) { say(`${key} is not assigned${menu ? " in F" + menu : ""}`); return false; }
    lastButton = key; render();
    try { const out = bd.run?.(); const msg = `F${menu}·${key} ${bd.label}${typeof out === "string" ? " → " + out : ""}`; say(msg); onLog(msg); }
    catch (e) { say(`F${menu}·${key} failed: ${e.message}`); onLog(`Keyboard layer F${menu}·${key} failed: ${e.message}`); }
    return true;
  }

  // One step back: buttons -> F1–F12 -> dial -> layer 0.
  function back() {
    if (dialOpen) { setLayer(0); return; }
    if (lastButton !== null) { returnedButton = lastButton; lastButton = null; render(); say(`F${menu} · press 1–0 - =`); return; }
    if (menu) { returnedMenu = menu; menu = null; lastButton = null; returnedButton = null; render(); say(`Layer ${layer} · press F1–F12`); return; }
    if (layer > 0) openDial();
  }

  // Track continuous rotation while dragging so the gap cannot wrap the value.
  let ringDrag = null, numDrag = null;
  const dialPoint = e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * DIAL_SIZE / r.width - DIAL_SIZE / 2;
    const y = (e.clientY - r.top) * DIAL_SIZE / r.height - DIAL_SIZE / 2;
    return {x, y, angle: (Math.atan2(y, x) * 180 / Math.PI - DIAL_START + 720) % 360};
  };
  const overWandTab = ({x, y}) => {
    const angle = (DIAL_START + pick / 100 * DIAL_SWEEP) * Math.PI / 180;
    return Math.hypot(x - Math.cos(angle) * WAND_TAB_RADIUS,
                      y - Math.sin(angle) * WAND_TAB_RADIUS) <= WAND_TAB_HIT_RADIUS;
  };
  const confirmPick = () => {
    const candidate = typed && num.value !== "" ? +num.value : pick;
    if (candidate > 0) setLayer(candidate);
    else dialTo(0);
  };
  canvas.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const point = dialPoint(e);
    const angle = point.angle;
    const position = overWandTab(point) ? pick / 100 * DIAL_SWEEP
      : angle <= DIAL_SWEEP ? angle
      : angle > (DIAL_SWEEP + 360) / 2 ? angle - 360 : angle;
    ringDrag = {angle, position};
    canvas.style.cursor = "grabbing";
    dialTo(position / DIAL_SWEEP * 100);
  });
  canvas.addEventListener("pointermove", e => {
    if (!ringDrag) canvas.style.cursor = overWandTab(dialPoint(e)) ? "grab" : "pointer";
  });
  okBtn.addEventListener("pointerdown", e => e.preventDefault());   // keep typed digits until the click
  okBtn.onclick = confirmPick;                                     // Select = confirm
  window.addEventListener("pointermove", e => {
    if (ringDrag) {
      const point = dialPoint(e);
      if (Math.hypot(point.x, point.y) < 8) return;
      const step = (point.angle - ringDrag.angle + 540) % 360 - 180;
      ringDrag.position += step;
      ringDrag.angle = point.angle;
      dialTo(ringDrag.position / DIAL_SWEEP * 100);
    }
    if (numDrag && (numDrag.moved || Math.abs(numDrag.y - e.clientY) > 3)) { numDrag.moved = true; dialTo(numDrag.v + Math.round((numDrag.y - e.clientY) / 3)); }
  });
  canvas.addEventListener("pointercancel", () => { ringDrag = null; canvas.style.cursor = "pointer"; });
  window.addEventListener("pointerup", () => {
    if (ringDrag) { ringDrag = null; canvas.style.cursor = "pointer"; num.focus(); num.select(); return; }  // the dial only selects; Select confirms
    if (numDrag) { const moved = numDrag.moved; numDrag = null; num.focus(); num.select(); }  // click = type, drag = change
  });
  num.addEventListener("pointerdown", e => { if (e.pointerType === "touch" || e.button !== 0) return; e.preventDefault(); numDrag = {y: e.clientY, v: pick, moved: false}; });
  num.addEventListener("input", () => { num.value = num.value.replace(/\D/g, "").slice(0, 3); typed = true; describeLayer(Math.min(100, +num.value)); });
  num.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); confirmPick(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setLayer(0); }
  });
  num.addEventListener("blur", () => { if (!dialOpen) return; num.value = pad3(pick); typed = false; describeLayer(pick); });
  const wheel = e => { e.preventDefault(); dialTo(pick + (e.deltaY < 0 ? 1 : -1)); };
  canvas.addEventListener("wheel", wheel, {passive: false}); num.addEventListener("wheel", wheel, {passive: false});
  toggle.onclick = () => { if (dialOpen) setLayer(layer); else openDial(); };  // while open: close, keep the confirmed layer
  host.querySelectorAll("[data-back]").forEach(button => { button.onclick = back; });
  host.querySelectorAll("[data-desktop]").forEach(button => { button.onclick = () => setLayer(0); });
  // Click outside the floating dial closes it and keeps the confirmed layer.
  document.addEventListener("pointerdown", e => { if (dialOpen && !top.contains(e.target) && !toggle.contains(e.target)) setLayer(layer); }, true);
  host.addEventListener("contextmenu", e => { if (dialOpen || layer > 0) { e.preventDefault(); back(); } });

  // Keyboard: only while a layer is on or the dial is open, never while typing in a field.
  document.addEventListener("keydown", e => {
    if ((!layer && !dialOpen) || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target, typing = t && (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || (t.tagName === "INPUT" && !/^(checkbox|radio|range|button|file)$/.test(t.type)));
    if (dialOpen && (!typing || t === num) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      dialTo(pick + (e.key === "ArrowUp" ? 1 : -1));
      return;
    }
    if (typing) return;
    if (e.key === "Escape") { e.preventDefault(); setLayer(0); return; }
    if (e.key === "Backspace") { e.preventDefault(); back(); return; }
    const f = /^F(\d{1,2})$/.exec(e.key);
    if (f && layer && !menu && !dialOpen && +f[1] >= 1 && +f[1] <= 12) { e.preventDefault(); openMenu(+f[1]); return; }
    if (menu && !dialOpen && lastButton === null && BUTTON_KEYS.includes(e.key)) { e.preventDefault(); press(e.key); }
  });

  setLayer(0);
  return {openDial, setLayer, openMenu, press, back, state: () => ({layer, pick, dialOpen, menu, lastButton})};
}
