import UserModel from '../models/user.model.js'

// Must be used AFTER auth middleware — relies on req.userId being set
// Usage: router.get('/admin/all', auth, adminAuth, controller)
const adminAuth = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select('role status')

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        error:   true,
        success: false,
      })
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        message: 'Account suspended',
        error:   true,
        success: false,
      })
    }

    // FIX: your role enum uses 'Admin' (capital A) not 'admin'
    if (user.role !== 'Admin') {
      return res.status(403).json({
        message: 'Access denied — admins only',
        error:   true,
        success: false,
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
      error:   true,
      success: false,
    })
  }
}

export default adminAuth