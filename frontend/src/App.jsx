import React, {useEffect, useState} from 'react'
import axios from 'axios'
import Dashboard from './Dashboard'
import Login from './Login'
import About from './About'

export default function App(){
  const [grievances, setGrievances] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))

  useEffect(()=>{ if(token) axios.defaults.headers.common.Authorization = `Bearer ${token}` }, [token])
  // simple client-side route using History API
  const [route, setRoute] = useState(window.location.pathname || '/')
  useEffect(()=>{
    const onPop = ()=> setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return ()=> window.removeEventListener('popstate', onPop)
  }, [])

  function navigate(path){
    if(window.location.pathname !== path){
      window.history.pushState({}, '', path)
      setRoute(path)
    }
  }

  function fetchList(){
    axios.get('/api/grievances')
      .then(res => setGrievances(res.data))
      .catch(console.error)
  }

  function submit(e){
    e.preventDefault()
    axios.post('/api/grievances', { title, description: desc })
      .then(()=> { setTitle(''); setDesc(''); fetchList() })
      .catch(console.error)
  }

  // login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberEmail'))
  const [fieldErrors, setFieldErrors] = useState({})

  async function login(e){
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    // client-side validation
    const errs = {}
    if(!email) errs.email = 'Email is required'
    else if(!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email'
    if(!password) errs.password = 'Password is required'
    setFieldErrors(errs)
    if(Object.keys(errs).length){ setLoginLoading(false); return }
    try{
      const res = await axios.post('/api/auth/login', { email, password })
      const { token, user } = res.data
      setToken(token)
      setUser(user)
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      // navigate to dashboard on success
      navigate('/dashboard')
    }catch(err){
      const status = err?.response?.status
      if(status === 401) setLoginError('Invalid email or password')
      else setLoginError(err.response?.data?.error || 'Login failed')
    } finally{
      setLoginLoading(false)
    }
  }

  function logout(){
    setToken('')
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common.Authorization
    navigate('/')
  }

  // if user is not authenticated, show the login route or landing
    if(!token){
    if(route === '/about'){
      return <About onBack={() => navigate('/')} />
    }
    if(route !== '/login'){
      // richer landing / hero with topic details and CTA
      return (
        <div className="landing-page">
          <div className="hero-background">
            <div className="gradient-orb orb-1"></div>
            <div className="gradient-orb orb-2"></div>
            <div className="gradient-orb orb-3"></div>
          </div>
          <div className="container hero">
            <div className="hero-inner">
              <div className="hero-content">
                <div className="hero-badge">✨ Modern Grievance Management</div>
                <h1 className="hero-title">
                  <span className="title-gradient">Grievance Tracker</span>
                  <br />
                  Clear, Fast, Transparent
                </h1>
                <p className="hero-subtitle">
                  Submit issues, track progress, and resolve concerns with a simple workflow designed for teams and institutions.
                </p>

                <div className="topics">
                  <div className="topic-card" data-tilt>
                    <div className="topic-icon">📝</div>
                    <strong>Easy Submission</strong>
                    <div className="muted-small">Create grievances quickly with title and description.</div>
                  </div>
                  <div className="topic-card" data-tilt>
                    <div className="topic-icon">📊</div>
                    <strong>Status Tracking</strong>
                    <div className="muted-small">Open, Resolved, or Rejected — stay informed with real-time updates.</div>
                  </div>
                  <div className="topic-card" data-tilt>
                    <div className="topic-icon">⚙️</div>
                    <strong>Admin Actions</strong>
                    <div className="muted-small">Admins can resolve, reject, or re-open items with audit-friendly actions.</div>
                  </div>
                  <div className="topic-card" data-tilt>
                    <div className="topic-icon">📈</div>
                    <strong>Analytics</strong>
                    <div className="muted-small">Dashboard stats and filters help you prioritize work.</div>
                  </div>
                </div>

                <div className="cta-section">
                  <button className="cta-btn" onClick={quickSignIn}>
                    <span>Sign in — Get started</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="cta-btn-secondary" onClick={() => navigate('/about')}>
                    <span>Learn More</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Login initialEmail={localStorage.getItem('rememberEmail') || ''} onLoggedIn={(data)=>{
        const { token, user } = data
        setToken(token)
        setUser(user)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        axios.defaults.headers.common.Authorization = `Bearer ${token}`
        navigate('/dashboard')
      }} />
    )
  }

  function quickSignIn(){
    // navigate to login page instead of auto-signing in
    navigate('/login')
  }
  // Authenticated routes: dashboard
  if(route !== '/dashboard'){
    navigate('/dashboard')
  }

  return (
    <Dashboard user={user} onLogout={logout} />
  )
}
