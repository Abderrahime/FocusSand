export type Ambiance = 'none' | 'sun' | 'cloud' | 'rain' | 'snow' | 'night' | 'forest';

export type AmbientSound = 'none' | 'rain' | 'white' | 'pink' | 'brown' | 'wind';

export interface AmbianceDescriptor {
  id: Ambiance;
  label: string;
  emoji: string;
}

export interface AmbientSoundDescriptor {
  id: AmbientSound;
  label: string;
  emoji: string;
}

export const AMBIANCES: readonly AmbianceDescriptor[] = [
  { id: 'none',   label: 'Aucune',  emoji: '✨' },
  { id: 'sun',    label: 'Soleil',  emoji: '☀️' },
  { id: 'cloud',  label: 'Nuages',  emoji: '☁️' },
  { id: 'rain',   label: 'Pluie',   emoji: '🌧️' },
  { id: 'snow',   label: 'Neige',   emoji: '❄️' },
  { id: 'night',  label: 'Nuit',    emoji: '🌙' },
  { id: 'forest', label: 'Forêt',   emoji: '🌳' },
];

export const AMBIENT_SOUNDS: readonly AmbientSoundDescriptor[] = [
  { id: 'none',  label: 'Aucun',         emoji: '🔇' },
  { id: 'rain',  label: 'Pluie',         emoji: '🌧️' },
  { id: 'wind',  label: 'Vent',          emoji: '🍃' },
  { id: 'pink',  label: 'Bruit rose',    emoji: '🌸' },
  { id: 'white', label: 'Bruit blanc',   emoji: '⚪' },
  { id: 'brown', label: 'Bruit brun',    emoji: '🟤' },
];
