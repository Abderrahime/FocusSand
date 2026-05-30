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
        <div className="app-header__logo" aria-hidden>⌛</div>
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
            >📌</button>
          )}

          {mode === 'popup' && (
            <button
              className="icon-btn"
              onClick={onOpenSidePanel}
              aria-label="Ouvrir dans le panneau latéral"
              title="Ouvrir dans le panneau latéral"
            >▤</button>
          )}

          <button
            className="icon-btn"
            onClick={onOpenSettings}
            aria-label="Réglages"
            title="Réglages"
          >⚙</button>
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
