import mongoose from 'mongoose'

const GrievanceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open','pending','resolved','rejected'], default: 'open' },
  files: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

GrievanceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now()
  }
  next()
})

export default mongoose.model('Grievance', GrievanceSchema)
