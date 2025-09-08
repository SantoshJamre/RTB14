const userService = require('../../services/userService')

module.exports = async (req, res, next) => {
    try {
        const UserService = new userService();
        const { value } = req.locals
        const result = await UserService.getUser(value)
        return res.status(200).send(result)
    } catch (error) {
        console.error(error)
        if (error.code && error.message) {
            return res.status(error.code).send({ code: error.code, message: error.message })
        }
        res.status(500).send({ message: 'Internan Server error' })
    }
}