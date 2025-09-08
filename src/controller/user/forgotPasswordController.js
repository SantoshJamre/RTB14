const userService = require('../../services/userService')

module.exports = async (req, res, next) => {
    try {
        const UserService = new userService();
        const { value } = req.locals;
        const result = await UserService.forgotPassword(value);
        
        return res.status(200).send({
            ...result,
            email: value.email
        });
    } catch (error) {
        if (error.code && error.message) {
            return res.status(error.code).send({ 
                code: error.code, 
                message: error.message 
            });
        }
        console.error('Error in forgotPasswordController:', error.stack);
        res.status(500).send({ 
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}