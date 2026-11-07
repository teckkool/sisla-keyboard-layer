# SISLA Rotary Control integration

Serve this folder with `python3 -m http.server 8000` and open http://localhost:8000/demo.html.
All 12 action slots open a splash screen across all layers and F keys. Slots 3–12 are display-only examples. Button 1 increases speed and Button 2 opens an adjustment slider.

## Connect an app

Import `mountKeyboardLayer` from `src/sisla-keyboard-layer.js`. Mount once on the app’s control host and pass its own `layers` object. Use `demo.mjs` as the pattern. The demo’s slot numbers are examples. Each app supplies its approved assignments.

- Layers use IDs 1–100 and a `desc` for the dial preview.
- Menus use IDs 1–12 and a `desc` for the F-key preview.
- Action buttons appear as 1–12. The map keys in that order are `1 2 3 4 5 6 7 8 9 0 - =`.
- Actions supply a `label` and `desc`. A `run()` callback calls an existing app command. An optional `mount(element, context)` callback can instead render controls inside the action page. It receives the layer number, menu number, shortcut key, and a Back callback. It can return a cleanup function for subscriptions or other resources.
- Mount inside the app’s left sidebar and keep that sidebar’s overflow visible where the wide pop-up needs to extend to its right. The example includes the browser demo’s layout and button styling.
- The rotary control keeps Desktop and no selection separate. Leave unmapped slots out of the map.

For an AutoShape Rectangle Pull tool, connect the action page to the app’s existing rectangle and pull controls and its selected geometry. The shared control handles navigation and descriptions. The app owns the actual adjustment and edit.

The original first demo remains in `index.html`.
