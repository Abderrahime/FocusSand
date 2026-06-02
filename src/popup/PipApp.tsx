import { useEffect, useMemo, useRef, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useActiveTimer } from '@/hooks/useActiveTimer';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { timerService } from '@/services/timer.service';
import { soundService } from '@/services/sound.service';
import { gardenService } from '@/services/garden.service';
import { STORAGE_KEYS } from '@/utils/constants';
import { totalEstimatedSeconds } from '@/models/task';
import { Hourglass } from './components/Hourglass';
import { CircularTimer } from './components/CircularTimer';
import { TimerEndDialog } from './components/TimerEndDialog';

/**
 * Slim, self-contained app rendered in two contexts:
 *  1. As the content of the compact "mini-window" (a regular Chrome popup
 *     window opened from the main popup). In this mode it shows a 📌
 *     button to upgrade itself to a true always-on-top PiP.
 *  2. Inside the Document PiP iframe. In this mode the 📌 button is
 *     hidden — we're already in PiP.
 *
 * Both paths only depend on chrome.storage.local, so they keep running
 * independently of the main popup.
 */
export function PipApp() {
  const { tasks } = useTasks();
  const { state: timer, elapsedSeconds } = useActiveTimer();
  const { settings } = useSettings();
  useTheme(settings.theme);
  const pip = usePictureInPicture();

  // Detect whether we're the top-level window (mini) or inside an iframe (PiP).
  const [isHost] = useState<boolean>(() => {
    try {
      return window === window.parent;
    } catch {
      return false;
    }
  });

  const [timeUpSoundPlayed, setTimeUpSoundPlayed] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);

  const activeTask = useMemo(
    () => (timer ? tasks.find((t) => t.id === timer.taskId) ?? null : null),
    [timer, tasks],
  );

  const timeUp = useMemo(() => {
    if (!timer || !activeTask) return false;
    return elapsedSeconds >= totalEstimatedSeconds(activeTask);
  }, [timer, activeTask, elapsedSeconds]);

  useEffect(() => {
    setTimeUpSoundPlayed(false);
  }, [timer?.taskId, activeTask?.extensions.length]);

  useEffect(() => {
    if (timeUp && !timeUpSoundPlayed && timer && !timer.timeUpAcknowledged) {
      void soundService.overrun();
      setTimeUpSoundPlayed(true);
      setShowTimeUp(true);
    }
  }, [timeUp, timeUpSoundPlayed, timer]);

  // When the popup hands off to this mini-window with the autoOpenPipOnMini
  // flag set, try to upgrade ourselves to a true always-on-top PiP. Best
  // effort — Chrome may refuse if it considers user activation expired,
  // in which case the user still has the manual 📌 button.
  useEffect(() => {
    if (!isHost) return;
    void (async () => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.autoOpenPipOnMini);
      const stamp = result[STORAGE_KEYS.autoOpenPipOnMini] as number | undefined;
      if (!stamp) return;
      // Only honor a recent request (5s window — matches Chrome's
      // transient user-activation budget).
      const isFresh = Date.now() - stamp < 5000;
      await chrome.storage.local.remove(STORAGE_KEYS.autoOpenPipOnMini);
      if (!isFresh) return;
      try {
        await pip.open();
      } catch {
        // Silent — manual 📌 button is the fallback.
      }
    })();
  }, [isHost, pip]);

  // Host-window lifecycle while the always-on-top PiP is up: tuck the host
  // away so only the floating PiP shows, and keep it tucked even if it grabs
  // focus again; once the PiP is dismissed, close the host (its job is done).
  const hadPipRef = useRef(false);
  useEffect(() => {
    if (!isHost) return;
    if (!pip.pipWindow && !hadPipRef.current) return; // idle, nothing to do
    let cancelled = false;

    const minimizeSelf = async () => {
      try {
        const self = await chrome.windows.getCurrent();
        if (!cancelled && self.id !== undefined) {
          await chrome.windows.update(self.id, { state: 'minimized' });
        }
      } catch {
        /* ignore */
      }
    };
    const closeSelf = async () => {
      try {
        const self = await chrome.windows.getCurrent();
        if (!cancelled && self.id !== undefined) await chrome.windows.remove(self.id);
      } catch {
        /* ignore */
      }
    };

    if (pip.pipWindow) {
      hadPipRef.current = true;
      const t = window.setTimeout(() => void minimizeSelf(), 200);
      // Re-tuck if the host steals focus back (e.g. user clicks the PiP).
      const onFocus = () => void minimizeSelf();
      window.addEventListener('focus', onFocus);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
        window.removeEventListener('focus', onFocus);
      };
    }

    void closeSelf();
    return () => {
      cancelled = true;
    };
  }, [isHost, pip.pipWindow]);

  const handlePause = async () => {
    void soundService.click();
    await timerService.pause();
  };
  const handleResume = async () => {
    void soundService.click();
    await timerService.resume();
  };
  const handleComplete = async () => {
    const completed = await timerService.complete();
    if (!completed) return;
    void soundService.cashRegister();
    if (
      completed.status === 'completed_early' ||
      completed.status === 'completed_ontime' ||
      completed.status === 'completed_late'
    ) {
      void gardenService.plant(completed);
    }
    setShowTimeUp(false);
  };
  const handleAbandon = async () => {
    void soundService.overrun();
    await timerService.abandon();
    setShowTimeUp(false);
  };

  const handleTogglePip = async () => {
    if (pip.pipWindow) {
      pip.close();
    } else {
      await pip.open();
    }
  };

  if (!timer || !activeTask) {
    return (
      <div className="pip-empty">
        <div className="pip-empty__icon" aria-hidden>⌛</div>
        <p>Aucune tâche en cours</p>
        <small>Démarrez-en une depuis la popup principale.</small>
        {isHost && pip.isSupported && (
          <button
            className={`btn btn--ghost btn--sm pip-empty__pin ${pip.pipWindow ? 'is-active' : ''}`}
            onClick={handleTogglePip}
          >
            📌 {pip.pipWindow ? 'Désépingler' : 'Toujours au-dessus'}
          </button>
        )}
      </div>
    );
  }

  const estimated = totalEstimatedSeconds(activeTask);

  return (
    <div className="pip-root">
      <div className="pip-header">
        <span className="pip-title" title={activeTask.title}>
          {activeTask.title}
        </span>
        {isHost && pip.isSupported && (
          <button
            className={`icon-btn icon-btn--sm ${pip.pipWindow ? 'is-active' : ''}`}
            onClick={handleTogglePip}
            aria-label={pip.pipWindow ? 'Désactiver toujours au-dessus' : 'Activer toujours au-dessus'}
            title={pip.pipWindow ? 'Désactiver toujours au-dessus' : 'Épingler au-dessus de toutes les apps (ouvre une fenêtre flottante dédiée)'}
          >📌</button>
        )}
      </div>

      <div className="pip-timer">
        {settings.timerStyle === 'hourglass' ? (
          <Hourglass
            elapsedSeconds={elapsedSeconds}
            estimatedSeconds={estimated}
            paused={timer.isPaused}
            sandPack={settings.sandPack}
          />
        ) : (
          <CircularTimer
            elapsedSeconds={elapsedSeconds}
            estimatedSeconds={estimated}
            paused={timer.isPaused}
          />
        )}
      </div>

      <div className="pip-actions">
        {timer.isPaused ? (
          <button className="btn btn--primary btn--sm" onClick={handleResume}>
            Reprendre
          </button>
        ) : (
          <button className="btn btn--secondary btn--sm" onClick={handlePause}>
            Pause
          </button>
        )}
        <button className="btn btn--success btn--sm" onClick={handleComplete}>
          Terminer
        </button>
      </div>

      {showTimeUp && timeUp && (
        <TimerEndDialog
          task={activeTask}
          elapsedSeconds={elapsedSeconds}
          onComplete={() => {
            void timerService.acknowledgeTimeUp();
            void handleComplete();
          }}
          onExtend={() => {
            void timerService.acknowledgeTimeUp();
            setShowTimeUp(false);
            chrome.action.openPopup?.().catch(() => {
              /* user gesture required */
            });
          }}
          onAbandon={() => {
            void timerService.acknowledgeTimeUp();
            void handleAbandon();
          }}
        />
      )}
    </div>
  );
}
