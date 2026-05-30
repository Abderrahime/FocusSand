export type ReasonCategory = 'reasonable' | 'unreasonable';

export type ReasonType =
  // Raisonnables
  | 'complex_task'
  | 'technical_block'
  | 'external_interruption'
  | 'needs_research'
  | 'meeting_call'
  // Non raisonnables
  | 'social_media'
  | 'youtube_movie'
  | 'phone'
  | 'lack_of_focus'
  | 'bad_estimation';

export interface ReasonDescriptor {
  type: ReasonType;
  category: ReasonCategory;
  label: string;
  emoji: string;
}

export const REASONS: readonly ReasonDescriptor[] = [
  // Raisonnables
  { type: 'complex_task', category: 'reasonable', label: 'Tâche plus complexe que prévu', emoji: '🧩' },
  { type: 'technical_block', category: 'reasonable', label: 'Blocage technique', emoji: '🛠️' },
  { type: 'external_interruption', category: 'reasonable', label: 'Interruption externe', emoji: '📨' },
  { type: 'needs_research', category: 'reasonable', label: 'Besoin de recherche', emoji: '🔍' },
  { type: 'meeting_call', category: 'reasonable', label: 'Réunion ou appel', emoji: '📞' },
  // Non raisonnables
  { type: 'social_media', category: 'unreasonable', label: 'Réseaux sociaux', emoji: '📱' },
  { type: 'youtube_movie', category: 'unreasonable', label: 'YouTube / film', emoji: '🎬' },
  { type: 'phone', category: 'unreasonable', label: 'Téléphone', emoji: '☎️' },
  { type: 'lack_of_focus', category: 'unreasonable', label: 'Manque de concentration', emoji: '🌀' },
  { type: 'bad_estimation', category: 'unreasonable', label: 'Mauvaise estimation', emoji: '⏱️' },
];

export const REASONS_BY_TYPE: Record<ReasonType, ReasonDescriptor> = Object.fromEntries(
  REASONS.map((r) => [r.type, r]),
) as Record<ReasonType, ReasonDescriptor>;

export interface TimeExtension {
  id: string;
  addedMinutes: number;
  reason: ReasonType;
  reasonCategory: ReasonCategory;
  note?: string;
  timestamp: number;
}
