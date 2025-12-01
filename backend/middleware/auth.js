import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Grievance from '../models/Grievance.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

// Authentication middleware - verifies JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-passwordHash')
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    res.status(500).json({ error: 'Authentication error' })
  }
}

// Role-based access control middleware
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' })
    }

    next()
  }
}

// Check if user owns the resource or is admin/moderator
export const authorizeOwnerOrAdmin = async (req, res, next) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' })
    }

    // Admin can access any grievance
    if (req.user.role === 'admin') {
      return next()
    }

    // User can only access their own grievances
    if (grievance.createdBy.toString() === req.user._id.toString()) {
      return next()
    }

    return res.status(403).json({ error: 'Access denied. You can only access your own grievances.' })
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' })
  }
}

