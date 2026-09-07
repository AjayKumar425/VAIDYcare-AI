const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// Register Doctor or Patient
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, specialization, licenseNumber, age, gender, abhaId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = new User({
      name,
      email,
      password,
      role: role.toUpperCase(),
      phone,
      specialization: role.toUpperCase() === 'DOCTOR' ? specialization : undefined,
      licenseNumber: role.toUpperCase() === 'DOCTOR' ? licenseNumber : undefined,
      age: role.toUpperCase() === 'PATIENT' ? age : undefined,
      gender: role.toUpperCase() === 'PATIENT' ? gender : undefined,
      abhaId: role.toUpperCase() === 'PATIENT' ? abhaId : undefined
    });

    await user.save();
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: `${user.role} registered successfully`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: user.age,
        gender: user.gender
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Login for Doctor or Patient
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (role && user.role !== role.toUpperCase()) {
      return res.status(403).json({ success: false, message: `Access denied. This account is registered as a ${user.role}.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        specialization: user.specialization
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};