import { useState, useMemo, useEffect, useRef } from 'react'
import { getToken } from '../../api'
import './ProjectsTab.css'

// ── Constants ─────────────────────────────────────────────────
const FILTERS = ['ALL', 'WEB', 'MOBILE', 'AI/ML', 'DEVOPS', 'DESIGN', 'OPEN SOURCE', 'ONGOING', 'COMPLETED']
const SORTS   = ['NEWEST', 'TOP RATED', 'MOST LIKED', 'A-Z']
const TECH_OPTIONS = ['React','Next.js','Node.js','Python','FastAPI','Django','Flutter','React Native','TypeScript','Go','Rust','Docker','Kubernetes','PostgreSQL','MongoDB','Redis','TensorFlow','PyTorch','AWS','Figma']
const AVATAR_COLORS = ['hsl(350,50%,30%)','hsl(210,50%,30%)','hsl(140,40%,25%)','hsl(40,50%,28%)','hsl(270,40%,30%)','hsl(180,40%,25%)']

// ── Helpers ───────────────────────────────────────────────────
function getInitials(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2)
}

function isValidUrl(str) {
  if (!str.trim()) return null
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}

function isValidGithubUrl(str) {
  if (!str.trim()) return false
  try {
    const u = new URL(str)
    return (u.protocol === 'http:' || u.protocol === 'https:') && ['github.com','gitlab.com','bitbucket.org'].includes(u.hostname)
  } catch { return false }
}

function timeAgo(date) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

// ── API calls ─────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken()
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

// ── Upload Modal ──────────────────────────────────────────────
function UploadModal({ onClose, onSubmit, globalProfile }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: '', status: 'Ongoing',
    tech: [], github: '', demo: '', members: [],
  })
  const [memberInput, setMemberInput] = useState('')
  const [memberError, setMemberError] = useState('')
  const [urlTouched, setUrlTouched] = useState({ github: false, demo: false })
  const STEPS = ['DETAILS', 'TECH', 'LINKS', 'REVIEW']

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleTech = t => setForm(f => ({ ...f, tech: f.tech.includes(t) ? f.tech.filter(x => x !== t) : [...f.tech, t] }))

  const addMember = () => {
    const name = memberInput.trim()
    if (!name || name.length < 2) { setMemberError('Name too short.'); return }
    if (form.members.includes(name)) { setMemberError('Already added.'); return }
    setForm(f => ({ ...f, members: [...f.members, name] }))
    setMemberInput(''); setMemberError('')
  }

  const githubValid = isValidGithubUrl(form.github)
  const demoValid   = isValidUrl(form.demo)

  const canProceed = () => {
    if (step === 0) return form.title.trim() && form.description.trim() && form.category
    if (step === 1) return form.tech.length > 0
    if (step === 2) return githubValid && demoValid !== false
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        status: form.status,
        technologiesUsed: form.tech,
        github: form.github,
        deployment: form.demo || '',
        contributors: form.members,
        owner: globalProfile?.name || 'Member',
        rating: '0.0',
      }
      const result = await apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) })
      onSubmit(result.project || payload)
      onClose()
    } catch (err) {
      alert('Failed to submit project: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-overlay">
      <div className="pt-modal">
        <div className="pt-modal-accent" />
        <div className="pt-modal-header">
          <div>
            <div className="pt-modal-meta">
              <span className="pt-step-label">STEP {step+1} / {STEPS.length}</span>
              <span className="pt-step-name">{STEPS[step]}</span>
            </div>
            <h2 className="pt-modal-title">UPLOAD PROJECT</h2>
          </div>
          <button className="pt-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pt-progress"><div className="pt-progress-bar" style={{ width: `${((step+1)/STEPS.length)*100}%` }} /></div>

        <div className="pt-modal-body">
          {step === 0 && (
            <div className="pt-step">
              <label className="pt-label">PROJECT TITLE *</label>
              <input className="pt-input" placeholder="e.g. NeuralVault" value={form.title} onChange={e => update('title', e.target.value)} />
              <label className="pt-label">DESCRIPTION *</label>
              <textarea className="pt-textarea" rows={3} placeholder="Describe your project..." value={form.description} onChange={e => update('description', e.target.value)} />
              <label className="pt-label">CATEGORY *</label>
              <div className="pt-chip-group">
                {['WEB','MOBILE','AI/ML','DEVOPS','DESIGN','OPEN SOURCE'].map(c => (
                  <button key={c} className={`pt-chip ${form.category === c ? 'pt-chip-active' : ''}`} onClick={() => update('category', c)} type="button">{c}</button>
                ))}
              </div>
              <label className="pt-label">STATUS</label>
              <div className="pt-chip-group">
                {['Ongoing','Completed'].map(s => (
                  <button key={s} className={`pt-chip ${form.status === s ? 'pt-chip-active' : ''}`} onClick={() => update('status', s)} type="button">{s.toUpperCase()}</button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="pt-step">
              <label className="pt-label">SELECT TECH STACK *</label>
              <p className="pt-hint">Choose all that apply.</p>
              <div className="pt-tech-grid">
                {TECH_OPTIONS.map(t => (
                  <button key={t} className={`pt-tech-chip ${form.tech.includes(t) ? 'pt-tech-chip-active' : ''}`} onClick={() => toggleTech(t)} type="button">
                    {form.tech.includes(t) && <span className="pt-check">✓ </span>}{t}
                  </button>
                ))}
              </div>
              {form.tech.length > 0 && <p className="pt-selected">{form.tech.length} selected: {form.tech.join(', ')}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="pt-step">
              <label className="pt-label">GITHUB URL *</label>
              <div className="pt-input-wrap">
                <input
                  className={`pt-input ${urlTouched.github ? (githubValid ? 'pt-input-ok' : 'pt-input-err') : ''}`}
                  placeholder="https://github.com/user/repo"
                  value={form.github} onChange={e => update('github', e.target.value)}
                  onBlur={() => setUrlTouched(t => ({ ...t, github: true }))} type="url" spellCheck={false}
                />
                {urlTouched.github && <span className={`pt-url-icon ${githubValid ? 'pt-url-ok' : 'pt-url-bad'}`}>{githubValid ? '✓' : '✕'}</span>}
              </div>
              {urlTouched.github && !githubValid && <p className="pt-error">Must be a valid GitHub, GitLab, or Bitbucket URL</p>}

              <label className="pt-label">DEMO URL <span className="pt-optional">OPTIONAL</span></label>
              <div className="pt-input-wrap">
                <input
                  className={`pt-input ${urlTouched.demo && form.demo.trim() ? (demoValid ? 'pt-input-ok' : 'pt-input-err') : ''}`}
                  placeholder="https://your-demo.vercel.app"
                  value={form.demo} onChange={e => update('demo', e.target.value)}
                  onBlur={() => setUrlTouched(t => ({ ...t, demo: true }))} type="url" spellCheck={false}
                />
                {urlTouched.demo && form.demo.trim() && <span className={`pt-url-icon ${demoValid ? 'pt-url-ok' : 'pt-url-bad'}`}>{demoValid ? '✓' : '✕'}</span>}
              </div>
              {urlTouched.demo && demoValid === false && <p className="pt-error">Must be a valid https:// URL</p>}

              <label className="pt-label">TEAM MEMBERS <span className="pt-optional">OPTIONAL</span></label>
              <div className="pt-member-row">
                <input className="pt-input" placeholder="Type a name and press +"
                  value={memberInput} onChange={e => { setMemberInput(e.target.value); setMemberError('') }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())} maxLength={40}
                />
                <button className="pt-add-member-btn" onClick={addMember} type="button">+</button>
              </div>
              {memberError && <p className="pt-error">{memberError}</p>}
              {form.members.length > 0 && (
                <div className="pt-member-pills">
                  {form.members.map((m, i) => (
                    <div key={m} className="pt-member-pill">
                      <span className="pt-pill-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{getInitials(m)}</span>
                      <span>{m}</span>
                      <button className="pt-pill-remove" onClick={() => setForm(f => ({ ...f, members: f.members.filter(x => x !== m) }))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="pt-step">
              <div className="pt-review-card">
                {[['TITLE', form.title],['CATEGORY', form.category],['STATUS', form.status],['TECH', form.tech.join(', ')],['GITHUB', form.github],form.demo && ['DEMO', form.demo],form.members.length > 0 && ['TEAM', form.members.join(', ')]].filter(Boolean).map(([k,v]) => (
                  <div key={k} className="pt-review-row"><span className="pt-review-key">{k}</span><span className="pt-review-val">{v||'—'}</span></div>
                ))}
              </div>
              <p className="pt-review-note">Your project will be submitted for admin approval before appearing on the platform.</p>
            </div>
          )}
        </div>

        <div className="pt-modal-footer">
          <button className="pt-back-btn" onClick={() => step > 0 ? setStep(s => s-1) : onClose()}>{step > 0 ? '← BACK' : 'CANCEL'}</button>
          {step < STEPS.length - 1
            ? <button className={`pt-next-btn ${!canProceed() ? 'pt-disabled' : ''}`} onClick={() => canProceed() && setStep(s => s+1)} disabled={!canProceed()}>NEXT →</button>
            : <button className="pt-submit-btn" onClick={handleSubmit} disabled={loading}>{loading ? 'SUBMITTING...' : 'SUBMIT PROJECT ✓'}</button>
          }
        </div>
      </div>
    </div>
  )
}

// ── Detail Modal with API comments ───────────────────────────
function DetailModal({ project, liked, onLike, onClose, globalProfile }) {
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [authorName, setAuthorName] = useState(globalProfile?.name || '')
  const [commentText, setCommentText] = useState('')
  const [authorError, setAuthorError] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch comments from API
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await apiFetch(`/projects/${project.id}/comments`)
        setComments(data.comments || data || [])
      } catch {
        // Fallback to empty if endpoint doesn't exist yet
        setComments([])
      } finally {
        setLoadingComments(false)
      }
    }
    fetchComments()
  }, [project.id])

  // Close on Escape
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async () => {
    let valid = true
    if (!authorName.trim()) { setAuthorError('Enter your name.'); valid = false } else setAuthorError('')
    if (!commentText.trim() || commentText.trim().length < 5) { setCommentError('Comment too short.'); valid = false } else setCommentError('')
    if (!valid) return

    setSubmitting(true)
    try {
      const payload = { author: authorName.trim(), text: commentText.trim() }
      let newComment
      try {
        const data = await apiFetch(`/projects/${project.id}/comments`, { method: 'POST', body: JSON.stringify(payload) })
        newComment = data.comment || { ...payload, id: `c${Date.now()}`, timestamp: new Date().toISOString(), likes: 0, likedByMe: false }
      } catch {
        // If API doesn't have comments endpoint yet, store locally
        newComment = { ...payload, id: `c${Date.now()}`, timestamp: new Date().toISOString(), likes: 0, likedByMe: false }
      }
      setComments(prev => [newComment, ...prev])
      setCommentText('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCommentLike = async (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, likes: c.likedByMe ? c.likes-1 : c.likes+1, likedByMe: !c.likedByMe } : c))
    try { await apiFetch(`/projects/${project.id}/comments/${id}/like`, { method: 'PUT' }) } catch {}
  }

  const deleteComment = async (id) => {
    setComments(prev => prev.filter(c => c.id !== id))
    try { await apiFetch(`/projects/${project.id}/comments/${id}`, { method: 'DELETE' }) } catch {}
  }

  const members = Array.isArray(project.members) ? project.members : []
  const tags = Array.isArray(project.tags) ? project.tags : (Array.isArray(project.technologiesUsed) ? project.technologiesUsed : [])

  return (
    <div className="pt-overlay" onClick={onClose}>
      <div className="pt-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="pt-close-btn pt-close-float" onClick={onClose}>✕</button>
        <div className="pt-modal-accent" />

        <div className="pt-detail-header">
          <div className="pt-detail-meta">
            <span className={`pt-status-pill ${project.status === 'Ongoing' ? 'pt-ongoing' : 'pt-done'}`}>{project.status}</span>
            <span className="pt-detail-num">#{String(project.id).slice(-3).padStart(3,'0')}</span>
          </div>
          <h2 className="pt-detail-title">{project.title}</h2>
          <p className="pt-detail-desc">{project.description}</p>
        </div>

        {tags.length > 0 && (
          <div className="pt-detail-section">
            <span className="pt-section-label">TECH STACK</span>
            <div className="pt-tag-group">{tags.map(t => <span key={t} className="pt-tech-tag">{t}</span>)}</div>
          </div>
        )}

        {members.length > 0 && (
          <div className="pt-detail-section">
            <span className="pt-section-label">TEAM</span>
            <div className="pt-team-list">
              {members.map((m, i) => (
                <div key={typeof m === 'string' ? m : m.name} className="pt-member-row-detail">
                  <div className="pt-member-av" style={{ background: `hsl(${i*60+10},50%,30%)` }}>{getInitials(typeof m === 'string' ? m : m.name)}</div>
                  <span>{typeof m === 'string' ? m : m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-stats-row">
          <div className="pt-stat"><span className="pt-stat-val">{(project.likes || 0) + (liked ? 1 : 0)}</span><span className="pt-stat-lbl">LIKES</span></div>
          <div className="pt-stat"><span className="pt-stat-val">{project.rating || '—'}</span><span className="pt-stat-lbl">RATING</span></div>
          <div className="pt-stat"><span className="pt-stat-val">{comments.length}</span><span className="pt-stat-lbl">COMMENTS</span></div>
        </div>

        <div className="pt-action-row">
          <button className={`pt-like-btn ${liked ? 'pt-liked' : ''}`} onClick={onLike}>♥ {liked ? 'LIKED' : 'LIKE'}</button>
          {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer" className="pt-gh-btn">GITHUB →</a>}
          {(project.demo || project.deployment) && <a href={project.demo || project.deployment} target="_blank" rel="noopener noreferrer" className="pt-demo-btn">LIVE DEMO →</a>}
        </div>

        <div className="pt-detail-section">
          <div className="pt-comment-header">
            <span className="pt-section-label">FEEDBACK</span>
            {comments.length > 0 && <span className="pt-comment-count">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>}
          </div>
          <div className="pt-comment-form">
            <input className={`pt-input ${authorError ? 'pt-input-err' : ''}`} placeholder="Your name" value={authorName} onChange={e => { setAuthorName(e.target.value); setAuthorError('') }} maxLength={40} />
            {authorError && <p className="pt-error">{authorError}</p>}
            <div style={{ position: 'relative' }}>
              <textarea className={`pt-textarea ${commentError ? 'pt-input-err' : ''}`} placeholder="Leave feedback..." value={commentText} onChange={e => { setCommentText(e.target.value); setCommentError('') }} rows={2} maxLength={500} />
              <span className="pt-char-count">{commentText.length}/500</span>
            </div>
            {commentError && <p className="pt-error">{commentError}</p>}
            <div className="pt-submit-row">
              {submitted && <span className="pt-success">✓ Posted!</span>}
              <button className="pt-submit-comment-btn" onClick={handleSubmit} disabled={submitting}>{submitting ? '...' : 'POST →'}</button>
            </div>
          </div>

          {loadingComments
            ? <p className="pt-loading-comments">Loading comments...</p>
            : comments.length === 0
              ? <div className="pt-no-comments">No comments yet. Be the first.</div>
              : <div className="pt-comment-list">
                  {comments.map((c, i) => (
                    <div key={c.id || i} className="pt-comment-item">
                      <div className="pt-comment-av" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{getInitials(c.author)}</div>
                      <div className="pt-comment-body">
                        <div className="pt-comment-top">
                          <span className="pt-comment-author">{c.author}</span>
                          <span className="pt-comment-time">{timeAgo(c.timestamp || c.createdAt || Date.now())}</span>
                        </div>
                        <p className="pt-comment-text">{c.text || c.content}</p>
                        <div className="pt-comment-actions">
                          <button className={`pt-c-like ${c.likedByMe ? 'pt-c-liked' : ''}`} onClick={() => toggleCommentLike(c.id)}>♥{c.likes > 0 && ` ${c.likes}`}</button>
                          <button className="pt-c-delete" onClick={() => deleteComment(c.id)}>DELETE</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

// ── Main ProjectsTab ──────────────────────────────────────────
export default function ProjectsTab({ globalProfile }) {
  const [projects, setProjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [activeSort, setActiveSort]   = useState('NEWEST')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadOpen, setUploadOpen]   = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [likedIds, setLikedIds]       = useState(new Set())

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const data = await apiFetch('/projects')
        setProjects(data.projects || data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const filtered = useMemo(() => {
    const results = projects.filter(p => {
      const cat = (p.category || '').toUpperCase()
      const status = (p.status || '').toUpperCase()
      const tags = [...(p.tags || []), ...(p.technologiesUsed || [])]
      const matchesFilter = activeFilter === 'ALL' || cat === activeFilter || status === activeFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        tags.some(t => t.toLowerCase().includes(q)) ||
        (p.owner || '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
    switch (activeSort) {
      case 'TOP RATED':  return [...results].sort((a, b) => parseFloat(b.rating||0) - parseFloat(a.rating||0))
      case 'MOST LIKED': return [...results].sort((a, b) => (b.likes||0) - (a.likes||0))
      case 'A-Z':        return [...results].sort((a, b) => (a.title||'').localeCompare(b.title||''))
      default:           return [...results].sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
    }
  }, [projects, activeFilter, activeSort, searchQuery])

  const toggleLike = async (id, e) => {
    e?.stopPropagation()
    setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    try { await apiFetch(`/projects/${id}/like`, { method: 'PUT' }) } catch {}
  }

  const handleSubmit = (newProject) => {
    setProjects(prev => [newProject, ...prev])
  }

  const tags = (p) => [...(p.tags || []), ...(p.technologiesUsed || [])].slice(0, 3)

  return (
    <div className="pt-root">
      {/* ── Header ── */}
      <div className="pt-header">
        <div>
          <p className="pt-eyebrow">PROJECT MODULE</p>
          <h2 className="pt-heading">THE PROJECTS <em>vault.</em></h2>
          <p className="pt-subheading">Code runs in silence — until it doesn't.</p>
        </div>
        <button className="pt-upload-btn" onClick={() => setUploadOpen(true)}>↑ UPLOAD PROJECT</button>
      </div>

      {/* ── Search ── */}
      <div className="pt-search-wrap">
        <span className="pt-search-icon">⌕</span>
        <input className="pt-search-input" placeholder="search by title, tech, member..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {searchQuery && <button className="pt-clear-btn" onClick={() => setSearchQuery('')}>✕</button>}
      </div>

      {/* ── Stats ── */}
      <div className="pt-stats">
        {[
          { label: 'PROJECTS',  value: projects.length },
          { label: 'ONGOING',   value: projects.filter(p => p.status === 'Ongoing').length },
          { label: 'COMPLETED', value: projects.filter(p => p.status === 'Completed').length },
          { label: 'SHOWING',   value: filtered.length },
        ].map(s => (
          <div key={s.label} className="pt-stat-card">
            <span className="pt-stat-card-val">{s.value}</span>
            <span className="pt-stat-card-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="pt-filters">
        <div className="pt-filter-pills">
          {FILTERS.map(f => (
            <button key={f} className={`pt-filter-pill ${activeFilter === f ? 'pt-filter-active' : ''}`} onClick={() => setActiveFilter(f)}>
              {activeFilter === f && <span className="pt-pill-dot" />}{f}
            </button>
          ))}
        </div>
        <div className="pt-sort-pills">
          <span className="pt-sort-label">SORT</span>
          {SORTS.map(s => (
            <button key={s} className={`pt-sort-pill ${activeSort === s ? 'pt-sort-active' : ''}`} onClick={() => setActiveSort(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="pt-results-header">
        <span className="pt-results-label">RESULTS</span>
        <span className="pt-results-count">{filtered.length} PROJECT{filtered.length !== 1 ? 'S' : ''}</span>
        <div className="pt-results-line" />
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="pt-loading">
          <div className="pt-spinner" />
          <p>Loading projects...</p>
        </div>
      ) : error ? (
        <div className="pt-error-state">
          <span className="pt-empty-glyph">⚠</span>
          <p>Failed to load projects: {error}</p>
          <button className="pt-upload-btn" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pt-empty">
          <span className="pt-empty-glyph">∅</span>
          <p>No projects match your search.</p>
        </div>
      ) : (
        <div className="pt-grid">
          {filtered.map(project => (
            <article key={project.id} className={`pt-card ${project.featured ? 'pt-featured' : ''}`} onClick={() => setSelectedProject(project)}>
              <div className="pt-card-accent" />
              {project.featured && <div className="pt-featured-badge"><span className="pt-featured-dot" />FEATURED</div>}
              <span className={`pt-card-status ${project.status === 'Ongoing' ? 'pt-ongoing' : 'pt-done'}`}>{(project.status || 'PENDING').toUpperCase()}</span>
              <span className="pt-card-num">{String(project.id).slice(-3).padStart(3,'0')}.</span>
              <div className="pt-card-content">
                <h3 className="pt-card-title">{project.title}</h3>
                <p className="pt-card-desc">{project.description}</p>
                <div className="pt-card-tags">{tags(project).map(t => <span key={t} className="pt-tag">{t}</span>)}</div>
              </div>
              <div className="pt-card-footer">
                <div className="pt-avatars">
                  {(Array.isArray(project.members) ? project.members : []).slice(0,3).map((m, i) => (
                    <div key={i} className="pt-av" style={{ background: `hsl(${i*60+10},50%,30%)`, zIndex: 3-i }}>
                      {getInitials(typeof m === 'string' ? m : m.name)}
                    </div>
                  ))}
                </div>
                <div className="pt-card-actions">
                  <button className={`pt-card-btn ${likedIds.has(project.id) ? 'pt-card-liked' : ''}`} onClick={e => toggleLike(project.id, e)}>
                    ♥ {(project.likes || 0) + (likedIds.has(project.id) ? 1 : 0)}
                  </button>
                  <span className="pt-card-rating">★ {project.rating || '—'}</span>
                  {project.github && <a href={project.github} className="pt-card-btn" onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer">GH</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onSubmit={handleSubmit} globalProfile={globalProfile} />}
      {selectedProject && (
        <DetailModal
          project={selectedProject}
          liked={likedIds.has(selectedProject.id)}
          onLike={e => toggleLike(selectedProject.id, e)}
          onClose={() => setSelectedProject(null)}
          globalProfile={globalProfile}
        />
      )}
    </div>
  )
}
