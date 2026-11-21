const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Helper: Generate unique Patient ID ──────────────────────────────────────
// Format: P-YYYYMMDD-XXXX  (e.g. P-20241001-4821)
function generatePatientId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const rand = Math.floor(1000 + Math.random() * 9000);              // 4-digit
  return `P-${datePart}-${rand}`;
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR'], required: true },
  phone: { type: String, default: '' },
  specialization: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  // Unique system-assigned ID for every registered patient (e.g. P-20241001-4821)
  patientId: { type: String, unique: true, sparse: true, default: null },
  // ABHA (Ayushman Bharat Health Account) ID — unique across registered patients
  abhaId: { type: String, unique: true, sparse: true, default: null },
  createdAt: { type: Date, default: Date.now }
});

// ─── Export helper so controllers can reuse it ───────────────────────────────
UserSchema.statics.generatePatientId = generatePatientId;

// Fixed pre-save hook for Mongoose (no next parameter with async/await)
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);