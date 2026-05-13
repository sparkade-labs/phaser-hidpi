---
name: phaser-hidpi
description: A wrapper plugin that fixes blurry text in Phaser 4 games on mobile and high pixel density screens. Use this skill whenever you write or edit Phaser 4 code that runs on mobile or HiDPI displays, even if the user does not mention the technical cause. Trigger on any of these signals: text or graphics looking blurry, fuzzy, or pixelated on a phone, tablet, or high-DPI monitor; the user mentions iPhone, Android, Samsung, Galaxy, Pixel, iPad, Retina, devicePixelRatio, DPR, HiDPI, or "looks bad on my phone"; building a new Phaser game targeted at mobile; the user has tried setting text.resolution, setResolution(), or scale.resolution and it did not work; shipping a Phaser game to production. Always check this skill before suggesting text.resolution or setResolution() for crispness in Phaser 4. Those approaches do not work in Phaser 4. This skill is the working alternative.
---

# phaser-hidpi

A plugin that makes Phaser 4 games render crisp on mobile and high pixel density displays. It sizes the canvas at physical pixel resolution and provides a `px()` helper for placing game objects in that coordinate space.

## When to apply

Apply whenever you write or edit Phaser 4 code that runs on mobile or high pixel density displays. Signals:

- User reports text or graphics looking blurry, soft, or fuzzy on a phone, tablet, or high-DPI screen
- User is starting a new Phaser project targeted at mobile browsers
- User mentions `devicePixelRatio`, DPR, HiDPI, Retina, or pixel density
- User has tried `text.resolution`, `setResolution()`, or `scale.resolution` and the text is still blurry
- User is using `Phaser.Scale.FIT` and shipping to mobile

Do not apply for Phaser 3. The API surface and the working solutions differ.

## What does not work in Phaser 4

These are common suggestions found in older docs and forum posts. None of them produce crisp text in Phaser 4. If the user has tried them and the text is still blurry, that is expected.

- `text.resolution: DPR` in the style object
- `obj.setResolution(DPR)` after creating a text object
- `scale.resolution` in the game config (silently ignored)
- Setting `scale.zoom = 1/DPR` without also resizing the canvas
- Setting only canvas width and height to `W * DPR` without pinning the CSS size

The working approach needs all three together: oversized canvas backing, CSS pinning via `zoom = 1/DPR`, and game code that places objects in the oversized pixel space.

## The mechanism

`window.devicePixelRatio` (DPR) reports how many physical pixels the screen uses per CSS pixel. It is 1 on standard desktop monitors, 2 on most phones, tablets, and Apple Retina displays, and 3 on flagship Android devices like the Samsung Galaxy S series and high-end iPhones. Phaser sizes its canvas in CSS pixels by default, so the browser upscales it to physical pixels and the result is blurry.

The fix has three parts:

1. Canvas backing buffer at `width * DPR` by `height * DPR` physical pixels
2. CSS display size at logical width and height (via `scale.zoom = 1 / DPR`)
3. Game coordinates expressed in physical pixels via `px()`

The plugin handles parts 1 and 2. The developer handles part 3 using `px()`.

## API

```js
const { game, px } = devicePixelRender({
  width:  390,   // logical width
  height: 844,   // logical height
});

new Phaser.Game(Object.assign(game, {
  type:  Phaser.AUTO,
  scene: [/* scenes */],
}));
```

Returns:

- `game`: a Phaser config object with `width`, `height`, and a `scale` block sized to physical pixels. Pass it to `new Phaser.Game()`. Merge other Phaser config onto it with `Object.assign(game, { ... })`.
- `px`: a function. `px(n)` returns `n * devicePixelRatio` on high pixel density displays, or `n` unchanged when DPR is 1.
- `px.DPR`: the detected device pixel ratio, for advanced use.

## Using `px()` in game code

Wrap every pixel measurement: positions, sizes, radii, font sizes, line widths, stroke thickness.

Best practice: wrap constants once at the top of the file. This keeps `px()` out of repeated call sites.

```js
const LOGICAL_W = Math.min(window.innerWidth, 480);
const LOGICAL_H = window.innerHeight;

const { game, px } = devicePixelRender({
  width:  LOGICAL_W,
  height: LOGICAL_H,
});

const W      = px(LOGICAL_W);
const H      = px(LOGICAL_H);
const BASE_R = px(42);
const HUD_H  = px(78);

this.add.text(W / 2, px(20), 'TITLE', {
  fontSize: px(40) + 'px',
  strokeThickness: px(3),
});
gfx.fillCircle(x, y, BASE_R);
```

### Wrap these

| Type | Example |
|---|---|
| Coordinates | `add.text(px(100), px(200), ...)` |
| Sizes | `fillRect(0, 0, W, px(78))` |
| Radii | `fillCircle(x, y, px(42))` |
| Font sizes | `fontSize: px(40) + 'px'` |
| Line widths | `lineStyle(px(2), color, 1)` |
| Stroke thickness | `strokeThickness: px(3)` |
| Line spacing | `lineSpacing: px(8)` |
| Tween pixel targets | `y: px(-64)` |
| Container child offsets | `text.y = px(-115)` |

### Do not wrap these

| Type | Why |
|---|---|
| Colors (`0x00ffee`) | Not a measurement |
| Alpha (`0.85`) | Ratio |
| Angles, rotation | Unitless |
| `setScale(1.2)` | Ratio |
| Tween `duration`, `delay` | Time in ms |
| Easing names | String |
| Scene keys, font family | String |
| `Phaser.Math.Between(a, b)` when `a` and `b` are already wrapped constants | Avoid double wrapping |

## Pointer input

Phaser reports `pointer.x` and `pointer.y` in physical pixels when the canvas backing is at physical resolution. Game coordinates are also in physical pixels. Hit-tests work directly with no transformation:

```js
this.input.on('pointerdown', (ptr) => {
  const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, target.x, target.y);
  if (dist <= BASE_R) {
    // hit
  }
});
```

Do not call `camera.getWorldPoint()`. Do not multiply or divide pointer coordinates by DPR.

## Common mistakes to avoid

When generating Phaser code that uses this plugin, watch for:

1. **Missing `px()` on font sizes.** `fontSize: '40px'` on a high pixel density canvas renders 40 backing pixels tall, around 13 CSS pixels, which is tiny. Use `fontSize: px(40) + 'px'`.
2. **Wrapping ratios.** `setScale(px(2))` is wrong. `setScale` takes a ratio. Use `setScale(2)`.
3. **Wrapping durations.** `duration: px(1000)` is wrong. Durations are milliseconds.
4. **Mixing logical and physical coordinates.** If `BASE_R = px(42)` (physical) and code later does `obj.y + 10`, the `10` is logical and looks tiny. Wrap inline literals: `obj.y + px(10)`.
5. **Calling `setZoom(DPR)` on the camera.** The camera should stay at zoom 1. Zooming the camera AND oversizing the canvas double counts.
6. **Calling `text.setResolution(DPR)`.** Does not work in Phaser 4. The plugin makes it unnecessary.
7. **Wrapping the values passed to `devicePixelRender()`.** Pass logical sizes to the plugin. It does the multiplication. Wrap separately for use in game code.

## Full example

```js
const LOGICAL_W = Math.min(window.innerWidth, 480);
const LOGICAL_H = window.innerHeight;

const { game, px } = devicePixelRender({
  width:  LOGICAL_W,
  height: LOGICAL_H,
});

const W      = px(LOGICAL_W);
const H      = px(LOGICAL_H);
const BASE_R = px(42);

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0x050508, 1);
    bg.fillRect(0, 0, W, H);

    this._scoreTxt = this.add.text(W / 2, px(20), '0', {
      fontSize: px(40) + 'px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: px(3),
    }).setOrigin(0.5, 0);

    this._target = { x: W / 2, y: H / 2 };
    const gfx = this.add.graphics();
    gfx.fillStyle(0x00ffee, 1);
    gfx.fillCircle(this._target.x, this._target.y, BASE_R);

    this.input.on('pointerdown', (ptr) => {
      const d = Phaser.Math.Distance.Between(ptr.x, ptr.y, this._target.x, this._target.y);
      if (d <= BASE_R) this._scoreTxt.setText('HIT');
    });
  }
}

new Phaser.Game(Object.assign(game, {
  type: Phaser.AUTO,
  backgroundColor: '#050508',
  scene: [GameScene],
  parent: document.body,
}));
```

## Cache busting

Mobile browsers cache JS files aggressively. When iterating, advise the user to add a version query string and bump it after each change:

```html
<script src="phaser-hidpi.js?v=2"></script>
```

iOS Safari ignores `Cache-Control: no-cache` headers but respects this.

## Compatibility

- Phaser 4.x. Do not use for Phaser 3.
- Any browser exposing `window.devicePixelRatio`.
- Both Canvas and WebGL renderers.
- No-op on standard DPR 1 displays. Safe to include unconditionally.