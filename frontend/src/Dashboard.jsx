import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

function formatFileSize(bytes){
  if(!bytes) return '0 B'
  if(bytes < 1024) return bytes + ' B'
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Dashboard({ user, onLogout }){
  const [grievances, setGrievances] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total:0, byStatus: {} })
  const [activeFilter, setActiveFilter] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [trackingResult, setTrackingResult] = useState(null)
  const [trackingError, setTrackingError] = useState('')
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(()=>{ fetchList(undefined, 1); fetchStats() }, [])

  function fetchList(status, page = 1){
    const params = { limit: 20, page }
    if(status) params.status = status
    axios.get('/api/grievances', { params })
      .then(res => {
        // backend returns { list, total, page, limit }
        const data = res.data && res.data.list ? res.data.list : res.data
        setGrievances(data)
      })
      .catch(console.error)
  }

  function fetchStats(){
    axios.get('/api/grievances/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
  }

  function handleFileChange(e){
    const files = Array.from(e.target.files)
    if(files.length > 5){
      alert('Maximum 5 files allowed')
      return
    }
    setSelectedFiles(files)
  }

  function removeFile(index){
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }


  function submit(e){
    e.preventDefault()
    if(!title || !desc) return
    setLoading(true)
    
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', desc)
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    
    axios.post('/api/grievances', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        // Optional: Add progress tracking if needed
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`Upload progress: ${percentCompleted}%`)
      }
    })
      .then(()=> { 
        setTitle('')
        setDesc('')
        setSelectedFiles([])
        fetchList()
        fetchStats()
      })
      .catch(err => {
        console.error('Error creating grievance:', err)
        alert(err?.response?.data?.error || 'Failed to create grievance')
      })
      .finally(()=> setLoading(false))
  }

  function handleFilter(label){
    const key = label.toLowerCase()
    if(key === 'total'){
      setActiveFilter('')
      fetchList()
    } else {
      const statusParam = key === 'open' ? 'open' : key
      setActiveFilter(key)
      fetchList(statusParam)
    }
  }

  async function changeStatus(id, newStatus){
    if(!id) return
    const ok = window.confirm(`Are you sure you want to mark this grievance as "${newStatus}"?`)
    if(!ok) return
    try{
      await axios.patch(`/api/grievances/${id}/status`, { status: newStatus })
      // refresh list and stats
      fetchList(activeFilter || undefined)
      fetchStats()
    }catch(err){
      console.error('Failed to update status', err)
      alert('Could not update status. See console for details.')
    }
  }

  function handleTrackSubmit(e){
    e.preventDefault()
    const id = trackingId.trim()
    if(!id){
      setTrackingError('Enter a grievance ID to track.')
      setTrackingResult(null)
      return
    }
    fetchTracking(id)
  }

  function handleQuickTrack(id){
    if(!id) return
    setTrackingId(id)
    fetchTracking(id)
  }

  async function fetchTracking(id){
    setTrackingError('')
    setTrackingLoading(true)
    try{
      const res = await axios.get(`/api/grievances/${id}`)
      setTrackingResult(res.data)
    }catch(err){
      const status = err?.response?.status
      if(status === 404){
        setTrackingError('No grievance found with that ID.')
      }else{
        setTrackingError(err?.response?.data?.error || 'Unable to fetch grievance status.')
      }
      setTrackingResult(null)
    }finally{
      setTrackingLoading(false)
    }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="container dashboard">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-icon">📊</div>
            <div>
              <h1 className="dashboard-title">Grievance Dashboard</h1>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px'}}>
                <p className="dashboard-welcome">Welcome back, <strong>{user?.email || user?.name || 'User'}</strong></p>
                {user?.role && (
                  <span className={`role-badge role-${user.role}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            <span>Sign out</span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 7L17 11M17 11L13 15M17 11H7M7 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </header>

      <section className="stats-row">
        {(() => {
          const total = stats.total ?? grievances.length
          const open = stats.byStatus?.open ?? stats.byStatus?.pending ?? grievances.filter(g=> (g.status||'open').toLowerCase() === 'open' || (g.status||'').toLowerCase() === 'pending').length
          const resolved = stats.byStatus?.resolved ?? 0
          const rejected = stats.byStatus?.rejected ?? 0
          const statsList = [
            { label: 'Total', value: total, color: 'linear-gradient(135deg,#60a5fa,#1d4ed8)' },
            { label: 'Open', value: open, color: 'linear-gradient(135deg,#facc15,#f97316)' },
            { label: 'Resolved', value: resolved, color: 'linear-gradient(135deg,#10b981,#059669)' },
            { label: 'Rejected', value: rejected, color: 'linear-gradient(135deg,#fb7185,#ef4444)' }
          ]
          return statsList.map((s, i) => (
            <StatCard key={i} label={s.label} value={s.value} gradient={s.color} active={activeFilter === s.label.toLowerCase()} onClick={() => handleFilter(s.label)} />
          ))
        })()}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel create-panel">
          <div className="panel-header">
            <div className="panel-icon">✍️</div>
            <h3 className="panel-title">Create Grievance</h3>
          </div>
          <form onSubmit={submit} className="dashboard-form">
            <div className="form-field">
              <input 
                className="dashboard-input" 
                placeholder="Enter grievance title..." 
                value={title} 
                onChange={e=>setTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="form-field">
              <textarea 
                className="dashboard-textarea" 
                placeholder="Describe your grievance in detail..." 
                value={desc} 
                onChange={e=>setDesc(e.target.value)} 
                required 
              />
            </div>
            <div className="form-field">
              <label className="file-upload-label">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="file-input"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                />
                <span className="file-upload-btn">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 7V1M13 1H7M13 1L19 7M19 7V17C19 18.1046 18.1046 19 17 19H3C1.89543 19 1 18.1046 1 17V3C1 1.89543 1.89543 1 3 1H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Attach Files (Max 5)
                </span>
              </label>
              {selectedFiles.length > 0 && (
                <div className="file-preview-list">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-preview-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => removeFile(index)}
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="create-btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Create</span>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="dashboard-panel tracker-panel">
          <div className="panel-header">
            <div className="panel-icon">🛰️</div>
            <h3 className="panel-title">Track Grievance Status</h3>
          </div>
          <form className="tracking-form" onSubmit={handleTrackSubmit}>
            <div className="tracking-input-wrap">
              <input
                className="tracking-input"
                placeholder="Enter grievance ID (e.g. 65f1c9...)"
                value={trackingId}
                onChange={e=>{
                  setTrackingId(e.target.value)
                  if(trackingError) setTrackingError('')
                }}
              />
              <button className="tracking-btn" type="submit" disabled={trackingLoading}>
                {trackingLoading ? 'Checking...' : 'Track'}
              </button>
            </div>
          </form>
          {trackingError && (
            <div className="alert alert-error tracking-alert">
              <span className="alert-icon">⚠️</span>
              {trackingError}
            </div>
          )}

          {trackingResult ? (
            <TrackingResultCard grievance={trackingResult} />
          ) : (
            <p className="tracking-placeholder">
              Enter a grievance ID to see live status updates and timestamps.
            </p>
          )}

          {grievances.length > 0 && (
            <div className="quick-track">
              <p className="quick-track-label">Recent grievances</p>
              <div className="quick-track-list">
                {grievances.slice(0,3).map(g=>(
                  <button
                    key={g._id}
                    type="button"
                    className="quick-track-btn"
                    onClick={()=>handleQuickTrack(g._id)}
                  >
                    <span className="quick-track-title">{g.title}</span>
                    <span className="quick-track-id">{g._id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-panel grievances-panel">
          <div className="panel-header">
            <div className="panel-icon">📋</div>
            <h3 className="panel-title">All Grievances</h3>
            {grievances.length > 0 && (
              <span className="grievance-count">{grievances.length}</span>
            )}
          </div>
          {grievances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">No grievances yet — be the first to create one.</p>
            </div>
          ) : (
            <ul className="grievances-list">
              {grievances.map(g => (
                <li className="grievance-card" key={g._id}>
                  <div className="grievance-header">
                    <div style={{flex: 1}}>
                      <strong className="grievance-title">{g.title}</strong>
                      {user?.role === 'admin' && g.createdBy && (
                        <div className="grievance-creator">
                          <span className="creator-label">Created by:</span>
                          <span className="creator-name">{g.createdBy?.name || g.createdBy?.email || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                    <span className={"status-badge "+(g.status?.toLowerCase()||'pending')}>
                      {g.status || 'Pending'}
                    </span>
                  </div>
                  <div className="grievance-id-row">
                    <span className="grievance-id-label">ID:</span>
                    <code className="grievance-id-value">{g._id}</code>
                    <button className="ghost-link" type="button" onClick={()=>handleQuickTrack(g._id)}>
                      Track status
                    </button>
                  </div>
                  <p className="grievance-description">{g.description}</p>
                  {g.files && g.files.length > 0 && (
                    <div className="grievance-files">
                      <p className="files-label">Attachments ({g.files.length}):</p>
                      <div className="files-list">
                        {g.files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13 7V1M13 1H7M13 1L19 7M19 7V17C19 18.1046 18.1046 19 17 19H3C1.89543 19 1 18.1046 1 17V3C1 1.89543 1.89543 1 3 1H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>{file.originalName}</span>
                            <span className="file-size">({formatFileSize(file.size)})</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Only admins can change status */}
                  {user?.role === 'admin' && (
                    <div className="grievance-actions">
                      {(!g.status || ['open','pending'].includes((g.status||'').toLowerCase())) && (
                        <>
                          <button className="action-btn resolve-btn" onClick={()=>changeStatus(g._id,'resolved')}>
                            <span>✓</span>
                            <span>Resolve</span>
                          </button>
                          <button className="action-btn reject-btn" onClick={()=>changeStatus(g._id,'rejected')}>
                            <span>✕</span>
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      {g.status && ['resolved','rejected'].includes((g.status||'').toLowerCase()) && (
                        <button className="action-btn reopen-btn" onClick={()=>changeStatus(g._id,'open')}>
                          <span>↻</span>
                          <span>Re-open</span>
                        </button>
                      )}
                    </div>
                  )}
                  {/* Regular users can only view their own grievances */}
                  {user?.role === 'user' && (
                    <div className="grievance-info">
                      <p className="info-text">Status: <strong>{g.status || 'Pending'}</strong></p>
                      <p className="info-text">Only admins can change grievance status.</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, gradient, onClick, active }){
  const ref = useRef()

  function onMove(e){
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rx = (y - 0.5) * -12
    const ry = (x - 0.5) * 12
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`
    el.style.boxShadow = `${(ry* -1).toFixed(1)}px ${(rx*1).toFixed(1)}px 30px rgba(13, 27, 62, 0.12)`
  }
  function onLeave(){
    const el = ref.current
    el.style.transform = ''
    el.style.boxShadow = ''
  }

  function handleKey(e){
    if(!onClick) return
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div className="stat-card-wrap">
      <div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-pressed={onClick ? !!active : undefined}
        onKeyDown={handleKey}
        onClick={onClick}
        className={"stat-card" + (onClick ? ' clickable' : '')}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{background: gradient, cursor: onClick ? 'pointer' : 'default', outline: active ? '3px solid rgba(255,255,255,0.12)' : undefined}}
      >
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function TrackingResultCard({ grievance }){
  const [copied, setCopied] = useState(false)
  const normalizedStatus = (grievance?.status || 'open').toLowerCase()

  async function copyId(){
    if(!navigator?.clipboard) return
    try{
      await navigator.clipboard.writeText(grievance._id)
      setCopied(true)
      setTimeout(()=>setCopied(false), 1500)
    }catch(err){
      console.error('Failed to copy grievance ID', err)
    }
  }

  return (
    <div className="tracking-result">
      <div className="tracking-result-header">
        <div>
          <p className="result-label">Currently tracking</p>
          <h4 className="result-title">{grievance.title}</h4>
        </div>
        <span className={"status-badge "+normalizedStatus}>
          {grievance.status || 'Open'}
        </span>
      </div>

      <div className="tracking-meta">
        <div className="meta-card">
          <p className="meta-label">Grievance ID</p>
          <button type="button" className="copy-id-btn" onClick={copyId}>
            <code>{grievance._id}</code>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {grievance.files && grievance.files.length > 0 && (
        <div className="tracking-files">
          <p className="files-label">Attachments ({grievance.files.length}):</p>
          <div className="files-list">
            {grievance.files.map((file, idx) => (
              <a
                key={idx}
                href={file.path}
                target="_blank"
                rel="noopener noreferrer"
                className="file-link"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 7V1M13 1H7M13 1L19 7M19 7V17C19 18.1046 18.1046 19 17 19H3C1.89543 19 1 18.1046 1 17V3C1 1.89543 1.89543 1 3 1H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{file.originalName}</span>
                <span className="file-size">({formatFileSize(file.size)})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <StatusTimeline status={normalizedStatus} />
    </div>
  )
}

function StatusTimeline({ status }){
  const normalized = status || 'open'
  const statusInfo = {
    open: { label: 'Open', desc: 'Grievance submitted and awaiting review', icon: '📝' },
    pending: { label: 'Pending', desc: 'Under review by admin', icon: '⏳' },
    resolved: { label: 'Resolved', desc: 'Issue has been resolved', icon: '✅' },
    rejected: { label: 'Rejected', desc: 'Request has been rejected', icon: '❌' }
  }
  
  const current = statusInfo[normalized] || statusInfo.open

  return (
    <div className="status-simple">
      <div className="status-current">
        <span className="status-icon">{current.icon}</span>
        <div className="status-info">
          <p className="status-name">{current.label}</p>
          <p className="status-desc">{current.desc}</p>
        </div>
      </div>
    </div>
  )
}

function formatDate(date){
  if(!date) return '—'
  try{
    return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }catch(_err){
    return date
  }
}
