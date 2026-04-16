'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CURRICULUM } from '@/lib/curriculum'

export default function LearnPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [progress, setProgress] = useState({})
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)

      // Load progress from localStorage for now
      const saved = localStorage.getItem(`codero_progress_${session.user.id}`)
      if (saved) {
        const data = JSON.parse(saved)
        setProgress(data.progress || {})
        setXp(data.xp || 0)
        setStreak(data.streak || 0)
      }
      setLoading(false)
    })
  }, [])

  function getLessonStatus(unitIndex, lessonIndex) {
    const unit = CURRICULUM[unitIndex]
    const lesson = unit.lessons[lessonIndex]
    if (progress[lesson.id]?.completed) return 'completed'
    
    // First lesson of first unit is always unlocked
    if (unitIndex === 0 && lessonIndex === 0) return 'unlocked'
    
    // Unlock if previous lesson in same unit is done
    if (lessonIndex > 0) {
      const prevLesson = unit.lessons[lessonIndex - 1]
      if (progress[prevLesson.id]?.completed) return 'unlocked'
      return 'locked'
    }
    
    // First lesson of a unit: unlock if ALL lessons in previous unit are done
    if (unitIndex > 0) {
      const prevUnit = CURRICULUM[unitIndex - 1]
      const allPrevDone = prevUnit.lessons.every(l => progress[l.id]?.completed)
      if (allPrevDone) return 'unlocked'
    }
    return 'locked'
  }

  function getUnitProgress(unit) {
    const completed = unit.lessons.filter(l => progress[l.id]?.completed).length
    return { completed, total: unit.lessons.length, pct: Math.round((completed / unit.lessons.length) * 100) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #2a2a38', borderTop: '3px solid #7c6fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const totalLessons = CURRICULUM.reduce((a, u) => a + u.lessons.length, 0)
  const completedLessons = Object.values(progress).filter(p => p.completed).length

  return (
    <div style={{ minHeight: '100vh', maxWidth: 680, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #1e1e28', marginBottom: 32, position: 'sticky', top: 0, background: '#0f0f13', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🦎</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>
            <span style={{ color: '#7c6fff' }}>code</span>ro
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Streak */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 100, padding: '6px 14px' }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: streak > 0 ? '#fbbf24' : '#5a5a72' }}>{streak}</span>
          </div>
          {/* XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 100, padding: '6px 14px' }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#7c6fff' }}>{xp}</span>
          </div>
          {/* Avatar */}
          <button onClick={handleSignOut} style={{ background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }} title="Sign out">
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
              : '👤'}
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e1e28, #16161d)', border: '1px solid #2a2a38', borderRadius: 20, padding: '24px 28px', marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: '#7c6fff', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Python Track</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Hey {user?.user_metadata?.name?.split(' ')[0] || 'Coder'} 👋
          </h1>
          <p style={{ color: '#9090a8', fontSize: 14 }}>{completedLessons} of {totalLessons} lessons complete</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#7c6fff' }}>{xp}</div>
          <div style={{ fontSize: 13, color: '#9090a8' }}>total XP</div>
        </div>
      </div>

      {/* Curriculum units */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {CURRICULUM.map((unit, unitIndex) => {
          const { completed, total, pct } = getUnitProgress(unit)
          const unitUnlocked = unitIndex === 0 || CURRICULUM[unitIndex - 1].lessons.every(l => progress[l.id]?.completed)

          return (
            <div key={unit.id} style={{ opacity: unitUnlocked ? 1 : 0.5, transition: 'opacity 0.3s' }}>
              {/* Unit header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: unitUnlocked ? unit.color + '22' : '#1e1e28', border: `1.5px solid ${unitUnlocked ? unit.color + '44' : '#2a2a38'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                  {unitUnlocked ? unit.icon : '🔒'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>{unit.title}</h2>
                    <span style={{ fontSize: 13, color: '#9090a8' }}>{completed}/{total}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#9090a8', marginBottom: 8 }}>{unit.description}</p>
                  {/* Progress bar */}
                  <div style={{ height: 6, background: '#1e1e28', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: unit.color, borderRadius: 100, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>

              {/* Lessons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
                {unit.lessons.map((lesson, lessonIndex) => {
                  const status = getLessonStatus(unitIndex, lessonIndex)
                  const isCompleted = status === 'completed'
                  const isLocked = status === 'locked'

                  return (
                    <button
                      key={lesson.id}
                      disabled={isLocked}
                      onClick={() => !isLocked && router.push(`/lesson/${lesson.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: isCompleted ? unit.color + '12' : '#16161d',
                        border: `1px solid ${isCompleted ? unit.color + '40' : '#2a2a38'}`,
                        borderRadius: 14, padding: '14px 18px', cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.5 : 1, transition: 'all 0.15s', textAlign: 'left',
                        transform: 'translateY(0)',
                      }}
                      onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = isCompleted ? unit.color : '#7c6fff' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isCompleted ? unit.color + '40' : '#2a2a38' }}
                    >
                      {/* Status icon */}
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: isCompleted ? unit.color + '22' : '#1e1e28', border: `1.5px solid ${isCompleted ? unit.color : '#2a2a38'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {isCompleted ? '✅' : isLocked ? '🔒' : '▶️'}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{lesson.title}</div>
                        <div style={{ fontSize: 13, color: '#9090a8' }}>{lesson.exercises.length} exercises · {lesson.xpReward} XP</div>
                      </div>

                      {isCompleted && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: unit.color }}>
                          +{lesson.xpReward} XP
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}