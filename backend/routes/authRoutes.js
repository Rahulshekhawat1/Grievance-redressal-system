import express from 'express'
import User from '../models/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

// register (optional)
router.post('/register', async (req,res) => {
  try{
    const { email, password, name } = req.body
    if(!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const existing = await User.findOne({ email })
    if(existing) {
      return res.status(409).json({ error: 'User already exists' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const u = new User({ email, passwordHash, name, role: 'user' })
    await u.save()
    res.status(201).json({ id: u._id, email: u.email, name: u.name, role: u.role })
  }catch(e){
    console.error('Registration error:', e)
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

// login
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body
    if(!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const user = await User.findOne({ email })
    if(!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if(!ok) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    })
  }catch(e){
    console.error('Login error:', e)
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

// debug: show whether users exist (emails only)
router.get('/debug', async (req,res)=>{
  try{
    const users = await User.find({}, 'email').limit(20)
    res.json({ count: users.length, emails: users.map(u=>u.email) })
  }catch(e){ res.status(500).json({ error: e.message }) }
})

// Temporary: reset or create a user's password (for local dev)
// POST { email, password, role? }
router.post('/reset-password', async (req,res)=>{ 
  try{
    const { email, password, role } = req.body
    if(!email || !password) return res.status(400).json({ error: 'Email and password required' })
    let user = await User.findOne({ email })
    const passwordHash = await bcrypt.hash(password, 10)
    if(user){
      user.passwordHash = passwordHash
      if(role && ['user', 'admin'].includes(role)) {
        user.role = role
      }
      await user.save()
      return res.json({ ok:true, message: 'Password updated', user: { email: user.email, role: user.role } })
    }
    user = new User({ 
      email, 
      passwordHash, 
      role: role && ['user', 'admin'].includes(role) ? role : 'user' 
    })
    await user.save()
    return res.status(201).json({ ok:true, message: 'User created', user: { email: user.email, role: user.role } })
  }catch(e){ res.status(500).json({ error: e.message }) }
})

// Create or reset admin account
// POST { type: 'admin' } or empty body
router.post('/setup-accounts', async (req,res)=>{
  try{
    const passwordHash = await bcrypt.hash('password', 10)
    const { type } = req.body
    
    if(type === 'admin' || !type){
      let admin = await User.findOne({ email: 'admin@example.com' })
      if(admin){
        admin.passwordHash = passwordHash
        admin.role = 'admin'
        await admin.save()
      } else {
        admin = new User({ 
          email: 'admin@example.com', 
          passwordHash, 
          name: 'Admin User',
          role: 'admin'
        })
        await admin.save()
      }
    }
    
    res.json({ 
      ok: true, 
      message: 'Accounts setup complete',
      accounts: {
        admin: 'admin@example.com / password'
      }
    })
  }catch(e){ res.status(500).json({ error: e.message }) }
})

export default router
