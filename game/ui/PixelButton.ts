import Phaser from 'phaser';

export const PIXEL_FONT = '"Press Start 2P", monospace';

/** Pixel font text style. Sizes snap to multiples of 4 so glyphs stay crisp. */
export const pixelText = (size: number, color = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: PIXEL_FONT,
  fontSize: `${Math.max(8, Math.round(size / 4) * 4)}px`,
  color,
  ...extra,
});

/** Integer scale that fits `natural` into `available` (fractional only when even 1x doesn't fit). */
export const pixelScale = (natural: number, available: number, max = 4): number => {
  const fit = available / natural;
  return fit >= 1 ? Math.min(max, Math.floor(fit)) : fit;
};

/**
 * Chunky pixel-art button drawn in code (notched corners, 1-px "pixel" = `px`),
 * so every button shares one proportion and stays sharp at any size.
 */
export default class PixelButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw = 0;
  private bh = 0;
  private hovered = false;
  selected = false;
  accent: number;

  constructor(scene: Phaser.Scene, text: string, onClick: () => void, accent = 0xffffff) {
    super(scene);
    this.accent = accent;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, pixelText(16)).setOrigin(0.5);
    this.add([this.bg, this.label]);
    scene.add.existing(this);

    this.on('pointerover', () => { this.hovered = true; this.redraw(); });
    this.on('pointerout', () => { this.hovered = false; this.setScale(1); this.redraw(); });
    this.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.setScale(0.94);
    });
    this.on('pointerup', () => { this.setScale(1); onClick(); });
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  /** Resizes the button; font size follows the height. */
  layout(w: number, h: number, fontSize = h * 0.36): this {
    this.bw = Math.round(w);
    this.bh = Math.round(h);
    this.label.setStyle(pixelText(fontSize, '#ffffff', { align: 'center', lineSpacing: 6 }));
    this.setSize(this.bw, this.bh);
    // setInteractive() won't replace an existing hit area, so resize it in place on relayout.
    if (this.input) (this.input.hitArea as Phaser.Geom.Rectangle).setSize(this.bw, this.bh);
    else this.setInteractive({ useHandCursor: true });
    this.redraw();
    return this;
  }

  redraw(): this {
    const w = this.bw;
    const h = this.bh;
    const px = Math.max(2, Math.round(h / 16));
    const x = -w / 2;
    const y = -h / 2;
    const active = this.selected || this.hovered;
    const border = active ? this.accent : 0x8892b0;
    const fill = this.selected ? Phaser.Display.Color.ValueToColor(this.accent).darken(70).color : 0x0b1022;
    const g = this.bg.clear();

    // Drop shadow
    g.fillStyle(0x000000, 0.6);
    this.notchedRect(g, x + px, y + px, w, h, px);
    // Border
    g.fillStyle(border, 1);
    this.notchedRect(g, x, y, w, h, px);
    // Inner fill
    g.fillStyle(fill, 1);
    this.notchedRect(g, x + px, y + px, w - px * 2, h - px * 2, px);
    // Top highlight line
    g.fillStyle(0xffffff, active ? 0.25 : 0.1);
    g.fillRect(x + px * 2, y + px * 2, w - px * 4, px);

    this.label.setColor(this.selected ? '#ffffff' : active ? Phaser.Display.Color.IntegerToColor(this.accent).rgba : '#c8d0e8');
    return this;
  }

  /** Rectangle with one-"pixel" cut corners. */
  private notchedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, px: number): void {
    g.fillRect(x + px, y, w - px * 2, h);
    g.fillRect(x, y + px, w, h - px * 2);
  }
}

/** Big pixel-font title with a vertical gradient fill, thick outline and drop shadow. */
export function pixelTitle(scene: Phaser.Scene, text: string, top: string, bottom: string, stroke: string): Phaser.GameObjects.Text {
  const t = scene.add.text(0, 0, text, pixelText(32, top, { stroke, strokeThickness: 8, align: 'center' })).setOrigin(0.5);
  t.setShadow(4, 4, '#000000', 0, true, true);
  t.setData('gradient', [top, bottom]);
  return t;
}

/** Re-applies a title's gradient after a font-size change (the gradient is in text-space pixels). */
export function sizeTitle(t: Phaser.GameObjects.Text, size: number): void {
  t.setFontSize(Math.max(8, Math.round(size / 4) * 4));
  const [top, bottom] = t.getData('gradient') as [string, string];
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  g.addColorStop(0, top);
  g.addColorStop(0.55, bottom);
  g.addColorStop(1, top);
  t.setFill(g);
}

/** Opens a full-screen overlay scene (Guide, Hangar) on top of `from`, pausing it until the overlay closes. */
export function openOverlay(from: Phaser.Scene, key: string): void {
  from.scene.launch(key, { from: from.scene.key });
  from.scene.pause();
}
