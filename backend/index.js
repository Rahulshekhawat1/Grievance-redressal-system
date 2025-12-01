import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import grievanceRoutes from './routes/grievanceRoutes.js'
import authRoutes from './routes/authRoutes.js'
import User from './models/User.js'
import bcrypt from 'bcrypt'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

// local logging helpers (avoid global name collisions)
function _safeLog(...args){
  try{
    if(globalThis.console && typeof globalThis.console.log === 'function') return console.log(...args)
  }catch(e){}
  try{ process.stdout.write(args.map(a=>String(a)).join(' ') + '\n') }catch(e){}
}
function _safeError(...args){
  try{
    if(globalThis.console && typeof globalThis.console.error === 'function') return console.error(...args)
  }catch(e){}
  try{ process.stderr.write(args.map(a=>String(a)).join(' ') + '\n') }catch(e){}
}

process.on('uncaughtException', (err)=> {
  try{ process.stderr.write('uncaughtException ' + (err && err.stack ? err.stack : String(err)) + '\n') }catch(e){}
  process.exit(1)
})
process.on('unhandledRejection', (reason)=> {
  try{ process.stderr.write('unhandledRejection ' + (reason && reason.stack ? reason.stack : String(reason)) + '\n') }catch(e){}
})

// routes
app.use('/api/grievances', grievanceRoutes)
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grievance_db'

;(async function start(){
  try{
    await mongoose.connect(MONGODB_URI)
    try{ process.stdout.write('Connected to MongoDB\n') }catch(e){}

    // seed default users - ensure they exist
    try{
      const passwordHash = await bcrypt.hash('password', 10)
      
      // Check and create admin user
      let admin = await User.findOne({ email: 'admin@example.com' })
      if (!admin) {
        admin = new User({ 
          email: 'admin@example.com', 
          passwordHash, 
          name: 'Admin User',
          role: 'admin'
        })
        await admin.save()
        try{ process.stdout.write('Created admin user: admin@example.com / password\n') }catch(e){}
      } else if (admin.role !== 'admin') {
        // Update existing user to admin if they're not already
        admin.role = 'admin'
        admin.passwordHash = passwordHash
        await admin.save()
        try{ process.stdout.write('Updated user to admin: admin@example.com / password\n') }catch(e){}
      }
      
      // Check and create regular user
      let user = await User.findOne({ email: 'user@example.com' })
      if (!user) {
        user = new User({ 
          email: 'user@example.com', 
          passwordHash, 
          name: 'Demo User',
          role: 'user'
        })
        await user.save()
        try{ process.stdout.write('Created user: user@example.com / password\n') }catch(e){}
      }
      
      try{ 
        process.stdout.write('\nDefault login credentials:\n')
        process.stdout.write('  Admin: admin@example.com / password\n')
        process.stdout.write('  User: user@example.com / password\n\n')
      }catch(e){}
    }catch(e){ try{ process.stderr.write('User seed error ' + (e && e.stack ? e.stack : String(e)) + '\n') }catch(_){} }

    app.listen(PORT, ()=> { try{ process.stdout.write('Server listening on ' + PORT + '\n') }catch(e){} })
  }catch(err){
    try{ process.stderr.write('MongoDB connection error ' + (err && err.stack ? err.stack : String(err)) + '\n') }catch(e){}
    process.exit(1)
  }
})()
