const Joi = require("joi")

const loginUserValidator = (req, res, next) => {
    const { body } = req

    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required(),
    })

    try {
        const { error, value } = schema.validate(body);
        if (error) {
            res.status(400).send({ message: error.message })
            return;
        }
        req.locals = { value }
        next();
    }
    catch (err) {
        logger.error(err)
        return res.status(500).send(ErrorCodes[500])
    }
}

const creatUserValidator = (req, res, next) => {
    const { body } = req

    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().min(6).required(),
    })

    if(body.password !== body.confirmPassword){
        res.status(400).send({ message: 'Password and confirm password do not match' })
        return;
    }

    try {
        const { error, value } = schema.validate(body);
        if (error) {
            res.status(400).send({ message: error.message })
            return;
        }
        req.locals = { value }
        next();
    }
    catch (err) {
        logger.error(err)
        return res.status(500).send(ErrorCodes[500])
    }
}

const forgotPasswordValidator = (req, res, next) => {
    const { body } = req

    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required(),
        confirmPassword: Joi.string().required(),
    })

    if(body.password !== body.confirmPassword){
        res.status(400).send({ message: 'Password and confirm password do not match' })
        return;
    }

    try {
        const { error, value } = schema.validate(body);
        if (error) {
            res.status(400).send({ message: error.message })
            return;
        }
        req.locals = { value }
        next();
    }
    catch (err) {
        logger.error(err)
        return res.status(500).send(ErrorCodes[500])
    }
}

module.exports = {
    creatUserValidator,
    loginUserValidator,
    forgotPasswordValidator
}