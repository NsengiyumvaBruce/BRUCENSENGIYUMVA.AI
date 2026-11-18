/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { TutorWorkspace } from './components/TutorWorkspace';
import { MathLabView } from './components/MathLabView';
import { ResearchEngineView } from './components/ResearchEngineView';
import { NotebookView } from './components/NotebookView';
import {
  calculateMasterySummary,
  createInitialSession,
  getDisciplineById,
} from './lib/pedagogy';
import type {
  DisciplineId,
  EducationalLevelId,
  LearnerStats,
  NotebookEntry,
  StudySession,
  WorkspaceTab,
} from './lib/pedagogy';

const STORAGE_KEYS = {
  sessions: 'bruce_ai_sessions_v1',
  activeSessionId: 'bruce_ai_active_session_v1',
  notebook: 'bruce_ai_notebook_v1',
  stats: 'bruce_ai_stats_v1',
  theme: 'bruce_ai_theme_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tutor');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = loadJson<'light' | 'dark'>(STORAGE_KEYS.theme, 'light');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = loadJson<StudySession[]>(STORAGE_KEYS.sessions, []);
    return Array.isArray(saved) && saved.length > 0
      ? saved
      : [createInitialSession('high_school', 'mathematics')];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = loadJson<string>(STORAGE_KEYS.activeSessionId, '');
    return savedId;
  });

  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>(() => {
    const saved = loadJson<NotebookEntry[]>(STORAGE_KEYS.notebook, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [stats, setStats] = useState<LearnerStats>(() =>
    loadJson<LearnerStats>(STORAGE_KEYS.stats, {
      completedPracticeCount: 0,
      scoreHistory: [],
      masteredTopics: [],
    })
  );

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  // Persist sessions, active id, notebook, and stats
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    } catch {
      try {
        const compact = sessions.map((s, sIdx) => ({
          ...s,
          messages: s.messages.map((m, mIdx) => {
            const isRecent = sIdx === 0 && mIdx >= s.messages.length - 4;
            return isRecent ? m : { ...m, attachments: undefined };
          }),
        }));
        localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(compact));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeSessionId, JSON.stringify(activeSessionId));
    } catch {
      // Ignore storage quota errors
    }
  }, [activeSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.notebook, JSON.stringify(notebookEntries));
    } catch {
      // Ignore storage quota errors
    }
  }, [notebookEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch {
      // Ignore storage quota errors
    }
  }, [stats]);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (activeSession && activeSession.id !== activeSessionId) {
      setActiveSessionId(activeSession.id);
    }
  }, [activeSession, activeSessionId]);

  const masterySummary = useMemo(
    () => calculateMasterySummary(sessions, notebookEntries, stats),
    [sessions, notebookEntries, stats]
  );

  const handleUpdateActiveSession = (updater: (prev: StudySession) => StudySession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updater(s) : s))
    );
  };

  const handleNewLesson = () => {
    const newSession = createInitialSession(
      activeSession.levelId,
      activeSession.disciplineId
    );
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveTab('tutor');
    setMobileSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      if (id === activeSession.id && next[0]) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
  };

  const handleChangeLevel = (levelId: EducationalLevelId) => {
    handleUpdateActiveSession((prev) => ({
      ...prev,
      levelId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleChangeDiscipline = (disciplineId: DisciplineId) => {
    const disc = getDisciplineById(disciplineId);
    handleUpdateActiveSession((prev) => ({
      ...prev,
      disciplineId,
      title: prev.messages.length === 0 ? `${disc.label} Studio` : prev.title,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSaveToNotebook = (params: {
    title: string;
    category: 'lesson' | 'math' | 'research';
    contentMarkdown: string;
  }) => {
    const newEntry: NotebookEntry = {
      id: `note-${Date.now()}`,
      title: params.title,
      category: params.category,
      disciplineId: activeSession.disciplineId,
      levelId: activeSession.levelId,
      contentMarkdown: params.contentMarkdown,
      createdAt: new Date().toISOString(),
    };
    setNotebookEntries((prev) => [newEntry, ...prev]);
  };

  const handleDeleteNotebookEntry = (id: string) => {
    setNotebookEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleRecordPracticeScore = (scorePercent: number, topic: string) => {
    setStats((prev) => ({
      completedPracticeCount: prev.completedPracticeCount + 1,
      scoreHistory: [...prev.scoreHistory, scorePercent],
      masteredTopics:
        scorePercent >= 85 && !prev.masteredTopics.includes(topic)
          ? [...prev.masteredTopics, topic]
          : prev.masteredTopics,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewLesson={handleNewLesson}
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSession.id}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            setActiveTab('tutor');
          }}
          onDeleteSession={handleDeleteSession}
          levelId={activeSession.levelId}
          onChangeLevel={handleChangeLevel}
          disciplineId={activeSession.disciplineId}
          onChangeDiscipline={handleChangeDiscipline}
          masteryIndex={masterySummary.masteryIndex}
          savedNotesCount={masterySummary.savedNotesCount}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />

        <main className="flex-1 min-w-0">
          {activeTab === 'tutor' && (
            <TutorWorkspace
              session={activeSession}
              onUpdateSession={handleUpdateActiveSession}
              onSelectLevel={handleChangeLevel}
              onSelectDiscipline={handleChangeDiscipline}
              onSaveToNotebook={handleSaveToNotebook}
              onOpenMathLab={() => setActiveTab('math_lab')}
            />
          )}

          {activeTab === 'math_lab' && (
            <MathLabView
              levelId={activeSession.levelId}
              onRecordPracticeScore={handleRecordPracticeScore}
              onSaveToNotebook={handleSaveToNotebook}
            />
          )}

          {activeTab === 'research' && (
            <ResearchEngineView
              levelId={activeSession.levelId}
              disciplineId={activeSession.disciplineId}
              onSaveToNotebook={handleSaveToNotebook}
            />
          )}

          {activeTab === 'notebook' && (
            <NotebookView
              entries={notebookEntries}
              masterySummary={masterySummary}
              onDeleteEntry={handleDeleteNotebookEntry}
              onStartLesson={() => setActiveTab('tutor')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
