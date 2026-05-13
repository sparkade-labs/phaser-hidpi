/**
 * phaser-hidpi.js
 *
 * Makes Phaser games render crisp on HiDPI / Retina screens by rendering
 * the canvas at physical pixel resolution (1:1 with the device's actual
 * pixels), then letting CSS scale the display back to logical size.
 *
 * Strategy:
 *   - Canvas backing  = W * DPR  x  H * DPR     (physical pixels)
 *   - CSS display     = W        x  H           (logical, browser does 1:1 downscale)
 *   - Camera zoom     = 1                       (no zoom — game coords ARE physical pixels)
 *   - All game code expresses sizes/positions in physical pixels via `px()`
 *
 * This is the only approach that actually produces crisp text in Phaser 4,
 * because Phaser 4's `text.resolution` does not produce the effect its docs
 * describe. Rendering glyphs at full physical font size is the only way to
 * get them rasterised at native screen density.
 *
 * Usage:
 *
 *   const { game: gameCfg, px } = devicePixelRender({
 *     width : 390,
 *     height: 844,
 *     scene : [MenuScene, GameScene],
 *     type  : Phaser.AUTO,
 *     // ...any other Phaser config
 *   });
 *
 *   new Phaser.Game(gameCfg);
 *
 * Then in your game code, wrap pixel quantities with `px(...)`:
 *
 *   this.add.text(px(W / 2), px(20), 'SCORE', {
 *     fontSize: px(40) + 'px',
 *     strokeThickness: px(3),
 *   });
 *
 *   gfx.lineStyle(px(2), 0xff00ff, 1);
 *   gfx.fillCircle(px(x), px(y), px(42));
 *
 * Best practice: pre-multiply constants once so you don't repeat px() at
 * every call site:
 *
 *   const W      = px(Math.min(window.innerWidth, 480));
 *   const H      = px(window.innerHeight);
 *   const BASE_R = px(42);
 *
 * Now W, H, BASE_R are already in physical pixels and can be used directly.
 *
 * On standard (non-HiDPI) displays, px() returns its argument unchanged and
 * the plugin is a no-op. Safe to leave in for all targets.
 */
(function (root) {
  'use strict';

  function devicePixelRender(config) {
    var DPR = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    var px = (DPR === 1)
      ? function (n) { return n; }
      : function (n) { return n * DPR; };

    config = Object.assign({}, config || {});

    if (DPR > 1) {
      var logicalW = config.width  || window.innerWidth;
      var logicalH = config.height || window.innerHeight;

      // Canvas backing at physical pixels.
      config.width  = Math.round(logicalW * DPR);
      config.height = Math.round(logicalH * DPR);

      // ScaleManager pins the CSS display size back to logical via zoom=1/DPR.
      // mode=NONE so ScaleManager doesn't try to fit/resize on its own.
      config.scale = Object.assign({}, config.scale || {}, {
        mode  : Phaser.Scale.NONE,
        width : config.width,
        height: config.height,
        zoom  : 1 / DPR,
      });
    }

    // Expose DPR for advanced use (e.g. conditional asset selection).
    px.DPR = DPR;

    return { game: config, px: px };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = devicePixelRender;
  } else {
    root.devicePixelRender = devicePixelRender;
  }
})(typeof window !== 'undefined' ? window : this);