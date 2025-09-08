const userCntrl = require("./getUserController.js")
const createUserCntrl = require("./createUserController.js")
const loginUserCntrl = require("./loginUserController.js")
const forgotPasswordCntrl = require("./forgotPasswordController.js")

module.exports = {
    user:userCntrl,
    create:createUserCntrl,
    login:loginUserCntrl,
    forgotPassword:forgotPasswordCntrl
}