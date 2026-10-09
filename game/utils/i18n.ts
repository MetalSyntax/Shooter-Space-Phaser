export type Lang = 'es' | 'en';

const KEY = 'ss_lang';

export function loadLang(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'en' || s === 'es') return s;
    const browser = navigator.language.slice(0, 2).toLowerCase();
    return browser === 'es' ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch { /* ignore */ }
}

export const DICT = {
  es: {
    // Menu
    play: '▶ JUGAR',
    continue: '▶ CONTINUAR',
    newGame: 'NUEVA PARTIDA',
    record: 'RECORD',
    difficulty: 'SELECCIONA DIFICULTAD',
    easy: 'FACIL',
    normal: 'NORMAL',
    hard: 'DIFICIL',
    easyDesc: 'PUNTOS x1 · RITMO TRANQUILO',
    normalDesc: 'PUNTOS x2 · RITMO RAPIDO',
    hardDesc: 'PUNTOS x3 · SOLO PARA ASES',
    hangar: 'HANGAR',
    shipPrefix: 'NAVE:',
    guide: 'GUIA',
    controlsPrefix: 'CONTROLES:',
    music: 'MUSICA',
    sfx: 'SFX',
    controlsHintDesktop: 'WASD MOVER · RATON APUNTAR · CLIC/ESPACIO DISPARAR · ESC PAUSA',
    
    // Pause
    pause: 'PAUSA',
    resume: '▶ REANUDAR',
    restart: 'REINICIAR',
    mainMenu: 'MENU PRINCIPAL',
    
    // Game Over & Victory
    gameOver: 'GAME OVER',
    victory: 'VICTORIA',
    score: 'PUNTOS',
    highScores: 'MEJORES PUNTUACIONES',
    newRecord: '¡NUEVO RECORD!',
    retrySector: 'REINTENTAR S',
    playAgain: 'JUGAR DE NUEVO',
    menu: 'MENU',
    
    // LevelClear
    sectorCleared: 'SECTOR SUPERADO',
    destroyed: 'DESTRUIDO',
    enemiesKilled: 'ENEMIGOS',
    accuracy: 'PRECISION',
    bonus: 'BONUS',
    pickPerk: 'ELIGE UNA MEJORA DE SECTOR',
    nextSector: 'SIGUIENTE: SECTOR',
    
    // Hangar
    speed: 'VELOCIDAD',
    fireRate: 'CADENCIA',
    lives: 'VIDAS',
    bombs: 'BOMBAS',
    ready: 'LISTO',
    hangarApplyNote: 'SE APLICA AL EMPEZAR UNA NUEVA PARTIDA',
    
    // Guide
    back: 'VOLVER',
    tabPowers: 'PODERES',
    tabEnemies: 'ENEMIGOS',
    tabBosses: 'JEFES',
    
    // In-game HUD & announcements
    wave: 'OLEADA',
    hyperBombText: 'HYPER BOMBA',
    bossAlarm: '¡ALARMA DE JEFE!',
    frenzyMode: '¡MODO FRENESI!',
    selfDestruct: '¡AUTODESTRUCCION!',
    
    // Touch controls
    schemeDrag: 'ARRASTRAR',
    schemeTwin: 'DOBLE STICK',
    schemeClassic: 'CLASICO',
    schemeDragHint: 'ARRASTRA PARA MOVER · DISPARO AUTOMATICO · DOBLE TOQUE = BOMBA',
    schemeTwinHint: 'IZQUIERDA: MOVER · DERECHA: APUNTAR Y DISPARAR',
    schemeClassicHint: 'JOYSTICK + BOTONES',
  },
  en: {
    // Menu
    play: '▶ PLAY',
    continue: '▶ CONTINUE',
    newGame: 'NEW GAME',
    record: 'HIGH SCORE',
    difficulty: 'SELECT DIFFICULTY',
    easy: 'EASY',
    normal: 'NORMAL',
    hard: 'HARD',
    easyDesc: 'SCORE x1 · RELAXED TEMPO',
    normalDesc: 'SCORE x2 · FAST TEMPO',
    hardDesc: 'SCORE x3 · FOR ACES ONLY',
    hangar: 'HANGAR',
    shipPrefix: 'SHIP:',
    guide: 'GUIDE',
    controlsPrefix: 'CONTROLS:',
    music: 'MUSIC',
    sfx: 'SFX',
    controlsHintDesktop: 'WASD MOVE · MOUSE AIM · CLICK/SPACE FIRE · ESC PAUSE',
    
    // Pause
    pause: 'PAUSE',
    resume: '▶ RESUME',
    restart: 'RESTART',
    mainMenu: 'MAIN MENU',
    
    // Game Over & Victory
    gameOver: 'GAME OVER',
    victory: 'VICTORY',
    score: 'SCORE',
    highScores: 'HIGH SCORES',
    newRecord: 'NEW HIGH SCORE!',
    retrySector: 'RETRY S',
    playAgain: 'PLAY AGAIN',
    menu: 'MENU',
    
    // LevelClear
    sectorCleared: 'SECTOR CLEARED',
    destroyed: 'DESTROYED',
    enemiesKilled: 'ENEMIES',
    accuracy: 'ACCURACY',
    bonus: 'BONUS',
    pickPerk: 'CHOOSE A SECTOR UPGRADE',
    nextSector: 'NEXT: SECTOR',
    
    // Hangar
    speed: 'SPEED',
    fireRate: 'FIRE RATE',
    lives: 'LIVES',
    bombs: 'BOMBS',
    ready: 'READY',
    hangarApplyNote: 'APPLIES WHEN STARTING A NEW GAME',
    
    // Guide
    back: 'BACK',
    tabPowers: 'POWERS',
    tabEnemies: 'ENEMIES',
    tabBosses: 'BOSSES',
    
    // In-game HUD & announcements
    wave: 'WAVE',
    hyperBombText: 'HYPER BOMB',
    bossAlarm: 'BOSS ALARM!',
    frenzyMode: 'FRENZY MODE!',
    selfDestruct: 'SELF-DESTRUCT!',
    
    // Touch controls
    schemeDrag: 'DRAG',
    schemeTwin: 'TWIN STICK',
    schemeClassic: 'CLASSIC',
    schemeDragHint: 'DRAG TO MOVE · AUTO-FIRE · DOUBLE TAP = BOMB',
    schemeTwinHint: 'LEFT: MOVE · RIGHT: AIM & FIRE',
    schemeClassicHint: 'JOYSTICK + BUTTONS',
  },
} as const;

export type TranslationKey = keyof typeof DICT['es'];

let currentLang: Lang = loadLang();

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  saveLang(lang);
}

export function getLanguage(): Lang {
  return currentLang;
}

export function t(key: TranslationKey): string {
  return DICT[currentLang][key] || DICT['es'][key] || key;
}
