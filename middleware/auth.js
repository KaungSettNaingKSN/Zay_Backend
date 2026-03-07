import jwt from "jsonwebtoken"

const auth = async(req, res, next) => {
    try {
        const token =
        req.cookies?.accessToken ||
        req.headers?.authorization?.split(" ")[1] || req.query.token;

        if (!token) {
            return res.status(401).json({
                message: "Provide Token"
            })
        }

        const decode = await jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN)

        if (!decode) {
            return res.status(401).json({
                message: 'Unauthorized',
                error: true,
                success: false
            })
        }

        req.userId = decode.id;
        next()
    } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "jwt expired",
        error: true,
        success: false,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
        error: true,
        success: false,
      });
    }

    return res.status(500).json({
      message: error.message || "Server error",
      error: true,
      success: false,
    });
    }
}

export default auth