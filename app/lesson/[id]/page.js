'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lib/curriculum'

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [currentEx, setCurrentEx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [fillValue, setFillValue] = useState('')
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [hearts, setHearts] = useState(5)
  const [xpGained, setXpGained] = useState(0)
  const [finished, setFinished] = useState(false)
  const [animState, setAnimState] = useState('')
  const [showCody, setShowCody] = useState(false)
  const [codyMessage, setCodyMessage] = useState('')
  const [codyInput, setCodyInput] = useState('')
  const [codyLoading, setCodyLoading] = useState(false)
  const [codyHistory, setCodyHistory] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      const lessonData = getLessonById(params.id)
      if (!lessonData) { router.push('/learn'); return }
      setLesson(lessonData)
    })
  }, [params.id])

  const exercise = lesson?.exercises[currentEx]
  const progress = lesson ? ((currentEx) / lesson.exercises.length) * 100 : 0

  function checkAnswer() {
    if (answered) return
    let isCorrect = false

    if (exercise.type === 'fill_blank') {
      isCorrect = fillValue.trim().toLowerCase() === exercise.correct.toLowerCase()
    } else if (exercise.type === 'true_false') {
      isCorrect = selected === exercise.correct
    } else {
      isCorrect = selected === exercise.correct
    }

    setAnswered(true)
    setCorrect(isCorrect)

    if (isCorrect) {
      setAnimState('correct')
      const gained = Math.floor(lesson.xpReward / lesson.exercises.length)
      setXpGained(prev => prev + gained)
      setTimeout(() => setAnimState(''), 600)
    } else {
      setAnimState('wrong')
      setHearts(prev => Math.max(0, prev - 1))
      setTimeout(() => setAnimState(''), 500)
    }
  }

  function nextExercise() {
    if (currentEx + 1 >= lesson.exercises.length) {
      // Save progress
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return
        const key = `codero_progress_${session.user.id}`
        const saved = JSON.parse(localStorage.getItem(key) || '{}')
        const newProgress = {
          ...saved,
          progress: { ...(saved.progress || {}), [lesson.id]: { completed: true } },
          xp: (saved.xp || 0) + xpGained,
          streak: saved.streak || 1,
        }
        localStorage.setItem(key, JSON.stringify(newProgress))
      })
      setFinished(true)
    } else {
      setCurrentEx(prev => prev + 1)
      setSelected(null)
      setFillValue('')
      setAnswered(false)
      setCorrect(false)
      setAnimState('')
    }
  }

  async function askCody(message) {
    if (!message.trim()) return
    setCodyLoading(true)
    const userMsg = { role: 'user', text: message }
    setCodyHistory(prev => [...prev, userMsg])
    setCodyInput('')

    try {
      const res = await fetch('/api/pypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: `Lesson: ${lesson?.title}. Current exercise: ${exercise?.question}`,
        }),
      })
      const data = await res.json()
      setCodyHistory(prev => [...prev, { role: 'cody', text: data.reply }])
    } catch {
      setCodyHistory(prev => [...prev, { role: 'cody', text: "Oops, I had a brain freeze! Try again." }])
    }
    setCodyLoading(false)
  }

  function getHint() {
    const hintMsg = `Give me a hint for this Python exercise without revealing the answer: "${exercise?.question}"`
    setShowCody(true)
    askCody(hintMsg)
  }

  if (!lesson) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #2a2a38', borderTop: '3px solid #7c6fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // Finished screen
  if (finished) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', animation: 'slideUp 0.5s ease' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Lesson Complete!</h1>
          <p style={{ color: '#9090a8', marginBottom: 40, fontSize: 16 }}>You crushed {lesson.title}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
            <div style={{ background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#7c6fff', marginBottom: 4 }}>+{xpGained}</div>
              <div style={{ fontSize: 14, color: '#9090a8' }}>XP earned</div>
            </div>
            <div style={{ background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                {'❤️'.repeat(hearts)}{'🖤'.repeat(5 - hearts)}
              </div>
              <div style={{ fontSize: 14, color: '#9090a8' }}>{hearts} hearts left</div>
            </div>
          </div>

          <button onClick={() => router.push('/learn')} className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 14, background: '#7c6fff' }}>
            Back to lessons →
          </button>
        </div>
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    )
  }

  const canSubmit = answered ? true : (
    exercise?.type === 'fill_blank' ? fillValue.trim().length > 0 :
    exercise?.type === 'true_false' ? selected !== null :
    selected !== null
  )

  return (
    <div style={{ minHeight: '100vh', maxWidth: 680, margin: '0 auto', padding: '0 16px 40px', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', marginBottom: 8 }}>
        <button onClick={() => router.push('/learn')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090a8', fontSize: 22, display: 'flex', alignItems: 'center' }}>✕</button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 12, background: '#1e1e28', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: lesson.unitColor || '#7c6fff', borderRadius: 100, transition: 'width 0.4s ease' }} />
        </div>

        {/* Hearts */}
        <div style={{ display: 'flex', gap: 4, fontSize: 18 }}>
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ opacity: i < hearts ? 1 : 0.2, transition: 'opacity 0.3s', filter: i < hearts ? 'none' : 'grayscale(1)' }}>❤️</span>
          ))}
        </div>
      </div>

      {/* Exercise card */}
      <div
        key={currentEx}
        style={{ animation: 'slideIn 0.3s ease', border: `1.5px solid ${animState === 'correct' ? '#34d399' : animState === 'wrong' ? '#f87171' : '#2a2a38'}`, borderRadius: 20, padding: '28px 24px', background: animState === 'correct' ? 'rgba(52,211,153,0.05)' : animState === 'wrong' ? 'rgba(248,113,113,0.05)' : '#16161d', marginBottom: 24, transition: 'border-color 0.2s, background 0.2s' }}
      >
        {/* Exercise type badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7c6fff', background: 'rgba(124,111,255,0.12)', padding: '4px 12px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {{
              multiple_choice: '🎯 Multiple Choice',
              fill_blank: '✏️ Fill in the Blank',
              true_false: '⚡ True or False',
              spot_bug: '🐛 Spot the Bug',
              output_prediction: '🔮 Predict the Output',
            }[exercise?.type] || '❓ Question'}
          </span>
          <span style={{ fontSize: 13, color: '#5a5a72' }}>{currentEx + 1}/{lesson.exercises.length}</span>
        </div>

        {/* Question */}
        <div style={{ marginBottom: 28 }}>
          {exercise?.question.includes('\n') ? (
            <>
              <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
                {exercise.question.split('\n')[0]}
              </p>
              <pre style={{ background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 12, padding: '16px 20px', fontFamily: 'Fira Code, monospace', fontSize: 14, color: '#c0c0d0', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>
                {exercise.question.split('\n').slice(1).join('\n')}
              </pre>
            </>
          ) : (
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>{exercise?.question}</p>
          )}
        </div>

        {/* Answers */}
        {(exercise?.type === 'multiple_choice' || exercise?.type === 'spot_bug' || exercise?.type === 'output_prediction') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exercise.options.map((opt, i) => {
              let bg = '#0f0f13', border = '1.5px solid #2a2a38', color = '#f0f0f5'
              if (answered) {
                if (i === exercise.correct) { bg = 'rgba(52,211,153,0.12)'; border = '1.5px solid #34d399'; color = '#34d399' }
                else if (i === selected && !correct) { bg = 'rgba(248,113,113,0.12)'; border = '1.5px solid #f87171'; color = '#f87171' }
              } else if (selected === i) { bg = 'rgba(124,111,255,0.12)'; border = '1.5px solid #7c6fff'; color = '#a08fff' }

              return (
                <button key={i} disabled={answered} onClick={() => !answered && setSelected(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: bg, border, borderRadius: 12, padding: '14px 18px', cursor: answered ? 'default' : 'pointer', transition: 'all 0.15s', textAlign: 'left', color, fontFamily: 'inherit', fontSize: 15, fontWeight: 500 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: answered && i === exercise.correct ? '#34d399' : answered && i === selected && !correct ? '#f87171' : selected === i ? '#7c6fff' : '#1e1e28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: (answered && (i === exercise.correct || (i === selected && !correct))) || selected === i ? 'white' : '#9090a8', transition: 'all 0.15s' }}>
                    {answered && i === exercise.correct ? '✓' : answered && i === selected && !correct ? '✗' : ['A', 'B', 'C', 'D'][i]}
                  </div>
                  <code style={{ fontFamily: opt.includes('(') || opt.includes('=') ? 'Fira Code, monospace' : 'inherit' }}>{opt}</code>
                </button>
              )
            })}
          </div>
        )}

        {exercise?.type === 'true_false' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[true, false].map(val => {
              let bg = '#0f0f13', border = '1.5px solid #2a2a38', color = '#f0f0f5'
              if (answered) {
                if (val === exercise.correct) { bg = 'rgba(52,211,153,0.12)'; border = '1.5px solid #34d399'; color = '#34d399' }
                else if (val === selected && !correct) { bg = 'rgba(248,113,113,0.12)'; border = '1.5px solid #f87171'; color = '#f87171' }
              } else if (selected === val) { bg = 'rgba(124,111,255,0.12)'; border = '1.5px solid #7c6fff'; color = '#a08fff' }

              return (
                <button key={String(val)} disabled={answered} onClick={() => !answered && setSelected(val)}
                  style={{ background: bg, border, borderRadius: 14, padding: '18px', cursor: answered ? 'default' : 'pointer', transition: 'all 0.15s', color, fontSize: 18, fontWeight: 700, fontFamily: 'inherit' }}>
                  {val ? '✅ True' : '❌ False'}
                </button>
              )
            })}
          </div>
        )}

        {exercise?.type === 'fill_blank' && (
          <div>
            <pre style={{ background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 12, padding: '16px 20px', fontFamily: 'Fira Code, monospace', fontSize: 14, color: '#c0c0d0', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
              {exercise.code}
            </pre>
            <input
              ref={inputRef}
              type="text"
              value={fillValue}
              onChange={e => !answered && setFillValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && !answered && checkAnswer()}
              placeholder="Type your answer..."
              disabled={answered}
              style={{ width: '100%', background: '#0f0f13', border: `1.5px solid ${answered ? (correct ? '#34d399' : '#f87171') : '#2a2a38'}`, borderRadius: 12, padding: '14px 18px', fontFamily: 'Fira Code, monospace', fontSize: 15, color: answered ? (correct ? '#34d399' : '#f87171') : '#f0f0f5', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>
        )}

        {/* Explanation */}
        {answered && (
          <div style={{ marginTop: 20, padding: '14px 18px', background: correct ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${correct ? '#34d39944' : '#f8717144'}`, borderRadius: 12, fontSize: 14, color: correct ? '#34d399' : '#f87171', lineHeight: 1.6, animation: 'fadeIn 0.3s ease' }}>
            <strong>{correct ? '🎉 Correct! ' : '💡 Not quite. '}</strong>
            {exercise.explanation}
          </div>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {!answered ? (
          <>
            <button onClick={getHint} style={{ flex: '0 0 auto', background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 12, padding: '14px 18px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              🦎 Hint
            </button>
            <button onClick={checkAnswer} disabled={!canSubmit}
              style={{ flex: 1, background: canSubmit ? '#7c6fff' : '#1e1e28', border: `1.5px solid ${canSubmit ? '#7c6fff' : '#2a2a38'}`, borderRadius: 12, padding: '14px', color: canSubmit ? 'white' : '#5a5a72', cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, transition: 'all 0.15s' }}>
              Check Answer
            </button>
          </>
        ) : (
          <button onClick={nextExercise}
            style={{ flex: 1, background: correct ? '#34d399' : '#f87171', border: 'none', borderRadius: 12, padding: '14px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, transition: 'all 0.15s' }}>
            {currentEx + 1 >= lesson.exercises.length ? '🎉 Finish Lesson' : 'Next →'}
          </button>
        )}
      </div>

      {/* Ask Cody toggle */}
      <button onClick={() => setShowCody(!showCody)} style={{ width: '100%', background: showCody ? '#1e1e28' : 'transparent', border: '1px solid #2a2a38', borderRadius: 12, padding: '10px', color: '#9090a8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: showCody ? 12 : 0 }}>
        🦎 {showCody ? 'Hide Cody' : 'Ask Cody — your AI tutor'}
      </button>

      {/* Cody chat */}
      {showCody && (
        <div style={{ background: '#16161d', border: '1px solid #2a2a38', borderRadius: 16, padding: 16, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #2a2a38' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,111,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🦎</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Cody</div>
              <div style={{ fontSize: 12, color: '#9090a8' }}>Your AI Python tutor</div>
            </div>
          </div>

          {codyHistory.length === 0 && (
            <p style={{ color: '#5a5a72', fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>
              Hey! I'm Cody 🦎 Ask me anything about this exercise or Python in general. I'm here to help!
            </p>
          )}

          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: codyHistory.length > 0 ? 14 : 0 }}>
            {codyHistory.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', background: msg.role === 'user' ? 'rgba(124,111,255,0.15)' : '#1e1e28', border: `1px solid ${msg.role === 'user' ? 'rgba(124,111,255,0.3)' : '#2a2a38'}`, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', fontSize: 14, lineHeight: 1.6, color: '#f0f0f5', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {codyLoading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: '14px 14px 14px 4px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c6fff', animation: `pulse 1s ease-in-out ${delay}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={codyInput}
              onChange={e => setCodyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !codyLoading && askCody(codyInput)}
              placeholder="Ask Cody anything..."
              style={{ flex: 1, background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 10, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, color: '#f0f0f5', outline: 'none' }}
            />
            <button onClick={() => askCody(codyInput)} disabled={codyLoading || !codyInput.trim()}
              style={{ background: '#7c6fff', border: 'none', borderRadius: 10, padding: '10px 16px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, opacity: codyLoading || !codyInput.trim() ? 0.5 : 1 }}>
              Send
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}