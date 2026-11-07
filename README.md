# SISLA Keyboard Layer Demo

Left-side control for SISLA apps (autoshape, 3D world, wind tunnel).

- 100 layers (rotary dial + 3-digit display)
- 12 function menus (F1–F12)
- 12 buttons per menu (1–0, -, =)
- Splash screens, hover lighting, popups
- On-screen keyboard option

Open `index.html` in a browser to try it.

## Rotary Layer Control (current version)

The finished control is in `src/sisla-keyboard-layer.js`, with a standalone demo in `demo.html`.
Serve the folder over HTTP to try it (`python3 -m http.server 8000`, then open
http://localhost:8000/demo.html).

Layer button → choose a layer on the dial → **Select** → F1–F12 → one of 12 buttons.

To continue the work with an AI assistant, give it [ROTARY-CONTROL-PROMPT.md](ROTARY-CONTROL-PROMPT.md).
