'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lib/curriculum'

// FLOW: intro → teach → practice → teach → practice → ... → summary

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [screen, setScreen] = useState('intro')
  const [currentEx, setCurrentEx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [fillValue, setFillValue] = useState('')
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [hearts, setHearts] = useState(5)
  const [xpGained, setXpGained] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [animState, setAnimState] = useState('')
  const [showCody, setShowCody] = useState(false)
  const [codyInput, setCodyInput] = useState('')
  const [codyLoading, setCodyLoading] = useState(false)
  const [codyHistory, setCodyHistory] = useState([])
  const [conceptIndex, setConceptIndex] = useState(0)
  const [runOutput, setRunOutput] = useState(null)
  const [teachTab, setTeachTab] = useState('explain')
  const [typedCode, setTypedCode] = useState('')
  const [confetti, setConfetti] = useState([])
  const inputRef = useRef(null)
  const codyEndRef = useRef(null)

  useEffect(() => {
    // Load lesson — no redirects to avoid loops
    const lessonData = getLessonById(params.id)
    if (lessonData) {
      setLesson(lessonData)
    } else {
      console.error('Lesson not found for id:', params.id)
    }

    // Auth check — failure just means progress won't save
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    }).catch(() => {
      console.warn('Auth check failed, continuing without user')
    })
  }, [params.id])

  useEffect(() => {
    if (screen === 'practice' && inputRef.current) inputRef.current.focus()
    setRunOutput(null)
    setTeachTab('explain')
    setTypedCode('')
  }, [screen, currentEx])

  useEffect(() => {
    if (codyEndRef.current) codyEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [codyHistory, codyLoading])

  const exercise = lesson?.exercises[currentEx]
  const totalEx = lesson?.exercises.length || 0
  const progressPct = screen === 'summary' ? 100 : screen === 'intro' ? 0 : ((currentEx + (answered ? 1 : 0.4)) / totalEx) * 100

  function triggerConfetti() {
    const pieces = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#7c6fff', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#f472b6'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 6,
    }))
    setConfetti(pieces)
    setTimeout(() => setConfetti([]), 2200)
  }

  function checkAnswer() {
    if (answered) return
    let isCorrect = false
    if (exercise.type === 'fill_blank') {
      isCorrect = fillValue.trim().toLowerCase() === exercise.correct.toLowerCase()
    } else {
      isCorrect = selected === exercise.correct
    }
    setAnswered(true)
    setCorrect(isCorrect)
    if (isCorrect) {
      setAnimState('correct')
      const gained = Math.floor(lesson.xpReward / totalEx)
      setXpGained(prev => prev + gained)
      setCorrectCount(prev => prev + 1)
      triggerConfetti()
      setTimeout(() => setAnimState(''), 800)
    } else {
      setAnimState('wrong')
      setHearts(prev => Math.max(0, prev - 1))
      setTimeout(() => setAnimState(''), 600)
    }
  }

  function nextExercise() {
    if (currentEx + 1 >= totalEx) {
      saveProgress()
      setScreen('summary')
    } else {
      setCurrentEx(prev => prev + 1)
      setSelected(null)
      setFillValue('')
      setAnswered(false)
      setCorrect(false)
      setAnimState('')
      setConceptIndex(0)
      setCodyHistory([])
      setShowCody(false)
      setScreen('teach')
    }
  }

  function saveProgress() {
    if (!user) return
    const key = `codero_progress_${user.id}`
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    const today = new Date().toDateString()
    const lastDay = saved.lastDay
    const streak = lastDay === today
      ? (saved.streak || 1)
      : lastDay === new Date(Date.now() - 86400000).toDateString()
        ? (saved.streak || 0) + 1
        : 1
    localStorage.setItem(key, JSON.stringify({
      ...saved,
      progress: { ...(saved.progress || {}), [lesson.id]: { completed: true, xp: xpGained } },
      xp: (saved.xp || 0) + xpGained,
      streak,
      lastDay: today,
    }))
  }

  async function askCody(message) {
    if (!message.trim()) return
    setCodyLoading(true)
    setCodyHistory(prev => [...prev, { role: 'user', text: message }])
    setCodyInput('')
    try {
      const res = await fetch('/api/pypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: `Lesson: ${lesson?.title}. Exercise: ${exercise?.question}` }),
      })
      const data = await res.json()
      setCodyHistory(prev => [...prev, { role: 'cody', text: data.reply }])
    } catch {
      setCodyHistory(prev => [...prev, { role: 'cody', text: "Oops! Something went wrong. Try again!" }])
    }
    setCodyLoading(false)
  }

  function getHint() {
    setShowCody(true)
    askCody(`Give me a helpful hint (no spoilers!) for this question: "${exercise?.question}"`)
  }

  if (!lesson) return <LoadingSpinner />

  // ─── INTRO SCREEN ────────────────────────────────────────────────────────
  if (screen === 'intro') {
    const concept = lesson.intro.concepts[conceptIndex]
    return (
      <ScreenWrapper>
        <Confetti pieces={confetti} />
        <TopBar router={router} progress={0} hearts={hearts} color={lesson.unitColor} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 0 24px', animation: 'slideUp 0.45s ease' }}>

          {/* Unit badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${lesson.unitColor}18`, border: `1px solid ${lesson.unitColor}35`, borderRadius: 100, padding: '5px 14px', marginBottom: 20, width: 'fit-content' }}>
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 12, color: lesson.unitColor, fontWeight: 600 }}>{lesson.unitTitle}</span>
          </div>

          {/* Cody bubble */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 28 }}>
            <CodyAvatar color={lesson.unitColor} bounce />
            <div style={{ background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', fontSize: 15, lineHeight: 1.65, color: '#c0c0d0', flex: 1, animation: 'fadeIn 0.5s ease 0.2s both' }}>
              Hey! 👋 Ready to learn <strong style={{ color: lesson.unitColor }}>{lesson.title}</strong>?
              I'll walk you through the concept first, then we'll practice together. You've got this! 🚀
            </div>
          </div>

          {/* Lesson title block */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, lineHeight: 1.25 }}>{lesson.intro.title}</h1>
            <p style={{ color: '#9090a8', fontSize: 15, lineHeight: 1.7 }}>{lesson.intro.summary}</p>
          </div>

          {/* Interactive concept explorer */}
          <div style={{ background: '#16161d', border: '1px solid #2a2a38', borderRadius: 18, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #2a2a38' }}>
              <div style={{ fontSize: 11, color: '#5a5a72', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>💡 Try these examples</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {lesson.intro.concepts.map((c, i) => (
                  <button key={i} onClick={() => setConceptIndex(i)}
                    style={{ background: conceptIndex === i ? lesson.unitColor : '#0f0f13', border: `1.5px solid ${conceptIndex === i ? lesson.unitColor : '#2a2a38'}`, borderRadius: 100, padding: '6px 14px', fontSize: 12, color: conceptIndex === i ? 'white' : '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s', transform: conceptIndex === i ? 'scale(1.04)' : 'scale(1)' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <CodeBlock code={concept.code} output={concept.output} />
          </div>

          {/* Tip banner */}
          <div style={{ background: 'rgba(124,111,255,0.07)', border: '1px solid rgba(124,111,255,0.22)', borderRadius: 14, padding: '13px 17px', fontSize: 14, color: '#c8c8e0', lineHeight: 1.65, marginBottom: 24 }}>
            {lesson.intro.tip}
          </div>

          {/* What you'll learn */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: '#5a5a72', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>In this lesson</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lesson.exercises.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#16161d', border: '1px solid #2a2a38', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${lesson.unitColor}22`, border: `1.5px solid ${lesson.unitColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: lesson.unitColor, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: '#a0a0b8', flex: 1 }}>{ex.teach?.title || `Exercise ${i + 1}`}</span>
                  <span style={{ fontSize: 13 }}>{{ multiple_choice: '🎯', fill_blank: '✏️', true_false: '⚡', spot_bug: '🐛', output_prediction: '🔮' }[ex.type]}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { setScreen('teach'); setCurrentEx(0) }}
            style={{ width: '100%', background: lesson.unitColor, border: 'none', borderRadius: 16, padding: '17px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 800, letterSpacing: '0.02em', boxShadow: `0 4px 20px ${lesson.unitColor}40` }}>
            Start Lesson →
          </button>
        </div>
        <style>{KEYFRAMES}</style>
      </ScreenWrapper>
    )
  }

  // ─── TEACH SCREEN ────────────────────────────────────────────────────────
  if (screen === 'teach') {
    const teach = exercise?.teach
    return (
      <ScreenWrapper>
        <TopBar router={router} progress={progressPct} hearts={hearts} color={lesson.unitColor} label={`${currentEx + 1}/${totalEx}`} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 0 24px', animation: 'slideUp 0.35s ease' }}>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {lesson.exercises.map((_, i) => (
                <div key={i} style={{ height: 4, width: i === currentEx ? 22 : 8, background: i <= currentEx ? lesson.unitColor : '#2a2a38', borderRadius: 100, transition: 'all 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#5a5a72', fontWeight: 600 }}>Concept {currentEx + 1} of {totalEx}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#16161d', border: '1px solid #2a2a38', borderRadius: 14, overflow: 'hidden', marginBottom: 22 }}>
            {[['explain', '📖 Explanation'], ['try', '▶ Try It Live']].map(([tab, label]) => (
              <button key={tab} onClick={() => setTeachTab(tab)}
                style={{ flex: 1, padding: '12px', background: teachTab === tab ? lesson.unitColor : 'transparent', border: 'none', color: teachTab === tab ? 'white' : '#9090a8', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          {teachTab === 'explain' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${lesson.unitColor}20`, border: `1.5px solid ${lesson.unitColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📖</div>
                <div>
                  <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 7, lineHeight: 1.2 }}>{teach?.title}</h2>
                  <p style={{ color: '#9090a8', fontSize: 14, lineHeight: 1.72 }}>{teach?.explanation}</p>
                </div>
              </div>

              <CodeBlock code={teach?.example?.code} output={teach?.example?.output} />

              <div style={{ background: `${lesson.unitColor}0d`, border: `1.5px solid ${lesson.unitColor}30`, borderRadius: 13, padding: '12px 16px', fontSize: 14, color: '#d0d0e0', lineHeight: 1.65, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
                <span>{teach?.highlight}</span>
              </div>
            </div>
          )}

          {teachTab === 'try' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <p style={{ fontSize: 14, color: '#9090a8', marginBottom: 14, lineHeight: 1.6 }}>
                Edit the code below and press <strong style={{ color: '#34d399' }}>Run</strong> to see what happens! Experiment freely 😄
              </p>
              <div style={{ background: '#0a0a10', border: '1px solid #2a2a38', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderBottom: '1px solid #1e1e28' }}>
                  {['#f87171', '#fbbf24', '#34d399'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                  <span style={{ fontSize: 11, color: '#5a5a72', marginLeft: 4, fontFamily: 'Fira Code, monospace' }}>python (sandbox)</span>
                </div>
                <textarea
                  value={typedCode !== '' ? typedCode : (teach?.example?.code || '')}
                  onChange={e => setTypedCode(e.target.value)}
                  style={{ width: '100%', minHeight: 110, background: 'transparent', border: 'none', padding: '14px 18px', fontFamily: 'Fira Code, monospace', fontSize: 13, color: '#c0c0d0', lineHeight: 1.85, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => {
                  const code = typedCode !== '' ? typedCode : (teach?.example?.code || '')
                  setRunOutput(simulatePython(code))
                }}
                style={{ width: '100%', background: '#34d399', border: 'none', borderRadius: 12, padding: '12px', color: '#051a0e', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 12 }}>
                ▶ Run Code
              </button>
              {runOutput !== null && (
                <div style={{ background: '#060e0a', border: '1px solid #34d39935', borderRadius: 12, padding: '13px 17px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ fontSize: 11, color: '#34d39975', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Output</div>
                  <pre style={{ margin: 0, fontFamily: 'Fira Code, monospace', fontSize: 13, color: '#34d399', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{runOutput || '(no output)'}</pre>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setShowCody(!showCody)}
              style={{ width: '100%', background: showCody ? '#16161d' : 'transparent', border: '1px solid #2a2a38', borderRadius: 12, padding: '10px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              🦎 {showCody ? 'Hide Cody' : 'Ask Cody about this concept'}
            </button>
            {showCody && <CodyChat history={codyHistory} loading={codyLoading} input={codyInput} setInput={setCodyInput} onSend={askCody} endRef={codyEndRef} />}
          </div>

          <button onClick={() => setScreen('practice')}
            style={{ width: '100%', background: lesson.unitColor, border: 'none', borderRadius: 16, padding: '16px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 800, boxShadow: `0 4px 16px ${lesson.unitColor}35` }}>
            Got it — Let's Practice! →
          </button>
        </div>
        <style>{KEYFRAMES}</style>
      </ScreenWrapper>
    )
  }

  // ─── PRACTICE SCREEN ─────────────────────────────────────────────────────
  if (screen === 'practice') {
    const canSubmit = exercise?.type === 'fill_blank' ? fillValue.trim().length > 0 : selected !== null

    return (
      <ScreenWrapper>
        <Confetti pieces={confetti} />
        <TopBar router={router} progress={progressPct} hearts={hearts} color={lesson.unitColor} label={`${currentEx + 1}/${totalEx}`} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 0 0' }}>

          <div
            key={`${currentEx}-practice`}
            style={{
              border: `2px solid ${animState === 'correct' ? '#34d399' : animState === 'wrong' ? '#f87171' : '#2a2a38'}`,
              borderRadius: 22, padding: '22px',
              background: animState === 'correct' ? 'rgba(52,211,153,0.04)' : animState === 'wrong' ? 'rgba(248,113,113,0.04)' : '#16161d',
              marginBottom: 14, transition: 'border-color 0.25s, background 0.25s',
              animation: animState === 'wrong' ? 'shake 0.45s ease' : 'slideIn 0.28s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7c6fff', background: 'rgba(124,111,255,0.12)', padding: '5px 13px', borderRadius: 100, letterSpacing: '0.04em' }}>
                {{ multiple_choice: '🎯 Multiple Choice', fill_blank: '✏️ Fill in the Blank', true_false: '⚡ True or False', spot_bug: '🐛 Spot the Bug', output_prediction: '🔮 Predict Output' }[exercise?.type]}
              </span>
              <button onClick={() => setScreen('teach')} style={{ background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.22)', borderRadius: 8, padding: '5px 12px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
                ← Review
              </button>
            </div>

            <div style={{ marginBottom: 22 }}>
              {exercise?.question.includes('\n') ? (
                <>
                  <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginBottom: 12, color: '#f0f0f8' }}>{exercise.question.split('\n')[0]}</p>
                  <CodeBlock code={exercise.question.split('\n').slice(1).join('\n')} compact />
                </>
              ) : (
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.55, color: '#f0f0f8' }}>{exercise?.question}</p>
              )}
            </div>

            {['multiple_choice', 'spot_bug', 'output_prediction'].includes(exercise?.type) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {exercise.options.map((opt, i) => {
                  let bg = '#0f0f13', border = '1.5px solid #2a2a38', color = '#f0f0f5'
                  if (answered) {
                    if (i === exercise.correct) { bg = 'rgba(52,211,153,0.1)'; border = '2px solid #34d399'; color = '#34d399' }
                    else if (i === selected && !correct) { bg = 'rgba(248,113,113,0.1)'; border = '2px solid #f87171'; color = '#f87171' }
                    else { color = '#4a4a62' }
                  } else if (selected === i) { bg = 'rgba(124,111,255,0.1)'; border = '2px solid #7c6fff'; color = '#c0b0ff' }
                  return (
                    <button key={i} disabled={answered} onClick={() => !answered && setSelected(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: bg, border, borderRadius: 13, padding: '12px 16px', cursor: answered ? 'default' : 'pointer', transition: 'all 0.12s', textAlign: 'left', color, fontFamily: 'inherit', fontSize: 14, fontWeight: 500, transform: !answered && selected === i ? 'scale(1.01)' : 'scale(1)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, background: answered && i === exercise.correct ? '#34d399' : answered && i === selected && !correct ? '#f87171' : selected === i ? '#7c6fff' : '#1e1e28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, color: (answered && (i === exercise.correct || (i === selected && !correct))) || selected === i ? 'white' : '#6a6a82', transition: 'all 0.12s' }}>
                        {answered && i === exercise.correct ? '✓' : answered && i === selected && !correct ? '✗' : ['A', 'B', 'C', 'D'][i]}
                      </div>
                      <code style={{ fontFamily: opt.includes('(') || opt.includes('=') || opt.includes('#') ? 'Fira Code, monospace' : 'inherit', fontSize: 13, lineHeight: 1.5 }}>{opt}</code>
                    </button>
                  )
                })}
              </div>
            )}

            {exercise?.type === 'true_false' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[true, false].map(val => {
                  let bg = '#0f0f13', border = '2px solid #2a2a38', color = '#f0f0f5'
                  if (answered) {
                    if (val === exercise.correct) { bg = 'rgba(52,211,153,0.1)'; border = '2px solid #34d399'; color = '#34d399' }
                    else if (val === selected && !correct) { bg = 'rgba(248,113,113,0.1)'; border = '2px solid #f87171'; color = '#f87171' }
                  } else if (selected === val) { bg = 'rgba(124,111,255,0.12)'; border = '2px solid #7c6fff'; color = '#c0b0ff' }
                  return (
                    <button key={String(val)} disabled={answered} onClick={() => !answered && setSelected(val)}
                      style={{ background: bg, border, borderRadius: 16, padding: '20px 10px', cursor: answered ? 'default' : 'pointer', transition: 'all 0.12s', color, fontSize: 18, fontWeight: 800, fontFamily: 'inherit', transform: !answered && selected === val ? 'scale(1.03)' : 'scale(1)' }}>
                      {val ? '✅ True' : '❌ False'}
                    </button>
                  )
                })}
              </div>
            )}

            {exercise?.type === 'fill_blank' && (
              <div>
                <CodeBlock code={exercise.code} compact />
                <input ref={inputRef} type="text" value={fillValue}
                  onChange={e => !answered && setFillValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && !answered && checkAnswer()}
                  placeholder="Type your answer here..."
                  disabled={answered}
                  style={{ width: '100%', marginTop: 12, background: '#0a0a10', border: `2px solid ${answered ? (correct ? '#34d399' : '#f87171') : '#2a2a38'}`, borderRadius: 13, padding: '14px 16px', fontFamily: 'Fira Code, monospace', fontSize: 15, color: answered ? (correct ? '#34d399' : '#f87171') : '#f0f0f5', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {answered && (
              <div style={{ marginTop: 16, padding: '14px 17px', background: correct ? 'rgba(52,211,153,0.07)' : 'rgba(248,113,113,0.07)', border: `1.5px solid ${correct ? '#34d39950' : '#f8717150'}`, borderRadius: 13, fontSize: 14, color: correct ? '#34d399' : '#f87171', lineHeight: 1.65, animation: 'fadeIn 0.3s ease' }}>
                <strong>{correct ? '🎉 Correct! ' : '💡 Not quite — '}</strong>{exercise.explanation}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {!answered ? (
              <>
                <button onClick={getHint} style={{ flex: '0 0 auto', background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 13, padding: '13px 16px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                  🦎 Hint
                </button>
                <button onClick={checkAnswer} disabled={!canSubmit}
                  style={{ flex: 1, background: canSubmit ? '#7c6fff' : '#1a1a24', border: `2px solid ${canSubmit ? '#7c6fff' : '#2a2a38'}`, borderRadius: 13, padding: '13px', color: canSubmit ? 'white' : '#4a4a62', cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, transition: 'all 0.15s', boxShadow: canSubmit ? '0 4px 14px rgba(124,111,255,0.3)' : 'none' }}>
                  Check Answer ✓
                </button>
              </>
            ) : (
              <button onClick={nextExercise}
                style={{ flex: 1, background: correct ? '#34d399' : '#f87171', border: 'none', borderRadius: 13, padding: '15px', color: correct ? '#051a0e' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, boxShadow: `0 4px 16px ${correct ? '#34d39950' : '#f8717150'}` }}>
                {currentEx + 1 >= totalEx ? '🎉 See My Results!' : 'Continue →'}
              </button>
            )}
          </div>

          <button onClick={() => setShowCody(!showCody)}
            style={{ width: '100%', background: showCody ? '#16161d' : 'transparent', border: '1px solid #2a2a38', borderRadius: 12, padding: '9px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: showCody ? 10 : 0 }}>
            🦎 {showCody ? 'Hide Cody' : 'Ask Cody anything'}
          </button>
          {showCody && <CodyChat history={codyHistory} loading={codyLoading} input={codyInput} setInput={setCodyInput} onSend={askCody} endRef={codyEndRef} />}
        </div>
        <style>{KEYFRAMES}</style>
      </ScreenWrapper>
    )
  }

  // ─── SUMMARY SCREEN ───────────────────────────────────────────────────────
  if (screen === 'summary') {
    const accuracy = Math.round((correctCount / totalEx) * 100)
    const grade = accuracy >= 80
      ? { emoji: '🏆', msg: 'Amazing work!', color: '#fbbf24' }
      : accuracy >= 60
        ? { emoji: '💪', msg: 'Nice effort!', color: '#60a5fa' }
        : { emoji: '📚', msg: 'Keep going!', color: '#a78bfa' }

    return (
      <ScreenWrapper>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 0', animation: 'slideUp 0.5s ease' }}>

          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 68, marginBottom: 10, display: 'inline-block', animation: 'bounceIn 0.65s ease' }}>{grade.emoji}</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{grade.msg}</h1>
            <p style={{ color: '#9090a8', fontSize: 15 }}>You finished <strong style={{ color: lesson.unitColor }}>{lesson.title}</strong></p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 26 }}>
            {[
              { label: 'XP Earned', value: `+${xpGained}`, color: '#7c6fff', bg: 'rgba(124,111,255,0.1)', icon: '⚡' },
              { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 80 ? '#34d399' : accuracy >= 60 ? '#fbbf24' : '#f87171', bg: 'rgba(52,211,153,0.06)', icon: '🎯' },
              { label: 'Hearts Left', value: `${hearts}/5`, color: '#f87171', bg: 'rgba(248,113,113,0.06)', icon: '❤️' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: bg, border: `1.5px solid ${color}30`, borderRadius: 16, padding: '16px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 3 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6a6a82', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Exercise review */}
          <div style={{ background: '#16161d', border: '1px solid #2a2a38', borderRadius: 18, padding: '18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#5a5a72', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 13 }}>📊 Question Review</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lesson.exercises.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#0f0f13', borderRadius: 12 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{i < correctCount ? '✅' : '❌'}</span>
                  <span style={{ fontSize: 13, color: '#c0c0d8', flex: 1 }}>{ex.teach?.title}</span>
                  <span style={{ fontSize: 12 }}>{{ multiple_choice: '🎯', fill_blank: '✏️', true_false: '⚡', spot_bug: '🐛', output_prediction: '🔮' }[ex.type]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cheat sheet */}
          <div style={{ background: '#16161d', border: '1px solid #2a2a38', borderRadius: 18, padding: '18px', marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>{lesson.summary.title}</h2>
            </div>
            <div style={{ marginBottom: 16 }}>
              {lesson.summary.points.map((point, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 9, fontSize: 14, color: '#c0c0d0', lineHeight: 1.55 }}>
                  <span style={{ color: lesson.unitColor, flexShrink: 0, fontWeight: 800 }}>✓</span>
                  {point}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #2a2a38', paddingTop: 15 }}>
              <div style={{ fontSize: 11, color: '#5a5a72', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Quick Reference</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {lesson.summary.cheatsheet.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0a0a10', borderRadius: 10, padding: '9px 13px' }}>
                    <code style={{ fontFamily: 'Fira Code, monospace', fontSize: 12, color: '#a0a0c8', flex: 1 }}>{item.code}</code>
                    <span style={{ fontSize: 12, color: '#6a6a82' }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => router.push('/learn')}
            style={{ width: '100%', background: lesson.unitColor, border: 'none', borderRadius: 16, padding: '17px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 800, boxShadow: `0 4px 20px ${lesson.unitColor}45`, marginBottom: 12 }}>
            Continue Learning →
          </button>
          <button onClick={() => {
            setScreen('intro'); setCurrentEx(0); setHearts(5); setXpGained(0); setCorrectCount(0)
            setSelected(null); setFillValue(''); setAnswered(false); setCorrect(false); setCodyHistory([])
          }}
            style={{ width: '100%', background: 'transparent', border: '1.5px solid #2a2a38', borderRadius: 16, padding: '14px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }}>
            🔄 Redo Lesson
          </button>
        </div>
        <style>{KEYFRAMES}</style>
      </ScreenWrapper>
    )
  }
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────

function ScreenWrapper({ children }) {
  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

function TopBar({ router, progress, hearts, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0 13px', position: 'sticky', top: 0, background: '#0f0f13', zIndex: 10 }}>
      <button onClick={() => router.push('/learn')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a82', fontSize: 20, display: 'flex', alignItems: 'center', flexShrink: 0, padding: 4 }}>✕</button>
      <div style={{ flex: 1, height: 9, background: '#1e1e28', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color || '#7c6fff', borderRadius: 100, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      {label && <span style={{ fontSize: 12, color: '#5a5a72', fontWeight: 700, flexShrink: 0 }}>{label}</span>}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {[...Array(5)].map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: i < hearts ? 1 : 0.12, transition: 'opacity 0.35s' }}>❤️</span>
        ))}
      </div>
    </div>
  )
}

function CodeBlock({ code, output, compact }) {
  return (
    <div style={{ background: '#0a0a10', border: '1px solid #2a2a38', borderRadius: compact ? 12 : 16, overflow: 'hidden' }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderBottom: '1px solid #1e1e28' }}>
          {['#f87171', '#fbbf24', '#34d399'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
          <span style={{ fontSize: 11, color: '#5a5a72', marginLeft: 4, fontFamily: 'Fira Code, monospace' }}>python</span>
        </div>
      )}
      <pre style={{ margin: 0, padding: compact ? '11px 15px' : '15px 20px', fontFamily: 'Fira Code, monospace', fontSize: compact ? 12 : 13, color: '#c0c0d0', lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
        {code}
      </pre>
      {output && (
        <div style={{ padding: '9px 20px 13px', borderTop: '1px solid #1a1a24', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#5a5a72', fontFamily: 'Fira Code, monospace' }}>output:</span>
          <span style={{ fontSize: 13, color: '#34d399', fontFamily: 'Fira Code, monospace', whiteSpace: 'pre-wrap' }}>{output}</span>
        </div>
      )}
    </div>
  )
}

function CodyAvatar({ color, bounce }) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}20`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, animation: bounce ? 'bounce 2.5s ease infinite' : 'none' }}>
      🦎
    </div>
  )
}

function CodyChat({ history, loading, input, setInput, onSend, endRef }) {
  return (
    <div style={{ background: '#16161d', border: '1px solid #2a2a38', borderRadius: 16, padding: 14, animation: 'fadeIn 0.25s ease', marginTop: 10 }}>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: (history.length > 0 || loading) ? 10 : 0 }}>
        {history.length === 0 && !loading && (
          <p style={{ color: '#5a5a72', fontSize: 13, textAlign: 'center', padding: '6px 0' }}>🦎 Cody's here to help — ask anything!</p>
        )}
        {history.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '86%', background: msg.role === 'user' ? 'rgba(124,111,255,0.14)' : '#1e1e28', border: `1px solid ${msg.role === 'user' ? 'rgba(124,111,255,0.3)' : '#2a2a38'}`, borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '9px 13px', fontSize: 13, lineHeight: 1.6, color: '#f0f0f5', whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 5, padding: '10px 13px', background: '#1e1e28', borderRadius: '12px 12px 12px 4px', width: 'fit-content' }}>
            {[0, 0.18, 0.36].map((d, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c6fff', animation: `pulse 1.2s ${d}s infinite` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend(input)}
          placeholder="Ask Cody..."
          style={{ flex: 1, background: '#0a0a10', border: '1px solid #2a2a38', borderRadius: 10, padding: '9px 13px', fontFamily: 'inherit', fontSize: 13, color: '#f0f0f5', outline: 'none' }} />
        <button onClick={() => onSend(input)} disabled={loading || !input.trim()}
          style={{ background: '#7c6fff', border: 'none', borderRadius: 10, padding: '9px 15px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, opacity: loading || !input.trim() ? 0.4 : 1 }}>
          →
        </button>
      </div>
    </div>
  )
}

function Confetti({ pieces }) {
  if (!pieces || !pieces.length) return null
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: '-10px', width: p.size, height: p.size, background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px', animation: `confettiFall 1.8s ${p.delay}s ease-out forwards` }} />
      ))}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #2a2a38', borderTop: '3px solid #7c6fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#5a5a72', fontSize: 14 }}>Loading lesson...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Simulated Python sandbox for "Try It Live" tab
function simulatePython(code) {
  try {
    const lines = code.split('\n')
    const output = []
    const vars = {}

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const printMatch = line.match(/^print\(([\s\S]*)\)$/)
      if (printMatch) {
        let inner = printMatch[1].trim()
        const strMatch = inner.match(/^["']([\s\S]*)["']$/)
        if (strMatch) { output.push(strMatch[1]); continue }
        const fMatch = inner.match(/^f["']([\s\S]*)["']$/)
        if (fMatch) {
          let result = fMatch[1].replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`)
          output.push(result); continue
        }
        if (/^[\d\s+\-*/().]+$/.test(inner)) {
          try { output.push(String(eval(inner))); continue } catch {}
        }
        if (vars[inner] !== undefined) { output.push(String(vars[inner])); continue }
        if (inner.includes(',')) {
          const parts = inner.split(',').map(p => {
            p = p.trim()
            const sm = p.match(/^["']([\s\S]*)["']$/)
            if (sm) return sm[1]
            if (vars[p] !== undefined) return String(vars[p])
            if (/^[\d+\-*/\s().]+$/.test(p)) { try { return String(eval(p)) } catch {} }
            return p
          })
          output.push(parts.join(' ')); continue
        }
        output.push(inner); continue
      }

      const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/)
      if (assignMatch) {
        const [, name, val] = assignMatch
        const sm = val.match(/^["']([\s\S]*)["']$/)
        if (sm) { vars[name] = sm[1]; continue }
        if (/^[\d\s+\-*/().]+$/.test(val)) { try { vars[name] = eval(val); continue } catch {} }
        if (vars[val] !== undefined) { vars[name] = vars[val]; continue }
        vars[name] = val
      }
    }

    return output.length ? output.join('\n') : '(no output — try adding a print() statement!)'
  } catch (e) {
    return `Error: ${e.message}`
  }
}

const KEYFRAMES = `
  @keyframes slideUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%, 100% { opacity: 0.25; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1); } }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.15); } 80% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
`