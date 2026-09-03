import { supabase } from './lib/supabase'
import { useState, useEffect, useCallback, useRef } from 'react'
import { questionBank, Question } from './data/questions'

// ── Change this password to secure your admin panel ──────────────────────────

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
            LET Reviewer · 2014–2017
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
  onSubmit: () => void | Promise<void>
}) {
  const questions = questionBank[progress.year] || []
  const q = questions[progress.currentQ]
  const [showConfirm, setShowConfirm] = useState(false)
  const answeredCount = Object.keys(progress.answers).length
  const unanswered = questions.length - answeredCount
  const questionNavRef = useRef<HTMLDivElement>(null)
  const currentQuestionButtonRef = useRef<HTMLButtonElement>(null)

  // Keep the current question visible in the vertical navigator.
  useEffect(() => {
    currentQuestionButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [progress.currentQ])

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

  // Find the next unanswered question, wrapping around if necessary.
  const findNextUnanswered = (fromIndex: number, answers = progress.answers) => {
    for (let offset = 1; offset <= questions.length; offset++) {
      const index = (fromIndex + offset) % questions.length
      if (!answers[index]) return index
    }
    return -1
  }

  // Selecting an answer immediately advances to the next unanswered question.
  const handleChoice = (key: (typeof choices)[number]) => {
    const updatedAnswers = { ...progress.answers, [progress.currentQ]: key }
    onAnswer(progress.currentQ, key)

    const nextUnanswered = findNextUnanswered(progress.currentQ, updatedAnswers)
    if (nextUnanswered !== -1) {
      onNavigate(nextUnanswered)
    }
  }

  // Normal Back moves to the previous question.
  const handleBack = () => {
    if (progress.currentQ > 0) {
      onNavigate(progress.currentQ - 1)
    }
  }

  // If Submit was opened with blanks, Go Back takes the user directly
  // to the first unanswered question.
  const handleGoBackFromSubmit = () => {
    setShowConfirm(false)
    const firstUnanswered = questions.findIndex((_, index) => !progress.answers[index])
    if (firstUnanswered !== -1) {
      onNavigate(firstUnanswered)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-safe-top pb-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3 pr-1">
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

      {/* Scrollable question-number navigator — fixed at the top-right */}
      <div
        ref={questionNavRef}
        className="fixed top-20 right-3 z-30 w-12 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="py-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100">
          Q
        </div>
        <div className="max-h-64 overflow-y-auto overscroll-contain p-1.5 space-y-1 scrollbar-hide">
          {questions.map((_, i) => {
            const isCurrent = i === progress.currentQ
            const isAnswered = !!progress.answers[i]

            return (
              <button
                key={i}
                ref={isCurrent ? currentQuestionButtonRef : undefined}
                onClick={() => onNavigate(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-9 h-9 flex-shrink-0 rounded-lg text-[11px] font-bold transition-all border ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : isAnswered
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-5 pr-20 sm:pr-24 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold flex-shrink-0">
              {progress.currentQ + 1}
            </span>
            <span className="text-xs text-slate-400 font-medium">of {questions.length}</span>
          </div>
          <p className="text-slate-800 text-base font-medium leading-relaxed">{q.q}</p>
        </div>

        {/* Choices — clicking one saves the answer and advances automatically */}
        <div className="space-y-3">
          {choices.map((key) => {
            const isSelected = selected === key
            return (
              <button
                key={key}
                onClick={() => handleChoice(key)}
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

      {/* Bottom navigation — Back only; Next is automatic after choosing an answer */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 pb-safe-bottom sticky bottom-0 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleBack}
            disabled={progress.currentQ === 0}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-3 bg-slate-100 disabled:opacity-30 text-slate-700 font-semibold text-sm rounded-xl active:opacity-70 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
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
                onClick={handleGoBackFromSubmit}
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
  const passed = pct >= 75

  // A new, random celebration is selected every time the result screen opens.
  const [animation, setAnimation] = useState(() => {
    const passAnimations = ['confetti', 'stars', 'burst'] as const
    const failAnimations = ['rain', 'shake', 'tumble'] as const
    const list = passed ? passAnimations : failAnimations
    return list[Math.floor(Math.random() * list.length)]
  })
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowAnimation(false), 2200)
    return () => window.clearTimeout(timer)
  }, [])

  const grade =
    pct >= 75 ? { label: 'PASSED', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400' }
    : pct >= 50 ? { label: 'ALMOST', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400' }
    : { label: 'KEEP STUDYING', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-400' }

  const passSymbols = ['✦', '★', '✧', '●', '◆', '✿', '＋', '✓']
  const failSymbols = ['•', '×', '−', '!', '○', '↘', '×', '…']

  return (
    <div className="min-h-screen bg-slate-50 pb-safe-bottom">
      {/* Original result animation — inspired by celebratory submission moments,
          but designed specifically for this quiz. */}
      {showAnimation && (
        <div
          className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${
            passed ? 'bg-emerald-950/10' : 'bg-red-950/10'
          }`}
          aria-hidden="true"
        >
          <style>{`
            @keyframes pslet-pop {
              0% { transform: translate(-50%, -50%) scale(.2) rotate(-12deg); opacity: 0; }
              45% { transform: translate(-50%, -50%) scale(1.18) rotate(4deg); opacity: 1; }
              75% { transform: translate(-50%, -50%) scale(.96) rotate(-2deg); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 0; }
            }
            @keyframes pslet-particle {
              0% { transform: translate(0, 0) scale(.2) rotate(0); opacity: 0; }
              15% { opacity: 1; }
              100% { transform: translate(var(--dx), var(--dy)) scale(1) rotate(var(--rot)); opacity: 0; }
            }
            @keyframes pslet-star {
              0% { transform: translate(-50%, -50%) scale(0) rotate(-45deg); opacity: 0; }
              25% { transform: translate(-50%, -50%) scale(1.25) rotate(10deg); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(.35) rotate(70deg); opacity: 0; }
            }
            @keyframes pslet-shake {
              0%, 100% { transform: translate(-50%, -50%) rotate(0); }
              15% { transform: translate(calc(-50% - 9px), -50%) rotate(-5deg); }
              30% { transform: translate(calc(-50% + 9px), -50%) rotate(5deg); }
              45% { transform: translate(calc(-50% - 6px), -50%) rotate(-3deg); }
              60% { transform: translate(calc(-50% + 6px), -50%) rotate(3deg); }
              75% { transform: translate(-50%, -50%) rotate(0); }
            }
            @keyframes pslet-tumble {
              0% { transform: translate(-50%, -50%) rotate(-30deg) scale(.5); opacity: 0; }
              30% { transform: translate(-50%, -50%) rotate(8deg) scale(1.1); opacity: 1; }
              100% { transform: translate(-50%, -50%) rotate(35deg) scale(.7); opacity: 0; }
            }
            @keyframes pslet-fall {
              0% { transform: translateY(-15vh) rotate(0); opacity: 0; }
              20% { opacity: 1; }
              100% { transform: translateY(115vh) rotate(220deg); opacity: 0; }
            }
            @keyframes pslet-ring {
              0% { transform: translate(-50%, -50%) scale(.2); opacity: .9; }
              100% { transform: translate(-50%, -50%) scale(2.7); opacity: 0; }
            }
            @keyframes pslet-glow {
              0%, 100% { transform: translate(-50%, -50%) scale(.9); opacity: .2; }
              50% { transform: translate(-50%, -50%) scale(1.12); opacity: .75; }
            }
          `}</style>

          {passed ? (
            <>
              <div className="absolute left-1/2 top-1/2 w-44 h-44 rounded-full bg-emerald-400/20 blur-2xl"
                style={{ animation: 'pslet-glow 1.3s ease-in-out 2' }} />
              <div className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border-4 border-emerald-400/60"
                style={{ animation: 'pslet-ring 1.1s ease-out .1s both' }} />
              <div
                className={`absolute left-1/2 top-1/2 w-32 h-32 rounded-[2rem] bg-white/95 shadow-2xl border-2 border-emerald-200 flex items-center justify-center ${
                  animation === 'burst' ? '' : ''
                }`}
                style={{
                  animation:
                    animation === 'burst'
                      ? 'pslet-pop 1.9s cubic-bezier(.2,.9,.25,1) both'
                      : 'pslet-pop 1.9s cubic-bezier(.2,.9,.25,1) both',
                }}
              >
                <div className="text-center">
                  <div className="text-5xl leading-none">✓</div>
                  <div className="mt-2 text-xs font-black tracking-[.18em] text-emerald-600">PASSED</div>
                </div>
              </div>

              {Array.from({ length: 24 }, (_, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 text-lg font-black text-emerald-500"
                  style={{
                    animation: `${animation === 'stars' ? 'pslet-star' : 'pslet-particle'} ${1.1 + (i % 5) * .12}s cubic-bezier(.2,.8,.2,1) ${i * .025}s both`,
                    '--dx': `${Math.cos((i / 24) * Math.PI * 2) * (110 + (i % 4) * 35)}px`,
                    '--dy': `${Math.sin((i / 24) * Math.PI * 2) * (120 + (i % 5) * 30)}px`,
                    '--rot': `${i % 2 ? 180 : -180}deg`,
                  } as React.CSSProperties}
                >
                  {passSymbols[i % passSymbols.length]}
                </span>
              ))}
            </>
          ) : (
            <>
              <div
                className="absolute left-1/2 top-1/2 w-36 h-36 rounded-full bg-red-400/15 blur-2xl"
                style={{ animation: 'pslet-glow 1.3s ease-in-out 2' }}
              />
              <div
                className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border-4 border-red-400/50"
                style={{ animation: 'pslet-ring 1.1s ease-out .1s both' }}
              />
              <div
                className="absolute left-1/2 top-1/2 w-32 h-32 rounded-[2rem] bg-white/95 shadow-2xl border-2 border-red-200 flex items-center justify-center"
                style={{
                  animation:
                    animation === 'shake'
                      ? 'pslet-shake 1.2s ease-in-out .15s both'
                      : animation === 'tumble'
                      ? 'pslet-tumble 1.9s ease-out both'
                      : 'pslet-pop 1.9s cubic-bezier(.2,.9,.25,1) both',
                }}
              >
                <div className="text-center">
                  <div className="text-5xl leading-none">✕</div>
                  <div className="mt-2 text-xs font-black tracking-[.15em] text-red-600">TRY AGAIN</div>
                </div>
              </div>

              {animation === 'rain' ? (
                Array.from({ length: 22 }, (_, i) => (
                  <span
                    key={i}
                    className="absolute top-0 text-lg font-black text-red-400"
                    style={{
                      left: `${(i * 37) % 100}%`,
                      animation: `pslet-fall ${1.1 + (i % 5) * .16}s ease-in ${i * .035}s both`,
                    }}
                  >
                    {failSymbols[i % failSymbols.length]}
                  </span>
                ))
              ) : (
                Array.from({ length: 18 }, (_, i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 text-lg font-black text-red-400"
                    style={{
                      animation: `pslet-particle ${1.1 + (i % 5) * .12}s cubic-bezier(.2,.8,.2,1) ${i * .03}s both`,
                      '--dx': `${Math.cos((i / 18) * Math.PI * 2) * (95 + (i % 4) * 30)}px`,
                      '--dy': `${Math.sin((i / 18) * Math.PI * 2) * (100 + (i % 5) * 28)}px`,
                      '--rot': `${i % 2 ? 160 : -160}deg`,
                    } as React.CSSProperties}
                  >
                    {failSymbols[i % failSymbols.length]}
                  </span>
                ))
              )}
            </>
          )}

          <div
            className={`absolute left-1/2 top-[calc(50%+115px)] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-lg ${
              passed ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
            style={{ animation: 'pslet-pop 1.9s ease-out both' }}
          >
            {passed ? '🎉 Great job!' : '💪 Keep practicing!'}
          </div>
        </div>
      )}

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
const [email, setEmail] = useState('')
const [pass, setPass] = useState('')
const [authed, setAuthed] = useState(false)
const [error, setError] = useState(false)
const [submissions, setSubmissions] = useState<Submission[]>([])
const [expanded, setExpanded] = useState<string | null>(null)

const loadSupabaseSubmissions = async () => {
  const { data, error } = await supabase
    .from('quiz_submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error loading submissions:', error)
    setError(true)
    return
  }

  const formatted: Submission[] = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    score: row.score,
    total: row.total,
    answers: row.answers,
    submittedAt: row.submitted_at,
  }))

  setSubmissions(formatted)
}

const tryLogin = async () => {
  setError(false)

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  })

  if (error) {
    console.error('Admin login error:', error)
    setError(true)
    setTimeout(() => setError(false), 2000)
    return
  }

  setAuthed(true)
  await loadSupabaseSubmissions()
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
            placeholder="Admin email"
            className="w-full bg-white/10 border-2 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3.5 text-base outline-none focus:border-indigo-500 mb-3 transition-colors"
            autoComplete="email"
            style={{ fontSize: '16px' }}
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
            placeholder="Password"
            className={`w-full bg-white/10 border-2 ${error ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/30 rounded-xl px-4 py-3.5 text-base outline-none focus:border-indigo-500 mb-3 transition-colors`}
            style={{ fontSize: '16px' }}
          />
          {error && (
            <p className="text-red-400 text-sm mb-3">
              Invalid email/password or you do not have admin access.
            </p>
          )}
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
          <button
              onClick={async () => {
                await supabase.auth.signOut()
                onBack()
              }}>
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

        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <p className="text-emerald-700 text-xs font-medium">
            ✓ Submissions are securely stored in Supabase.
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

const handleSubmit = useCallback(async () => {
  if (!progress) return

  const questions = questionBank[progress.year] || []
  const score = calcScore(questions, progress.answers)

  const { error } = await supabase
    .from('quiz_submissions')
    .insert({
      name: progress.name,
      year: progress.year,
      score,
      total: questions.length,
      answers: progress.answers,
    })

  if (error) {
    console.error('Supabase submission error:', error)
    alert('Your submission could not be saved. Please check your internet connection and try again.')
    return
  }

  const updated: Progress = {
    ...progress,
    submitted: true,
  }

  setProgress(updated)
  saveProgress(updated)
  setScreen('result')
}, [progress])

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
