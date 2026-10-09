import Phaser from 'phaser';
import PixelButton, { pixelText, pixelTitle, sizeTitle } from '../ui/PixelButton';
import { LEVELS, PERKS, ABILITIES, type LevelDef, abilityName } from '../managers/LevelManager';
import { POWER_DURATIONS } from '../entities/Player';
import { t, getLanguage } from '../utils/i18n';

type Row = { texture?: string; title: string; color: number; desc: string };
type Tab = 'powers' | 'enemies' | 'bosses';

const secs = (k: keyof typeof POWER_DURATIONS) => `${POWER_DURATIONS[k] / 1000}S`;

function getPowers(isEn: boolean): Row[] {
  return [
    { texture: 'powerup_shield', title: isEn ? `SHIELD · ${secs('shield')}` : `ESCUDO · ${secs('shield')}`, color: 0x3d7bff, desc: isEn ? 'ABSORBS IMPACTS AND DESTROYS COLLIDING ENEMIES' : 'ABSORBE IMPACTOS Y DESTRUYE A LOS ENEMIGOS QUE TE CHOCAN' },
    { texture: 'powerup_rapid', title: isEn ? `RAPID FIRE · ${secs('rapid')}` : `DISPARO RAPIDO · ${secs('rapid')}`, color: 0xffd21f, desc: isEn ? 'DOUBLES FIRING RATE' : 'DOBLA LA CADENCIA DE FUEGO' },
    { texture: 'powerup_bomb', title: isEn ? 'HYPER BOMB +1' : 'HYPER BOMB +1', color: 0xff3333, desc: isEn ? 'EXTRA STOCK (MAX 5). TRIGGER WITH X, B, RIGHT CLICK OR DOUBLE TAP: CLEARS ALL ENEMY BULLETS' : 'CARGA EXTRA (MAX 5). LANZALA CON X, B, CLIC DERECHO O DOBLE TOQUE: BORRA LAS BALAS ENEMIGAS' },
    { texture: 'powerup_spread', title: isEn ? `SPREAD FAN · ${secs('spread')}` : `ABANICO · ${secs('spread')}`, color: 0x3dff6e, desc: isEn ? '3 TO 5 PROJECTILES IN AN ARC' : '3 A 5 PROYECTILES EN ARCO' },
    { texture: 'powerup_missile', title: isEn ? `MISSILES · ${secs('missile')}` : `MISILES · ${secs('missile')}`, color: 0xff8a1f, desc: isEn ? 'HOMING MISSILES LAUNCHED FROM SHIP WINGS' : 'MISILES TELEDIRIGIDOS DESDE LAS ALAS' },
    { texture: 'powerup_drone', title: isEn ? `DRONE · ${secs('drone')}` : `DRON · ${secs('drone')}`, color: 0xc8d0e8, desc: isEn ? 'ESCORT SATELLITE FIRING HOMING PLASMA ORBS' : 'SATELITE QUE ORBITA Y DISPARA ORBES TELEDIRIGIDOS' },
    { texture: 'powerup_magnet', title: isEn ? `MAGNET · ${secs('magnet')}` : `IMAN · ${secs('magnet')}`, color: 0xb04dff, desc: isEn ? 'DRAWS POWER-UPS DIRECTLY TOWARD YOUR SHIP' : 'ATRAE LOS POWER-UPS HACIA TU NAVE' },
    ...Object.values(PERKS).map(p => ({
      title: isEn ? `UPGRADE: ${p.titleEn}` : `MEJORA: ${p.title}`,
      color: 0x4dd9ff,
      desc: isEn ? `${p.descEn} · CHOSEN AFTER CLEARING A SECTOR` : `${p.desc} · SE ELIGE AL LIMPIAR UN SECTOR`
    })),
  ];
}

const firstSector = (kind: LevelDef['unlock']) => LEVELS.find(l => l.unlock === kind)?.id ?? 1;

function getEnemies(isEn: boolean): Row[] {
  return [
    { texture: 'en_drone', title: isEn ? 'DRONE · WHITE' : 'DRONE · BLANCO', color: 0xe0e0e0, desc: isEn ? 'STANDARD HULL. FLIES STRAIGHT, ZIG-ZAG OR V-FORMATION · SECTOR 1' : 'SIN HABILIDAD. VUELA RECTO, EN ZIG-ZAG O EN FORMACION V · SECTOR 1' },
    { texture: 'en_gunship_red', title: isEn ? 'GUNSHIP · RED' : 'GUNSHIP · ROJO', color: ABILITIES.red.color, desc: isEn ? `${ABILITIES.red.nameEn}: AIMS AT YOU EVERY 2 SECONDS · SECTOR 1` : `${ABILITIES.red.name}: TE APUNTA CADA 2 SEGUNDOS · SECTOR 1` },
    { texture: 'en_lancer_yellow', title: isEn ? 'LANCER · YELLOW' : 'LANCER · AMARILLO', color: ABILITIES.yellow.color, desc: isEn ? `${ABILITIES.yellow.nameEn}: STOPS, CHARGES AND RAMS TOWARD YOU · SECTOR ${firstSector('lancer')}` : `${ABILITIES.yellow.name}: SE DETIENE, PARPADEA Y SE LANZA HACIA TI · SECTOR ${firstSector('lancer')}` },
    { texture: 'en_pod_blue', title: isEn ? 'POD · BLUE' : 'POD · AZUL', color: ABILITIES.blue.color, desc: isEn ? `${ABILITIES.blue.nameEn}: BUBBLE SHIELD ABSORBS 3 HITS · SECTOR ${firstSector('pod')}` : `${ABILITIES.blue.name}: SU BURBUJA ABSORBE 3 IMPACTOS · SECTOR ${firstSector('pod')}` },
    { texture: 'en_gunship_orange', title: isEn ? 'GUNSHIP · ORANGE' : 'GUNSHIP · NARANJA', color: ABILITIES.orange.color, desc: isEn ? `${ABILITIES.orange.nameEn}: BURST OF 3 TO 5 SPREAD SHOTS · SECTOR ${firstSector('spreader')}` : `${ABILITIES.orange.name}: RAFAGA DE 3 A 5 DISPAROS · SECTOR ${firstSector('spreader')}` },
    { texture: 'en_spider_green', title: isEn ? 'SPIDERLING · GREEN' : 'SPIDERLING · VERDE', color: ABILITIES.green.color, desc: isEn ? `${ABILITIES.green.nameEn}: SPLITS INTO 2 ESCORT DRONES ON DEATH · SECTOR ${firstSector('splitter')}` : `${ABILITIES.green.name}: AL MORIR SUELTA 2 DRONES · SECTOR ${firstSector('splitter')}` },
    { texture: 'en_drone_purple', title: isEn ? 'BLINKER · PURPLE' : 'BLINKER · PURPURA', color: ABILITIES.purple.color, desc: isEn ? `${ABILITIES.purple.nameEn}: TELEPORTS SIDEWAYS AND SHOOTS ON RETURN · SECTOR ${firstSector('blinker')}` : `${ABILITIES.purple.name}: SALTA DE LADO Y DISPARA AL REAPARECER · SECTOR ${firstSector('blinker')}` },
    { texture: 'en_drone_yellow', title: isEn ? 'KAMIKAZE · YELLOW' : 'KAMIKAZE · AMARILLO', color: ABILITIES.yellow.color, desc: isEn ? 'FAST SWARM DART LOCKING IN FOR IMPACT · SECTOR ${firstSector(\'kamikaze\')}' : `PERSIGUE Y CHOCA, LLEGA EN ENJAMBRES · SECTOR ${firstSector('kamikaze')}` },
    { texture: 'en_gunship_cyan', title: isEn ? 'GUNSHIP · CYAN' : 'GUNSHIP · CIAN', color: ABILITIES.cyan.color, desc: isEn ? `${ABILITIES.cyan.nameEn}: STOPS AND FIRES TELEGRAPHED LASER BEAM · SECTOR ${firstSector('laser')}` : `${ABILITIES.cyan.name}: SE DETIENE Y DISPARA UN RAYO ANUNCIADO · SECTOR ${firstSector('laser')}` },
    { texture: 'asteroid', title: isEn ? 'ASTEROID' : 'ASTEROIDE', color: 0xc8d0e8, desc: isEn ? 'TUMBLES DRIFTING AND SPLINTERS INTO FRAGMENTS' : 'GIRA A LA DERIVA Y SE ROMPE EN FRAGMENTOS' },
    { texture: 'en_mine_5', title: isEn ? 'PROXIMITY MINE' : 'MINA', color: 0xff3333, desc: isEn ? 'HOMES IN AND DETONATES INTO AN 8-WAY RING' : 'TE PERSIGUE Y A LOS 3 SEGUNDOS ESTALLA EN 8 PROYECTILES' },
  ];
}

const BOSS_DESC: Record<LevelDef['boss'], { es: string; en: string }> = {
  goliath: { es: 'CANON PESADO EN V Y ASTEROIDES QUE LO ORBITAN COMO ESCUDO', en: 'HEAVY V-CANNON & ORBITING ASTEROID SHIELDS' },
  viper: { es: 'EMBESTIDAS EN ZIG-ZAG Y ABANICOS DE PUAS DE PLASMA', en: 'ZIG-ZAG RAM DASHES & PLASMA SPIKE FANS' },
  aegis: { es: 'ORBES GIRATORIOS BLOQUEAN TUS DISPAROS: ATACA POR LOS FLANCOS', en: 'ROTATING ORBS BLOCK SHOTS: ATTACK FROM FLANKS' },
  hydra: { es: 'DOS TORRETAS ALARES; SI PIERDE UNA DISPARA RAYOS CONCENTRADOS', en: 'TWIN WING TURRETS; DESTROYING ONE TRIGGERS BEAMS' },
  miner: { es: 'SIEMBRA MINAS QUE ESTALLAN EN ANILLOS', en: 'LAYS PROXIMITY MINES THAT BURST INTO BULLET RINGS' },
  phantom: { es: 'SE TELETRANSPORTA Y CREA SENUELOS CON DISPAROS FALSOS', en: 'TELEPORTS AND GENERATES HOLOGRAPHIC DECOYS' },
  carrier: { es: 'NAVE NODRIZA QUE DESPLIEGA ENJAMBRES KAMIKAZE', en: 'CARRIER DEPLOYING PERSISTENT KAMIKAZE SWARMS' },
  behemoth: { es: 'LASER DE BARRIDO ANUNCIADO CON UNA LINEA GUIA', en: 'SWEEPING MEGA-LASER WITH GUIDE TELEGRAPH LINE' },
  titan: { es: 'VORTICE GRAVITATORIO QUE TE ATRAE MIENTRAS DISPARA ESPIRALES', en: 'GRAVITATIONAL VORTEX PULLS PLAYER WHILE FIRING SPIRALS' },
  leviathan: { es: '3 FASES: FORTALEZA, ESPIRAL (50%) Y AUTODESTRUCCION (20%)', en: '3 PHASES: CITADEL, SPIRAL (50%) & SELF-DESTRUCT (20%)' },
};

function getBosses(isEn: boolean): Row[] {
  return LEVELS.map(l => ({
    texture: `boss_${l.id}`,
    title: `S${l.id} · ${l.bossName}`,
    color: 0xff6666,
    desc: `${l.name}: ${isEn ? BOSS_DESC[l.boss].en : BOSS_DESC[l.boss].es}`
  }));
}

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
    const isEn = getLanguage() === 'en';
    this.add.rectangle(0, 0, width, height, 0x050814, 1).setOrigin(0).setInteractive();
    const title = pixelTitle(this, t('guide'), '#9ff6ff', '#2f9fff', '#062a4a');
    sizeTitle(title, Math.min(32, width / 10));
    title.setPosition(width / 2, 24 + title.height / 2);

    const tabs: [Tab, string][] = [
      ['powers', t('tabPowers')],
      ['enemies', t('tabEnemies')],
      ['bosses', t('tabBosses')],
    ];
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

    new PixelButton(this, t('back'), () => this.close(), 0xffdd33).layout(Math.min(col, 260), 44, 12).setPosition(width / 2, height - 36);

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
    const isEn = getLanguage() === 'en';
    const rows = tab === 'powers' ? getPowers(isEn) : tab === 'enemies' ? getEnemies(isEn) : getBosses(isEn);
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
