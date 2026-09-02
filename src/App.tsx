import { useState, useEffect, useCallback } from 'react'
import { questionBank, Question } from './data/questions'

// ── Change this password to secure your admin panel ──────────────────────────
const ADMIN_PASSWORD = 'pslet2024admin'
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pslet_quiz_progress'
const SUBMISSIONS_KEY = 'pslet_submissions'

type Screen = 'start' | 'quiz' | 'result' | 'admin'

interface Progress {
  name: string
  year: string
  answers: Record<number, string>
  currentQ: number
  submitted: boolean
  startedAt: string
}

interface Submission {
  id: string
  name: string
  year: string
  score: number
  total: number
  answers: Record<number, string>
  submittedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY)
}

function loadSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSubmission(s: Submission) {
  const all = loadSubmissions()
  all.unshift(s)
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(all))
}

function calcScore(questions: Question[], answers: Record<number, string>): number {
  return questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)
}

// ─── Components ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  const answered = current
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5 px-1">
        <span className="text-xs font-medium text-slate-500">{answered} of {total} answered</span>
        <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

function StartScreen({
  onStart,
  savedProgress,
}: {
  onStart: (name: string, year: string, resume: boolean) => void
  savedProgress: Progress | null
}) {
  const [name, setName] = useState('')
  const [year, setYear] = useState('2014')
  const [showResume, setShowResume] = useState(!!savedProgress)

  const handleNew = () => {
    if (!name.trim()) return
    onStart(name.trim(), year, false)
  }

  const handleResume = () => {
    if (savedProgress) onStart(savedProgress.name, savedProgress.year, true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex flex-col items-center justify-center px-5 py-safe">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl mb-5">
            <span className="text-3xl">🔬</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            Physical Science
          </h1>
          <p className="text-indigo-300 mt-1.5 text-base font-medium">
            LET Reviewer · 2014–2016
          </p>
        </div>

        {/* Resume banner */}
        {showResume && savedProgress && !savedProgress.submitted && (
          <div className="bg-amber-500/15 border border-amber-400/30 rounded-2xl p-4 mb-5">
            <p className="text-amber-300 text-sm font-medium mb-1">
              Continue where you left off?
            </p>
            <p className="text-amber-200/70 text-xs mb-3">
              <strong>{savedProgress.name}</strong> · LET {savedProgress.year} ·{' '}
              {Object.keys(savedProgress.answers).length} of{' '}
              {questionBank[savedProgress.year]?.length} answered
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl active:opacity-80 transition-opacity"
              >
                Resume
              </button>
              <button
                onClick={() => setShowResume(false)}
                className="flex-1 py-2.5 bg-white/10 text-white/70 text-sm font-medium rounded-xl active:opacity-80 transition-opacity"
              >
                Start New
              </button>
            </div>
          </div>
        )}

        {/* New quiz form */}
        {(!showResume || savedProgress?.submitted) && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNew()}
                placeholder="e.g. Maria Santos"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3.5 text-base outline-none focus:border-indigo-400 focus:bg-white/15 transition-all"
                autoComplete="name"
                style={{ fontSize: '16px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                Select Year
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(questionBank).map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      year === y
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white/10 text-white/60 border border-white/10'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <p className="text-indigo-300/60 text-xs mt-2 text-center">
                {questionBank[year]?.length} questions · 1 point each
              </p>
            </div>

            <button
              onClick={handleNew}
              disabled={!name.trim()}
              className="w-full py-4 bg-indigo-500 disabled:bg-indigo-500/40 disabled:text-white/40 text-white font-bold text-base rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              Start Exam
            </button>
          </div>
        )}

        <p className="text-center text-white/20 text-xs mt-6">
          Tap Admin in the corner to access results
        </p>
      </div>

      {/* Admin button */}
      <button
        onClick={() => onStart('', '', false)}
        className="fixed top-4 right-4 w-8 h-8 flex items-center justify-center opacity-20 active:opacity-60 transition-opacity"
        aria-label="Admin"
        data-admin="true"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}

// ─── Quiz Screen ──────────────────────────────────────────────────────────────

function QuizScreen({
  progress,
  onAnswer,
  onNavigate,
  onSubmit,
}: {
  progress: Progress
  onAnswer: (qIndex: number, choice: string) => void
  onNavigate: (qIndex: number) => void
  onSubmit: () => void
}) {
  const questions = questionBank[progress.year] || []
  const q = questions[progress.currentQ]
  const [showConfirm, setShowConfirm] = useState(false)
  const answeredCount = Object.keys(progress.answers).length
  const unanswered = questions.length - answeredCount

  if (!q) return null

  const choices = ['a', 'b', 'c', 'd'] as const
  const choiceLabels = { a: 'A', b: 'B', c: 'C', d: 'D' }
  const selected = progress.answers[progress.currentQ]

  const handleSubmit = () => {
    if (unanswered > 0) {
      setShowConfirm(true)
    } else {
      onSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-safe-top pb-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Physical Science LET {progress.year}
              </span>
              <p className="text-slate-400 text-xs mt-0.5">{progress.name}</p>
            </div>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg active:opacity-80 transition-opacity"
            >
              Submit
            </button>
          </div>
          <ProgressBar current={answeredCount} total={questions.length} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold flex-shrink-0">
              {progress.currentQ + 1}
            </span>
            <span className="text-xs text-slate-400 font-medium">of {questions.length}</span>
          </div>
          <p className="text-slate-800 text-base font-medium leading-relaxed">{q.q}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          {choices.map((key) => {
            const isSelected = selected === key
            return (
              <button
                key={key}
                onClick={() => onAnswer(progress.currentQ, key)}
                className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                    : 'bg-white border-slate-200 active:border-indigo-300'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {choiceLabels[key]}
                </span>
                <span
                  className={`text-sm font-medium leading-snug pt-0.5 ${
                    isSelected ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {q[key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 pb-safe-bottom sticky bottom-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => onNavigate(progress.currentQ - 1)}
            disabled={progress.currentQ === 0}
            className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 disabled:opacity-30 text-slate-700 font-semibold text-sm rounded-xl active:opacity-70 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>

          {/* Question dots - scrollable mini map */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 justify-center flex-wrap max-h-10 overflow-hidden">
              {questions.slice(0, 30).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(i)}
                  className={`flex-shrink-0 w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                    i === progress.currentQ
                      ? 'bg-indigo-600 text-white'
                      : progress.answers[i]
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate(progress.currentQ + 1)}
            disabled={progress.currentQ === questions.length - 1}
            className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 disabled:opacity-30 text-slate-700 font-semibold text-sm rounded-xl active:opacity-70 transition-opacity"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center px-4 pb-safe-bottom">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mb-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Submit anyway?</h3>
            <p className="text-slate-500 text-sm mb-5">
              You have <strong className="text-red-500">{unanswered} unanswered</strong> question{unanswered !== 1 ? 's' : ''}. Blank answers will be marked incorrect.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowConfirm(false); onSubmit() }}
                className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  progress,
  onRetake,
  onNewExam,
}: {
  progress: Progress
  onRetake: () => void
  onNewExam: () => void
}) {
  const questions = questionBank[progress.year] || []
  const score = calcScore(questions, progress.answers)
  const total = questions.length
  const pct = Math.round((score / total) * 100)

  const grade =
    pct >= 75 ? { label: 'PASSED', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400' }
    : pct >= 50 ? { label: 'ALMOST', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400' }
    : { label: 'KEEP STUDYING', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-400' }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe-bottom">
      {/* Score card */}
      <div className={`${grade.bg} border-b ${grade.border} px-5 pt-safe-top pb-6`}>
        <div className="max-w-lg mx-auto">
          <p className="text-sm font-semibold text-slate-500 mt-4 mb-3">
            {progress.name} · LET {progress.year}
          </p>
          <div className="flex items-center gap-5">
            <div className={`w-24 h-24 rounded-full border-4 ${grade.ring} ring-4 ring-offset-2 flex flex-col items-center justify-center flex-shrink-0 bg-white shadow-lg`}>
              <span className={`text-3xl font-black ${grade.color}`}>{score}</span>
              <span className="text-xs text-slate-400 font-medium">/{total}</span>
            </div>
            <div>
              <p className={`text-2xl font-black ${grade.color}`}>{pct}%</p>
              <p className={`text-sm font-bold ${grade.color} mb-1`}>{grade.label}</p>
              <p className="text-slate-500 text-xs leading-snug">
                {score} correct · {total - score} wrong · passing is 75%
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={onRetake}
              className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm active:opacity-70"
            >
              Retake
            </button>
            <button
              onClick={onNewExam}
              className="flex-1 py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm active:opacity-70"
            >
              New Exam
            </button>
          </div>
        </div>
      </div>

      {/* Answer review */}
      <div className="px-4 py-5 max-w-lg mx-auto">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Answer Review
        </h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAns = progress.answers[i]
            const correct = q.answer
            const isCorrect = userAns === correct
            const isBlank = !userAns

            return (
              <div
                key={i}
                className={`bg-white rounded-2xl border-2 p-4 ${
                  isCorrect
                    ? 'border-emerald-200'
                    : isBlank
                    ? 'border-slate-200'
                    : 'border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : isBlank
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {isCorrect ? '✓' : isBlank ? '—' : '✗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm font-medium leading-snug mb-2">
                      <span className="text-slate-400 mr-1.5">#{i + 1}</span>
                      {q.q}
                    </p>
                    {!isCorrect && !isBlank && (
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">Your</span>
                        <span className="text-red-600 text-xs">{q[userAns as 'a'|'b'|'c'|'d']}</span>
                      </div>
                    )}
                    {isBlank && (
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Blank</span>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Correct</span>
                      <span className="text-emerald-700 text-xs font-medium">{q[correct]}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Admin Screen ─────────────────────────────────────────────────────────────

function AdminScreen({ onBack }: { onBack: () => void }) {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const tryLogin = () => {
    if (pass === ADMIN_PASSWORD) {
      setAuthed(true)
      setSubmissions(loadSubmissions())
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="text-slate-500 text-sm mb-8 flex items-center gap-1 active:opacity-60">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h2 className="text-white text-2xl font-bold mb-1">Admin Panel</h2>
          <p className="text-slate-500 text-sm mb-7">Enter your admin password</p>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
            placeholder="Password"
            className={`w-full bg-white/10 border-2 ${error ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/30 rounded-xl px-4 py-3.5 text-base outline-none focus:border-indigo-500 mb-3 transition-colors`}
            style={{ fontSize: '16px' }}
          />
          {error && <p className="text-red-400 text-sm mb-3">Incorrect password</p>}
          <button
            onClick={tryLogin}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl active:opacity-80"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-safe-bottom">
      <div className="bg-slate-900 px-4 pt-safe-top pb-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between mt-3">
          <div>
            <h2 className="text-white text-xl font-bold">Admin Panel</h2>
            <p className="text-slate-400 text-xs mt-0.5">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onBack} className="text-slate-400 text-sm py-2 px-4 bg-white/10 rounded-xl active:opacity-60">
            Exit
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-500 font-medium">No submissions yet</p>
            <p className="text-slate-400 text-sm mt-1">Results will appear here after students submit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => {
              const pct = Math.round((s.score / s.total) * 100)
              const passed = pct >= 75
              const isOpen = expanded === s.id
              const questions = questionBank[s.year] || []

              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-4 p-4 text-left active:bg-slate-50"
                  >
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${passed ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      <span className={`text-lg font-black ${passed ? 'text-emerald-700' : 'text-red-600'}`}>{s.score}</span>
                      <span className={`text-[9px] font-bold ${passed ? 'text-emerald-500' : 'text-red-400'}`}>/{s.total}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                      <p className="text-slate-400 text-xs">LET {s.year} · {pct}% · {passed ? '✅ Passed' : '❌ Failed'}</p>
                      <p className="text-slate-300 text-xs">{new Date(s.submittedAt).toLocaleString()}</p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {questions.map((q, i) => {
                          const userAns = s.answers[i]
                          const isCorrect = userAns === q.answer
                          return (
                            <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              <span className={`font-bold flex-shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                                {i + 1}. {isCorrect ? '✓' : '✗'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-slate-600 leading-tight truncate">{q.q.slice(0, 60)}…</p>
                                {!isCorrect && (
                                  <p className="text-red-500 mt-0.5">
                                    Answered: <strong>{userAns?.toUpperCase() || '—'}</strong> · Correct: <strong>{q.answer.toUpperCase()}</strong>
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-amber-700 text-xs font-medium">
            ⚠️ Data stored locally on this device. Connect Supabase to access submissions from anywhere.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [progress, setProgress] = useState<Progress | null>(null)
  const savedProgress = loadProgress()

  // Restore submitted result on open
  useEffect(() => {
    const saved = loadProgress()
    if (saved?.submitted) {
      setProgress(saved)
      setScreen('result')
    }
  }, [])

  const handleStart = useCallback((name: string, year: string, resume: boolean) => {
    // Open admin
    if (!name && !year) {
      setScreen('admin')
      return
    }

    if (resume && savedProgress) {
      setProgress(savedProgress)
      setScreen('quiz')
      return
    }

    const newProgress: Progress = {
      name,
      year,
      answers: {},
      currentQ: 0,
      submitted: false,
      startedAt: new Date().toISOString(),
    }
    setProgress(newProgress)
    saveProgress(newProgress)
    setScreen('quiz')
  }, [savedProgress])

  const handleAnswer = useCallback((qIndex: number, choice: string) => {
    setProgress((prev) => {
      if (!prev) return prev
      const updated: Progress = {
        ...prev,
        answers: { ...prev.answers, [qIndex]: choice },
      }
      saveProgress(updated)
      return updated
    })
  }, [])

  const handleNavigate = useCallback((qIndex: number) => {
    setProgress((prev) => {
      if (!prev) return prev
      const questions = questionBank[prev.year] || []
      const clamped = Math.max(0, Math.min(questions.length - 1, qIndex))
      const updated = { ...prev, currentQ: clamped }
      saveProgress(updated)
      return updated
    })
  }, [])

  const handleSubmit = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev
      const questions = questionBank[prev.year] || []
      const score = calcScore(questions, prev.answers)
      const submission: Submission = {
        id: crypto.randomUUID(),
        name: prev.name,
        year: prev.year,
        score,
        total: questions.length,
        answers: prev.answers,
        submittedAt: new Date().toISOString(),
      }
      saveSubmission(submission)
      const updated: Progress = { ...prev, submitted: true }
      saveProgress(updated)
      return updated
    })
    setScreen('result')
  }, [])

  const handleRetake = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev
      const fresh: Progress = {
        name: prev.name,
        year: prev.year,
        answers: {},
        currentQ: 0,
        submitted: false,
        startedAt: new Date().toISOString(),
      }
      saveProgress(fresh)
      return fresh
    })
    setScreen('quiz')
  }, [])

  const handleNewExam = useCallback(() => {
    clearProgress()
    setProgress(null)
    setScreen('start')
  }, [])

  if (screen === 'start') {
    return (
      <StartScreen
        savedProgress={savedProgress?.submitted ? null : savedProgress}
        onStart={handleStart}
      />
    )
  }

  if (screen === 'admin') {
    return <AdminScreen onBack={() => setScreen('start')} />
  }

  if (screen === 'quiz' && progress) {
    return (
      <QuizScreen
        progress={progress}
        onAnswer={handleAnswer}
        onNavigate={handleNavigate}
        onSubmit={handleSubmit}
      />
    )
  }

  if (screen === 'result' && progress) {
    return (
      <ResultScreen
        progress={progress}
        onRetake={handleRetake}
        onNewExam={handleNewExam}
      />
    )
  }

  return null
}
