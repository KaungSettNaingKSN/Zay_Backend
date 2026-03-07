import jwt from 'jsonwebtoken'

const optionalAuth = (req, res, next) => {
  try {
    // ── Exact same token reading as your auth middleware ──────────────────
    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.split(' ')[1] ||
      req.query.token

    if (!token) {
      req.userId = null
      return next()
    }

    // ── Exact same secret as your auth middleware ─────────────────────────
    const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN)

    // ── Exact same field as your auth middleware: decoded.id ──────────────
    req.userId = decoded.id || null

  } catch {
    // Invalid / expired token — treat as guest, never block
    req.userId = null
  }

  next()
}

export default optionalAuth