const util = require('../utils/util');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        logger.info(`Auth header: ${authHeader ? 'present' : 'missing'}`);
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
                message: 'User not found or inactive'
            });
        }

        req.user = {
            uid: user._id,
            email: user.email,
        }
        next();
    } catch (error) {
        return res.status(401).json({
            code: 401,
            message: error.message || 'Invalid token'
        });
    }
};


module.exports = {
    authenticate,
};
