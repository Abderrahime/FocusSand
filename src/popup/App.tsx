import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useActiveTimer } from '@/hooks/useActiveTimer';
import { useTodayStats } from '@/hooks/useStats';
import { useSettings } from '@/hooks/useSettings';
import { useStreak } from '@/hooks/useStreak';
import { useGarden } from '@/hooks/useGarden';
import { useTheme } from '@/hooks/useTheme';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { timerService } from '@/services/timer.service';
import { soundService } from '@/services/sound.service';
import { gardenService } from '@/services/garden.service';
import { ambientSoundService } from '@/services/ambient-sound.service';
import { openSidePanel, openMiniWindow } from '@/services/windowing.service';
import { STORAGE_KEYS } from '@/utils/constants';
import { totalEstimatedSeconds, type Task } from '@/models/task';
import { Header } from './components/Header';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { ActiveTaskView } from './components/ActiveTaskView';
import { TimerEndDialog } from './components/TimerEndDialog';
import { ExtensionReasonDialog } from './components/ExtensionReasonDialog';
import { EditTaskDialog } from './components/EditTaskDialog';
import { Dashboard } from './components/Dashboard';
import { SettingsDialog } from './components/SettingsDialog';
import { Confetti } from './components/Confetti';
import { Garden } from './components/Garden';
import { AmbianceOverlay } from './components/AmbianceOverlay';
import type { ViewMode } from './view-mode';
import { REASONS_BY_TYPE, type ReasonType } from '@/models/reason';

type Tab = 'today' | 'stats' | 'garden';

interface AppProps {
  mode: ViewMode;
}

export default function App({ mode }: AppProps) {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const { state: timer, elapsedSeconds } = useActiveTimer();
  const { settings, save: saveSettings } = useSettings();
  const resolvedTheme = useTheme(settings.theme);
  const streak = useStreak();
  const plants = useGarden();
  const stats = useTodayStats(tasks);
  const pip = usePictureInPicture();

  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Task | null>(null);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [timeUpSoundPlayed, setTimeUpSoundPlayed] = useState(false);

  const activeTask = useMemo(
    () => (timer ? tasks.find((t) => t.id === timer.taskId) ?? null : null),
    [timer, tasks],
  );

  const timeUp = useMemo(() => {
    if (!timer || !activeTask) return false;
    return elapsedSeconds >= totalEstimatedSeconds(activeTask);
  }, [timer, activeTask, elapsedSeconds]);

  const showTimeUpDialog =
    timeUp && timer !== null && activeTask !== null && !timer.timeUpAcknowledged && !showExtensionDialog;

  useEffect(() => {
    setTimeUpSoundPlayed(false);
  }, [timer?.taskId, activeTask?.extensions.length]);

  useEffect(() => {
    if (timeUp && !timeUpSoundPlayed && timer && !timer.timeUpAcknowledged) {
      void soundService.overrun();
      setTimeUpSoundPlayed(true);
    }
  }, [timeUp, timeUpSoundPlayed, timer]);

  useEffect(() => {
    if (timer && !activeTask) {
      void timerService.clear();
    }
  }, [timer, activeTask]);

  // Manage the looping ambient sound: play while a task is actively running,
  // stop otherwise. Volume / kind changes hot-swap without restarting.
  useEffect(() => {
    const shouldPlay =
      timer !== null &&
      !timer.isPaused &&
      settings.ambientSound !== 'none';
    if (shouldPlay) {
      void ambientSoundService.play(settings.ambientSound, settings.ambientSoundVolume);
    } else {
      ambientSoundService.stop();
    }
    return () => ambientSoundService.stop();
  }, [timer, settings.ambientSound, settings.ambientSoundVolume]);

  const handleStart = async (task: Task) => {
    if (timer) return;
    void soundService.start();
    await timerService.start(task);
  };

  const handleStartBreak = async (long: boolean) => {
    if (timer) return;
    const minutes = long ? settings.longBreakMinutes : settings.shortBreakMinutes;
    const newBreak = await addTask({
      title: long ? '☕ Pause longue' : '🍵 Pause courte',
      estimatedMinutes: minutes,
      priority: 'low',
      category: 'other',
      isBreak: true,
    });
    void soundService.start();
    await timerService.start(newBreak);
  };

  const handlePause = () => {
    void soundService.click();
    return timerService.pause();
  };
  const handleResume = () => {
    void soundService.click();
    return timerService.resume();
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
    if (
      settings.confettiEnabled &&
      (completed.status === 'completed_early' || completed.status === 'completed_ontime')
    ) {
      setConfettiTrigger((n) => n + 1);
    }
  };

  const handleAbandon = async () => {
    if (!confirm('Abandonner cette tâche ?')) return;
    void soundService.overrun();
    await timerService.abandon();
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Supprimer « ${task.title} » ?`)) return;
    if (timer?.taskId === task.id) {
      await timerService.clear();
    }
    await deleteTask(task.id);
  };

  const handleExtend = async (payload: { minutes: number; reason: ReasonType; note?: string }) => {
    const descriptor = REASONS_BY_TYPE[payload.reason];
    await timerService.extend(payload.minutes, {
      reason: payload.reason,
      reasonCategory: descriptor.category,
      note: payload.note,
    });
    setShowExtensionDialog(false);
  };

  const handleAcknowledgeTimeUp = async () => {
    await timerService.acknowledgeTimeUp();
  };

  const handleOpenSidePanel = async () => {
    await openSidePanel();
    if (mode === 'popup') window.close();
  };

  const handleTogglePip = async () => {
    if (pip.pipWindow) {
      pip.close();
      return;
    }

    // Open the host window and flag it to immediately auto-pin: it upgrades
    // itself to the always-on-top floating window (the "3rd window") on load,
    // then minimizes itself so the user is left with just that floating
    // window. The host can only briefly flash (Chrome needs it visible to get
    // the user activation that Picture-in-Picture requires); after that it
    // tucks away on its own.
    if (mode === 'popup') {
      try {
        await chrome.storage.local.set({
          [STORAGE_KEYS.autoOpenPipOnMini]: Date.now(),
        });
        await openMiniWindow();
      } finally {
        setTimeout(() => window.close(), 80);
      }
      return;
    }

    await pip.open();
  };

  const isRunning = timer !== null && !timer.isPaused;

  return (
    <div className={`app app--${mode} app--ambiance-${settings.ambiance} ${isRunning ? 'is-running' : ''}`}>
      <AmbianceOverlay kind={settings.ambiance} />
      <Header
        activeTab={tab}
        onChangeTab={setTab}
        streak={streak}
        mode={mode}
        sandPack={settings.sandPack}
        isRunning={isRunning}
        pipActive={pip.pipWindow !== null}
        pipSupported={pip.isSupported}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSidePanel={handleOpenSidePanel}
        onTogglePip={handleTogglePip}
      />

      <main className="app-content">
        {loading ? (
          <div className="empty-state"><p>Chargement…</p></div>
        ) : tab === 'today' ? (
          <>
            {timer && activeTask ? (
              <ActiveTaskView
                task={activeTask}
                timer={timer}
                elapsedSeconds={elapsedSeconds}
                style={settings.timerStyle}
                sandPack={settings.sandPack}
                dark={resolvedTheme === 'dark'}
                onPause={handlePause}
                onResume={handleResume}
                onComplete={handleComplete}
                onAbandon={handleAbandon}
              />
            ) : (
              <>
                <TaskForm onSubmit={addTask} />
                {settings.pomodoroBreaks && (
                  <div className="pomodoro-bar">
                    <span className="pomodoro-bar__label">Pomodoro</span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleStartBreak(false)}
                    >
                      🍵 Pause {settings.shortBreakMinutes} min
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleStartBreak(true)}
                    >
                      ☕ Pause longue {settings.longBreakMinutes} min
                    </button>
                  </div>
                )}
              </>
            )}

            <TaskList
              tasks={tasks}
              hasActiveTimer={timer !== null}
              onStart={handleStart}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </>
        ) : tab === 'stats' ? (
          <Dashboard stats={stats} tasks={tasks} />
        ) : (
          <Garden plants={plants} />
        )}
      </main>

      {showTimeUpDialog && activeTask && (
        <TimerEndDialog
          task={activeTask}
          elapsedSeconds={elapsedSeconds}
          onComplete={() => {
            void handleAcknowledgeTimeUp();
            void handleComplete();
          }}
          onExtend={() => {
            void handleAcknowledgeTimeUp();
            setShowExtensionDialog(true);
          }}
          onAbandon={() => {
            void handleAcknowledgeTimeUp();
            void handleAbandon();
          }}
        />
      )}

      {showExtensionDialog && (
        <ExtensionReasonDialog
          onConfirm={handleExtend}
          onCancel={() => setShowExtensionDialog(false)}
        />
      )}

      {editing && (
        <EditTaskDialog
          task={editing}
          onSave={async (t) => {
            await updateTask(t);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          settings={settings}
          onSave={async (next) => {
            await saveSettings(next);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}

      <Confetti trigger={confettiTrigger} enabled={settings.confettiEnabled} />
    </div>
  );
}
