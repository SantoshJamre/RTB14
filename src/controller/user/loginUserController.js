const userService = require('../../services/userService');
const logger = require('../../../src/utils/logger'); // Adjust path as needed

module.exports = async (req, res, next) => {
    try {
        const UserService = new userService();
        const { value } = req.locals;
        const result = await UserService.loginUser(value);
        
        // Store user in session
        req.session.user = {
            id: result.userId,
            email: value.email,
            // Add any other user data you want to store in the session
        };
        
        // Save the session
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) reject(err);
                resolve();
            });
        });
        
        // Include email and redirect URL in the response
        return res.status(200).send({
            ...result,
            email: value.email,
            redirectTo: '/books' // Redirect to books page after login
        });
        
    } catch (error) {
        if (error.code && error.message) {
            return res.status(error.code).send({ 
                code: error.code, 
                message: error.message 
            });
        }
        logger.error('Error in loginUserController:', { error: error.stack });
        res.status(500).send({ 
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};