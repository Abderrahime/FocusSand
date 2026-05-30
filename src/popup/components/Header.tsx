import type { Streak } from '@/models/streak';
import type { ViewMode } from '@/popup/view-mode';

type Tab = 'today' | 'stats' | 'garden';

interface Props {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
  streak: Streak;
  mode: ViewMode;
  pipActive: boolean;
  pipSupported: boolean;
  onOpenSettings: () => void;
  onOpenSidePanel: () => void;
  onTogglePip: () => void;
}

export function Header({
  activeTab,
  onChangeTab,
  streak,
  mode,
  pipActive,
  pipSupported,
  onOpenSettings,
  onOpenSidePanel,
  onTogglePip,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo" aria-hidden>
          <HourglassMark />
        </div>
        <div className="app-header__text">
          <h1 className="app-header__title">FocusSand</h1>
          <p className="app-header__tagline">Le temps que vous choisissez de donner.</p>
        </div>
        <div className="app-header__right">
          {streak.count > 0 && (
            <span
              className="streak-badge"
              title={`Série de ${streak.count} jour${streak.count > 1 ? 's' : ''} · record ${streak.best}`}
            >
              <span aria-hidden>🔥</span> {streak.count}
            </span>
          )}

          {pipSupported && (
            <button
              className={`icon-btn ${pipActive ? 'is-active' : ''}`}
              onClick={onTogglePip}
              aria-label={pipActive ? 'Fermer la mini-fenêtre' : 'Épingler en mini-fenêtre toujours au-dessus'}
              title={
                pipActive
                  ? 'Fermer la mini-fenêtre'
                  : mode === 'popup'
                    ? 'Ouvrir la mini-fenêtre flottante'
                    : 'Épingler en mini-fenêtre toujours au-dessus'
              }
            >
              <PinIcon />
            </button>
          )}

          {mode === 'popup' && (
            <button
              className="icon-btn"
              onClick={onOpenSidePanel}
              aria-label="Ouvrir dans le panneau latéral"
              title="Ouvrir dans le panneau latéral"
            >
              <PanelIcon />
            </button>
          )}

          <button
            className="icon-btn"
            onClick={onOpenSettings}
            aria-label="Réglages"
            title="Réglages"
          >
            <GearIcon />
          </button>
        </div>
      </div>
      <nav className="app-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'today'}
          className={`app-tabs__btn ${activeTab === 'today' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('today')}
        >
          Aujourd'hui
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={`app-tabs__btn ${activeTab === 'stats' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('stats')}
        >
          Stats
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'garden'}
          className={`app-tabs__btn ${activeTab === 'garden' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('garden')}
        >
          Jardin
        </button>
      </nav>
    </header>
  );
}

function HourglassMark() {
  return (
    <svg viewBox="0 0 44 44" role="img" aria-label="FocusSand">
      <rect width="44" height="44" rx="12" fill="url(#focusSandLogoGradient)" />
      <path
        d="M14 11h16M14 33h16M17 11l5 7 5-7M17 33l5-7 5 7"
        fill="none"
        stroke="rgba(255,255,255,.94)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M18.4 18.2h7.2L22 22l-3.6-3.8ZM18.4 25.8h7.2L22 22l-3.6 3.8Z"
        fill="rgba(252,211,77,.94)"
      />
      <circle cx="22" cy="22" r="1.45" fill="#fff7d6" />
      <defs>
        <linearGradient id="focusSandLogoGradient" x1="6" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-500)" />
          <stop offset="1" stopColor="var(--violet-500)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5M9 10.8V4h6v6.8l2 3.2H7l2-3.2Z" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.49.76.91 1.51.91H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z" />
    </svg>
  );
}
