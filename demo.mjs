import { BUTTON_KEYS, mountKeyboardLayer } from "./src/sisla-keyboard-layer.js";

const speed = document.querySelector("#speed");
const readout = document.querySelector("#speed-value");
const writeSpeed = value => {
  speed.value = value;
  speed.dispatchEvent(new Event("input", { bubbles: true }));
};
speed.addEventListener("input", () => { readout.value = speed.value; });

// Reuse the two sample actions in every menu so any dial and F-key choice can be tested.
const buttons = {
  "1": {
    label: "Increase speed",
    desc: "Increase the sample app slider by one.",
    run: () => {
      writeSpeed(Number(speed.value) + 1);
      return speed.value;
    },
  },
  "2": {
    label: "Speed adjustment",
    desc: "Open a slider that controls the sample app speed.",
    mount(host) {
      const label = document.createElement("label");
      label.textContent = "Speed ";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = speed.min;
      slider.max = speed.max;
      const sync = () => { slider.value = speed.value; };
      sync();
      slider.addEventListener("input", () => writeSpeed(slider.value));
      speed.addEventListener("input", sync);
      label.append(slider);
      host.append(label);
      return () => speed.removeEventListener("input", sync);
    },
  },
};
for (const [index, key] of BUTTON_KEYS.entries()) {
  buttons[key] ??= {
    label: `Sample action ${index + 1}`,
    desc: "This splash screen is available for review. No app command is assigned to this slot.",
  };
}
const demoLayer = {
  desc: "Every F key opens 12 review buttons. The first two control the sample speed.",
  menus: Object.fromEntries(Array.from({length: 12}, (_, i) => [
    i + 1, {desc: "Open any of the 12 splash screens. Buttons 1 and 2 adjust the sample speed.", buttons},
  ])),
};
const layers = Object.fromEntries(Array.from({length: 100}, (_, i) => [i + 1, demoLayer]));

mountKeyboardLayer(document.querySelector("#kb"), {
  layers,
  onLog: message => { document.querySelector("#log").textContent = message; },
});
