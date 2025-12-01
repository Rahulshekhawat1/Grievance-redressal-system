import express from 'express'
import Grievance from '../models/Grievance.js'
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import path from 'path'
import { fileURLToPath } from 'url'
const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// GET all with optional status filtering
// Users see only their own, Admins see all
// Query examples:
//  GET /?status=resolved
//  GET /?status=resolved,rejected
//  GET /?status=open        (open -> open|pending|missing/null)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query
    // pagination params
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '20', 10)))
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const skip = (page - 1) * limit
    const filter = {}

    // Users can only see their own grievances
    // Admins can see all
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id
    }

    if (status) {
      const requested = status.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

      // If 'open' is requested treat it as open/pending/null
      if (requested.includes('open')) {
        const or = [
          { status: { $regex: /^(open|pending)$/i } },
          { status: { $exists: false } },
          { status: null }
        ]

        // include any other explicitly requested statuses
        const others = requested.filter(s => s !== 'open')
        if (others.length) {
          others.forEach(o => or.push({ status: { $regex: `^${o}$`, $options: 'i' } }))
        }

        filter.$or = or
      } else {
        // match any of the requested statuses (case-insensitive)
        const regexes = requested.map(s => new RegExp(`^${s}$`, 'i'))
        filter.status = { $in: regexes }
      }
    }

    // apply pagination to avoid returning huge result sets
    const query = Grievance.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit)
    const list = await query.exec()

    // include a lightweight total so the client can show paging if needed
    const total = await Grievance.countDocuments(filter)
    res.json({ list, total, page, limit })
  } catch (e) {
    console.error('Error fetching grievances:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST create - requires authentication with file upload support
router.post('/', authenticate, upload.array('files', 5), async (req,res)=> {
  try{
    const { title, description } = req.body
    const files = []
    
    // Process uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        files.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/api/grievances/files/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        })
      })
    }
    
    const g = new Grievance({ 
      title, 
      description,
      files,
      createdBy: req.user._id 
    })
    await g.save()
    await g.populate('createdBy', 'name email')
    res.status(201).json(g)
  }catch(e){ 
    // Clean up uploaded files if grievance creation fails
    if (req.files && req.files.length > 0) {
      const fs = await import('fs')
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path)
        } catch (err) {
          console.error('Error deleting file:', err)
        }
      })
    }
    res.status(400).json({error:e.message}) 
  }
})

// GET aggregated stats must stay above /:id routes to avoid conflicts
router.get('/stats', authenticate, async (req, res) => {
  try {
    const matchStage = {}
    
    // Users can only see their own stats
    // Admins can see all
    if (req.user.role !== 'admin') {
      matchStage.createdBy = req.user._id
    }

    const agg = await Grievance.aggregate([
      { $match: matchStage },
      { $project: { status: { $toLower: { $ifNull: ['$status', 'open'] } } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    const result = agg.reduce((acc, cur) => {
      acc[cur._id] = cur.count
      return acc
    }, {})

    const total = agg.reduce((s, c) => s + c.count, 0)

    res.json({ total, byStatus: result })
  } catch (e) {
    console.error('Error building stats:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET single grievance for tracking (owner or admin)
router.get('/:id', authenticate, authorizeOwnerOrAdmin, async (req,res)=>{
  try{
    const grievance = await Grievance.findById(req.params.id).populate('createdBy','name email')
    if(!grievance){
      return res.status(404).json({ error: 'Grievance not found' })
    }
    res.json(grievance)
  }catch(e){
    res.status(400).json({ error: 'Unable to fetch grievance' })
  }
})

// PATCH status - Only admins can change status
router.patch('/:id/status', authenticate, authorize('admin'), async (req,res)=> {
  try{
    const { id } = req.params
    const { status } = req.body
    const updated = await Grievance.findByIdAndUpdate(
      id, 
      { status, updatedAt: Date.now() }, 
      { new:true }
    ).populate('createdBy', 'name email')
    if (!updated) {
      return res.status(404).json({ error: 'Grievance not found' })
    }
    res.json(updated)
  }catch(e){ res.status(400).json({error:e.message}) }
})

// GET file - serve uploaded files
router.get('/files/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, '../uploads', filename)
    const fs = await import('fs')
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    // Check if user has access to this file (file belongs to their grievance)
    const grievance = await Grievance.findOne({ 
      'files.filename': filename 
    }).populate('createdBy', 'name email')
    
    if (!grievance) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    // Users can only access files from their own grievances, admins can access all
    if (req.user.role !== 'admin' && grievance.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.sendFile(filePath)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE - Only admins can delete, or users can delete their own
router.delete('/:id', authenticate, authorizeOwnerOrAdmin, async (req,res)=> {
  try{
    const grievance = await Grievance.findById(req.params.id)
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' })
    }
    
    // Only admins can delete any grievance, users can only delete their own
    if (req.user.role !== 'admin' && grievance.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // Delete associated files
    if (grievance.files && grievance.files.length > 0) {
      const fs = await import('fs')
      grievance.files.forEach(file => {
        try {
          const filePath = path.join(__dirname, '../uploads', file.filename)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (err) {
          console.error('Error deleting file:', err)
        }
      })
    }
    
    await Grievance.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  }catch(e){ res.status(500).json({error:e.message}) }
})

export default router
