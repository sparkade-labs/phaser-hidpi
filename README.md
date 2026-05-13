# phaser-hidpi

A wrapper plugin that fixes blurry text in Phaser 4 games on mobile and high pixel density screens.

If your Phaser game looks fine on desktop but the text and graphics are blurry on a phone, tablet, or high-DPI monitor, this plugin solves it by rendering the canvas at the device's native pixel resolution.

## Install

### npm

```bash
npm install @sparkade-labs/phaser-hidpi
```

```js
import devicePixelRender from '@sparkade-labs/phaser-hidpi';
```

### Script tag

Download `phaser-hidpi.js` and include it after Phaser:

```html
<script src="phaser.min.js"></script>
<script src="phaser-hidpi.js"></script>
```

`devicePixelRender` becomes a global.

## Usage

The plugin returns two things:

1. A `game` config object to pass to `new Phaser.Game()`. It contains the canvas size and scale settings, pre-configured for the device's pixel ratio.
2. A `px()` helper. You wrap pixel values with it in your scene code so they render at the right size for the screen.

Here is the minimum setup:

```js
// Step 1: Decide on your game's logical size (how big it looks to the user
// in CSS pixels). On mobile this is usually the window size.
const LOGICAL_W = Math.min(window.innerWidth, 480);
const LOGICAL_H = window.innerHeight;

// Step 2: Call the plugin. It returns the Phaser config and the px() helper.
// On a regular (DPR 1) screen, px() is a no-op and returns its input.
// On a high pixel density screen, px(n) returns n multiplied by the device's
// pixel ratio (usually 2 or 3 on modern phones and tablets).
const { game, px } = devicePixelRender({
  width:  LOGICAL_W,
  height: LOGICAL_H,
});

// Step 3: Pre-multiply your game constants once. After this, W, H, and RADIUS
// are in physical pixels. You can use them directly throughout your code
// without calling px() at every reference.
const W      = px(LOGICAL_W);
const H      = px(LOGICAL_H);
const RADIUS = px(42);

// Step 4: Write your scenes as normal. Wrap inline pixel literals with px().
class GameScene extends Phaser.Scene {
  create() {
    // px(20) and px(40) make sure the score sits 20 pixels from the top
    // and renders at 40 pixels tall on every screen.
    this.add.text(W / 2, px(20), 'SCORE', {
      fontSize:        px(40) + 'px',
      strokeThickness: px(3),
    }).setOrigin(0.5, 0);

    // The radius is already wrapped in the RADIUS constant, so no px() needed
    // at this call site.
    const gfx = this.add.graphics();
    gfx.lineStyle(px(2), 0xff00ff, 1);
    gfx.fillCircle(W / 2, H / 2, RADIUS);
  }
}

// Step 5: Merge the plugin's game config with the rest of your Phaser config.
// Object.assign(game, { ... }) keeps the canvas/scale settings the plugin set
// up, while letting you add your scenes, parent element, renderer type, etc.
new Phaser.Game(Object.assign(game, {
  type:   Phaser.AUTO,
  scene:  [GameScene],
  parent: document.body,
}));
```

That's the whole library: a config patch and a function. Everything else in your game stays the same.

## API

`devicePixelRender({ width, height })` returns:

| Property | Type | Description |
|---|---|---|
| `game`   | object   | Phaser config with canvas sized to physical pixels. Pass it to `new Phaser.Game()`. |
| `px`     | function | `px(n)` returns `n * devicePixelRatio`. Returns `n` unchanged when DPR is 1. |
| `px.DPR` | number   | The detected device pixel ratio. Useful if you want to load different assets at different densities. |

## Using `px()`

The rule is: wrap anything that represents a pixel measurement. Coordinates, sizes, radii, font sizes, line widths, stroke thickness.

For a clean codebase, wrap your constants once at the top of the file. After that, you only need `px()` at call sites where a raw number appears inline.

```js
// Wrap once
const W       = px(LOGICAL_W);   // canvas width in physical pixels
const H       = px(LOGICAL_H);   // canvas height in physical pixels
const BASE_R  = px(42);          // target hit radius
const HUD_H   = px(78);          // HUD bar height
const PADDING = px(16);          // standard padding

// Then at call sites, the constants are already correct.
// Only the inline literal '20' needs px().
this.add.text(W / 2, px(20), 'TITLE', {
  fontSize: px(40) + 'px',
});

gfx.fillRect(0, 0, W, HUD_H);
gfx.fillCircle(x, y, BASE_R);
```

### What to wrap

| Type | Why it needs wrapping | Example |
|---|---|---|
| Coordinates | Positions in the canvas are in physical pixels. An unwrapped `100` means 100 backing pixels, which is roughly 33 CSS pixels on a DPR 3 screen. | `add.text(px(100), px(200), ...)` |
| Sizes and dimensions | Same reason as coordinates. `fillRect(0, 0, 200, 100)` would draw a small rectangle in the top-left corner. | `gfx.fillRect(0, 0, W, px(78))` |
| Radii | A circle of radius 42 on a DPR 3 backing is the visual size of a 14-pixel CSS radius. Tiny. | `gfx.fillCircle(x, y, px(42))` |
| Font sizes | This is the big one. `fontSize: '40px'` renders 40 backing pixels tall, which looks tiny and defeats the whole point. | `fontSize: px(40) + 'px'` |
| Line widths | A 1-pixel line on a DPR 3 backing is one-third of a CSS pixel and may not render at all. | `gfx.lineStyle(px(2), 0xff00ff, 1)` |
| Stroke thickness on text | Same as line widths. Unwrapped strokes vanish. | `strokeThickness: px(3)` |
| Line spacing | Vertical spacing between lines of text is a pixel measurement. | `lineSpacing: px(8)` |
| Tween targets when tweening by pixels | If you tween `y` from 0 to 100, that 100 is a pixel offset. | `tweens.add({ targets: t, y: px(-64), ... })` |
| Container child offsets | Children of a Container have positions relative to the container, in pixels. | `panel.add(text); text.y = px(-115)` |

### What not to wrap

| Type | Why | Example |
|---|---|---|
| Colors | Color values are not measurements. They are hex codes or strings. | `0x00ffee`, `'#ffffff'` |
| Alpha values | Alpha is a ratio between 0 and 1. Wrapping it would push it outside the valid range. | `fillStyle(color, 0.85)` |
| `setScale()` arguments | Scale is a multiplier applied to existing pixel size. `setScale(2)` doubles the object. Wrapping would over-scale by the DPR. | `setScale(1.2)` |
| Angles and rotation | Angles are in radians or degrees, not pixels. | `setAngle(-15)` |
| Tween durations and delays | Durations are milliseconds. A `duration: 1000` is one second on every device. | `duration: 1000` |
| Easing names | Strings, not numbers. | `ease: 'Sine.easeInOut'` |
| Booleans, scene keys, font family strings | Not numbers. | `key: 'GameScene'`, `fontFamily: 'monospace'` |
| Constants already wrapped | Don't double-wrap. If `BASE_R = px(42)`, then `BASE_R` is already in physical pixels. Calling `px(BASE_R)` again would multiply by DPR a second time. | Use `BASE_R` directly |

## Pointer input

The plugin sets the canvas backing buffer to physical pixels. When you tap or click, Phaser reports `pointer.x` and `pointer.y` in physical pixels automatically. Your game's coordinates are also in physical pixels (because you wrapped them with `px()`). The two coordinate spaces match, so hit-tests work without any transformation:

```js
this.input.on('pointerdown', (ptr) => {
  // ptr.x and ptr.y come in as physical pixels.
  // target.x and target.y were set using physical pixels too.
  // So the distance check works directly.
  const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, target.x, target.y);
  if (dist <= RADIUS) {
    // hit
  }
});
```

You do not need to call `camera.getWorldPoint()`. You do not need to multiply or divide pointer coordinates by DPR.

## How it works

`window.devicePixelRatio` (DPR) reports how many physical pixels the screen uses per CSS pixel. It is 1 on a standard desktop monitor, 2 on most phones and tablets (and Apple's Retina displays), and 3 on flagship Android devices like the Samsung Galaxy S series and high-end iPhones. By default Phaser sizes its canvas in CSS pixels, so the browser then upscales the rendered canvas to fill physical pixels, and the result is blurry.

The plugin does three things to fix this:

1. **Resizes the canvas backing buffer** to `width * DPR` by `height * DPR` physical pixels. This is what gives you native screen resolution.
2. **Sets `scale.zoom = 1 / DPR`** so the canvas displays at logical width and height on the page. The canvas is large internally but appears the right size visually.
3. **Provides `px(n)`** so your game code places objects in the physical pixel coordinate space the canvas now uses.

The canvas renders at native resolution. The browser displays it 1:1 with the screen's physical pixels. Text and graphics are crisp.

## Compatibility

- Phaser 4.x
- Both Canvas and WebGL renderers
- No-op on standard displays (DPR 1), safe to include unconditionally

## License

MIT © [Sparkade Labs](https://github.com/sparkade-labs)