const util = require('../utils/util');
const User = require('../models/User');

const refreshToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        logger.info(`Refresh token header: ${authHeader ? 'present' : 'missing'}`);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                code: 401,
                message: 'Access token required'
            });
        }

        const token = authHeader.substring(7);
        const decoded = util.verifyAccessToken(token);

        const user = await User.findById(decoded.uid).select('-password');

        if (!user) {
            return res.status(401).json({
                code: 401,
                message: 'invalid token'
            });
        }

        return res.status(200).json({
            code: 200,
            message: 'success',
            data: util.refreshToken({ uid: user._id, email: user.email, }, token)
        })
    } catch (error) {
         logger.error('Error in refreshToken middleware:', error)
        return res.status(401).json({
            code: 401,
            message: error.message || 'Invalid token'
        });
    }
};

module.exports = refreshToken;