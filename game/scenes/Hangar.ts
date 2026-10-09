import Phaser from 'phaser';
import PixelButton, { pixelText, pixelTitle, sizeTitle, pixelScale } from '../ui/PixelButton';
import { SHIPS, SHIP_ORDER, loadShip, saveShip, shipInfo, type ShipId } from '../entities/Ships';
import { loadCampaign } from '../managers/LevelManager';
import { t, getLanguage } from '../utils/i18n';

const STATS: [key: 'speed' | 'fireRate' | 'lives' | 'bombs', value: (id: ShipId) => number, max: number][] = [
  ['speed', id => SHIPS[id].speed, 1.3],
  ['fireRate', id => SHIPS[id].fireRate * (1 + SHIPS[id].extraShots), 2.3],
  ['lives', id => SHIPS[id].lives, 7],
  ['bombs', id => SHIPS[id].bombs, 3],
];

/** Ship select: browse with arrows / swipe-free buttons; the choice applies to new campaigns. */
export default class Hangar extends Phaser.Scene {
  private from = 'MainMenu';
  private current: ShipId = 'vanguard';

  constructor() {
    super('Hangar');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'MainMenu';
    this.current = loadShip();
  }

  create() {
    const { width, height } = this.scale;
    const col = Math.min(width - 32, 520);
    this.add.rectangle(0, 0, width, height, 0x050814, 1).setOrigin(0).setInteractive();
    const title = pixelTitle(this, t('hangar'), '#fff27a', '#ff9d00', '#5a2a00');
    sizeTitle(title, Math.min(32, width / 9));
    title.setPosition(width / 2, 24 + title.height / 2);

    const shipY = title.y + title.height / 2 + height * 0.14;
    const ship = this.add.image(width / 2, shipY, `ship_${this.current}`).setAngle(-90);
    this.tweens.add({ targets: ship, y: shipY - 6, duration: 900, yoyo: true, loop: -1, ease: 'Sine.InOut' });
    const name = this.add.text(width / 2, 0, '', pixelText(col < 400 ? 16 : 24)).setOrigin(0.5);
    const ability = this.add.text(width / 2, 0, '', pixelText(12)).setOrigin(0.5);
    const desc = this.add.text(width / 2, 0, '', pixelText(8, '#c8d0e8', { align: 'center', wordWrap: { width: col }, lineSpacing: 4 })).setOrigin(0.5, 0);
    const counter = this.add.text(width / 2, 0, '', pixelText(8, '#8892b0')).setOrigin(0.5);
    const bars = this.add.graphics();
    const labels = STATS.map(() => this.add.text(0, 0, '', pixelText(8, '#c8d0e8')));

    const arrowSize = 44;
    const prev = new PixelButton(this, '◀', () => this.step(-1, render), 0x4dd9ff).layout(arrowSize, arrowSize, 16);
    const next = new PixelButton(this, '▶', () => this.step(1, render), 0x4dd9ff).layout(arrowSize, arrowSize, 16);
    const spread = Math.min(col / 2 - arrowSize / 2, 150);
    prev.setPosition(width / 2 - spread, shipY);
    next.setPosition(width / 2 + spread, shipY);

    const note = this.add.text(width / 2, height - 84, loadCampaign() ? t('hangarApplyNote') : '', pixelText(8, '#8892b0')).setOrigin(0.5);
    new PixelButton(this, t('ready'), () => this.close(), 0xffdd33).layout(Math.min(col, 260), 44, 12).setPosition(width / 2, height - 40);
    note.setVisible(!!note.text);

    const render = () => {
      const s = SHIPS[this.current];
      const isEn = getLanguage() === 'en';
      const info = shipInfo(this.current, isEn);
      const css = Phaser.Display.Color.IntegerToColor(s.color).rgba;
      ship.setTexture(`ship_${this.current}`).setScale(pixelScale(ship.width, Math.min(col * 0.4, height * 0.18), 3));
      name.setText(s.name).setColor(css).setY(shipY + ship.displayWidth / 2 + 24);
      ability.setText(info.ability).setColor(css).setY(name.y + 26);
      desc.setText(info.desc).setY(ability.y + 18);
      counter.setText(`${SHIP_ORDER.indexOf(this.current) + 1} / ${SHIP_ORDER.length}`).setY(shipY - ship.displayWidth / 2 - 14);
      bars.clear();
      const barW = Math.min(col - 120, 260);
      const x0 = width / 2 - (barW + 110) / 2 + 110;
      STATS.forEach(([statKey, value, max], i) => {
        const y = desc.y + desc.height + 22 + i * 22;
        labels[i].setText(t(statKey)).setPosition(x0 - 110, y - 4);
        bars.fillStyle(0x1e293b, 1).fillRect(x0, y - 4, barW, 10);
        bars.fillStyle(s.color, 1).fillRect(x0, y - 4, barW * Math.min(1, value(this.current) / max), 10);
      });
      saveShip(this.current);
    };
    render();

    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.step(-1, render));
    kb?.on('keydown-RIGHT', () => this.step(1, render));
    kb?.on('keydown-ENTER', () => this.close());
    kb?.on('keydown-ESC', () => this.close());
  }

  private step(dir: number, render: () => void) {
    this.current = SHIP_ORDER[Phaser.Math.Wrap(SHIP_ORDER.indexOf(this.current) + dir, 0, SHIP_ORDER.length)];
    render();
  }

  private close() {
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
