import Phaser from 'phaser';
import PixelButton, { pixelText, pixelTitle, sizeTitle } from '../ui/PixelButton';
import { LEVELS, PERKS, ABILITIES, type LevelDef } from '../managers/LevelManager';
import { POWER_DURATIONS } from '../entities/Player';

type Row = { texture?: string; title: string; color: number; desc: string };
type Tab = 'powers' | 'enemies' | 'bosses';

const secs = (k: keyof typeof POWER_DURATIONS) => `${POWER_DURATIONS[k] / 1000}S`;

const POWERS: Row[] = [
  { texture: 'powerup_shield', title: `ESCUDO · ${secs('shield')}`, color: 0x3d7bff, desc: 'ABSORBE IMPACTOS Y DESTRUYE A LOS ENEMIGOS QUE TE CHOCAN' },
  { texture: 'powerup_rapid', title: `DISPARO RAPIDO · ${secs('rapid')}`, color: 0xffd21f, desc: 'DOBLA LA CADENCIA DE FUEGO' },
  { texture: 'powerup_bomb', title: 'HYPER BOMB +1', color: 0xff3333, desc: 'CARGA EXTRA (MAX 5). LANZALA CON X, B, CLIC DERECHO O DOBLE TOQUE: BORRA LAS BALAS ENEMIGAS' },
  { texture: 'powerup_spread', title: `ABANICO · ${secs('spread')}`, color: 0x3dff6e, desc: '3 A 5 PROYECTILES EN ARCO' },
  { texture: 'powerup_missile', title: `MISILES · ${secs('missile')}`, color: 0xff8a1f, desc: 'MISILES TELEDIRIGIDOS DESDE LAS ALAS' },
  { texture: 'powerup_drone', title: `DRON · ${secs('drone')}`, color: 0xc8d0e8, desc: 'SATELITE QUE ORBITA Y DISPARA ORBES TELEDIRIGIDOS' },
  { texture: 'powerup_magnet', title: `IMAN · ${secs('magnet')}`, color: 0xb04dff, desc: 'ATRAE LOS POWER-UPS HACIA TU NAVE' },
  ...Object.values(PERKS).map(p => ({ title: `MEJORA: ${p.title}`, color: 0x4dd9ff, desc: `${p.desc} · SE ELIGE AL LIMPIAR UN SECTOR` })),
];

const firstSector = (kind: LevelDef['unlock']) => LEVELS.find(l => l.unlock === kind)?.id ?? 1;

const ENEMIES: Row[] = [
  { texture: 'en_drone', title: 'DRONE · BLANCO', color: 0xe0e0e0, desc: 'SIN HABILIDAD. VUELA RECTO, EN ZIG-ZAG O EN FORMACION V · SECTOR 1' },
  { texture: 'en_gunship_red', title: 'GUNSHIP · ROJO', color: ABILITIES.red.color, desc: `${ABILITIES.red.name}: TE APUNTA CADA 2 SEGUNDOS · SECTOR 1` },
  { texture: 'en_lancer_yellow', title: 'LANCER · AMARILLO', color: ABILITIES.yellow.color, desc: `${ABILITIES.yellow.name}: SE DETIENE, PARPADEA Y SE LANZA HACIA TI · SECTOR ${firstSector('lancer')}` },
  { texture: 'en_pod_blue', title: 'POD · AZUL', color: ABILITIES.blue.color, desc: `${ABILITIES.blue.name}: SU BURBUJA ABSORBE 3 IMPACTOS · SECTOR ${firstSector('pod')}` },
  { texture: 'en_gunship_orange', title: 'GUNSHIP · NARANJA', color: ABILITIES.orange.color, desc: `${ABILITIES.orange.name}: RAFAGA DE 3 A 5 DISPAROS · SECTOR ${firstSector('spreader')}` },
  { texture: 'en_spider_green', title: 'SPIDERLING · VERDE', color: ABILITIES.green.color, desc: `${ABILITIES.green.name}: AL MORIR SUELTA 2 DRONES · SECTOR ${firstSector('splitter')}` },
  { texture: 'en_drone_purple', title: 'BLINKER · PURPURA', color: ABILITIES.purple.color, desc: `${ABILITIES.purple.name}: SALTA DE LADO Y DISPARA AL REAPARECER · SECTOR ${firstSector('blinker')}` },
  { texture: 'en_drone_yellow', title: 'KAMIKAZE · AMARILLO', color: ABILITIES.yellow.color, desc: `PERSIGUE Y CHOCA, LLEGA EN ENJAMBRES · SECTOR ${firstSector('kamikaze')}` },
  { texture: 'en_gunship_cyan', title: 'GUNSHIP · CIAN', color: ABILITIES.cyan.color, desc: `${ABILITIES.cyan.name}: SE DETIENE Y DISPARA UN RAYO ANUNCIADO · SECTOR ${firstSector('laser')}` },
  { texture: 'asteroid', title: 'ASTEROIDE', color: 0xc8d0e8, desc: 'GIRA A LA DERIVA Y SE ROMPE EN FRAGMENTOS' },
  { texture: 'en_mine_5', title: 'MINA', color: 0xff3333, desc: 'TE PERSIGUE Y A LOS 3 SEGUNDOS ESTALLA EN 8 PROYECTILES' },
];

const BOSS_DESC: Record<LevelDef['boss'], string> = {
  goliath: 'CANON PESADO EN V Y ASTEROIDES QUE LO ORBITAN COMO ESCUDO',
  viper: 'EMBESTIDAS EN ZIG-ZAG Y ABANICOS DE PUAS DE PLASMA',
  aegis: 'ORBES GIRATORIOS BLOQUEAN TUS DISPAROS: ATACA POR LOS FLANCOS',
  hydra: 'DOS TORRETAS ALARES; SI PIERDE UNA DISPARA RAYOS CONCENTRADOS',
  miner: 'SIEMBRA MINAS QUE ESTALLAN EN ANILLOS',
  phantom: 'SE TELETRANSPORTA Y CREA SENUELOS CON DISPAROS FALSOS',
  carrier: 'NAVE NODRIZA QUE DESPLIEGA ENJAMBRES KAMIKAZE',
  behemoth: 'LASER DE BARRIDO ANUNCIADO CON UNA LINEA GUIA',
  titan: 'VORTICE GRAVITATORIO QUE TE ATRAE MIENTRAS DISPARA ESPIRALES',
  leviathan: '3 FASES: FORTALEZA, ESPIRAL (50%) Y AUTODESTRUCCION (20%)',
};

const BOSSES: Row[] = LEVELS.map(l => ({ texture: `boss_${l.id}`, title: `S${l.id} · ${l.bossName}`, color: 0xff6666, desc: `${l.name}: ${BOSS_DESC[l.boss]}` }));

/** In-game codex: power-ups, enemies (color = ability) and bosses, in scrollable tabs. */
export default class Guide extends Phaser.Scene {
  private from = 'MainMenu';
  private list!: Phaser.GameObjects.Container;
  private scroll = 0;
  private maxScroll = 0;
  private viewTop = 0;

  constructor() {
    super('Guide');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'MainMenu';
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x050814, 1).setOrigin(0).setInteractive();
    const title = pixelTitle(this, 'GUIA', '#9ff6ff', '#2f9fff', '#062a4a');
    sizeTitle(title, Math.min(32, width / 10));
    title.setPosition(width / 2, 24 + title.height / 2);

    const tabs: [Tab, string][] = [['powers', 'PODERES'], ['enemies', 'ENEMIGOS'], ['bosses', 'JEFES']];
    const col = Math.min(width - 24, 620);
    const tabW = (col - 16) / 3;
    const tabY = title.y + title.height / 2 + 30;
    const buttons = tabs.map(([key, label], i) => {
      const b = new PixelButton(this, label, () => this.show(key, buttons), 0x4dd9ff)
        .layout(tabW, 36, Math.min(12, tabW / 10))
        .setPosition(width / 2 + (i - 1) * (tabW + 8), tabY);
      return b;
    });

    this.viewTop = tabY + 30;
    const viewH = height - this.viewTop - 70;
    const maskShape = this.make.graphics({}).fillRect(0, this.viewTop, width, viewH);
    this.list = this.add.container(0, this.viewTop).setMask(maskShape.createGeometryMask());

    new PixelButton(this, 'VOLVER', () => this.close(), 0xffdd33).layout(Math.min(col, 260), 44, 12).setPosition(width / 2, height - 36);

    // Scroll with drag, mouse wheel or arrow keys.
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.scrollBy(-(p.y - p.prevPosition.y));
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.scrollBy(dy * 0.6));
    this.input.keyboard?.on('keydown-DOWN', () => this.scrollBy(60));
    this.input.keyboard?.on('keydown-UP', () => this.scrollBy(-60));
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.show('powers', buttons);
  }

  private show(tab: Tab, buttons: PixelButton[]) {
    buttons.forEach((b, i) => { b.selected = i === ['powers', 'enemies', 'bosses'].indexOf(tab); b.redraw(); });
    this.list.removeAll(true);
    const rows = tab === 'powers' ? POWERS : tab === 'enemies' ? ENEMIES : BOSSES;
    const { width, height } = this.scale;
    const col = Math.min(width - 24, 620);
    const left = (width - col) / 2;
    const icon = tab === 'bosses' ? 72 : 52;
    const small = col < 420;
    let y = 8;
    rows.forEach(r => {
      if (r.texture) {
        const img = this.add.image(left + icon / 2, y + icon / 2, r.texture);
        img.setScale(Math.min(icon / img.width, icon / img.height, tab === 'bosses' ? 1 : 1.2));
        this.list.add(img);
      }
      const tx = left + (r.texture ? icon + 12 : 0);
      const t = this.add.text(tx, y + 4, r.title, pixelText(small ? 8 : 12, Phaser.Display.Color.IntegerToColor(r.color).rgba));
      const d = this.add.text(tx, t.y + t.height + 6, r.desc, pixelText(8, '#c8d0e8', { wordWrap: { width: left + col - tx }, lineSpacing: 4 }));
      this.list.add([t, d]);
      y += Math.max(icon, t.height + d.height + 14) + 12;
    });
    this.maxScroll = Math.max(0, y - (height - this.viewTop - 70));
    this.scroll = 0;
    this.list.y = this.viewTop;
  }

  private scrollBy(dy: number) {
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, this.maxScroll);
    this.list.y = this.viewTop - this.scroll;
  }

  private close() {
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
