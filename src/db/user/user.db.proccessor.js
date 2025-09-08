const User = require("../../models/User");

class userDbClass {
    constructor() {};
    
    async get(id) {
        try {
            const user = await User.findById(id);
            if (!user) {
                throw { message: "user not found", code: 404 };
            }
            return user.toJSON();
        } catch (error) {
            if (error.code) throw error;
            throw { message: "user not found", code: 404 };
        }
    }

    async create(createData) {
        try {
            const user = new User(createData);
            await user.save();
            return {
                _id: user._id,
                email: user.email,
                message: "Please verify your email"
            };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw { 
                    message: `User with this ${field} already exists`, 
                    code: 400,
                    field
                };
            }
            logger.error('Error creating user:', { error });
            throw { 
                message: error.message || "Failed to create user", 
                code: 500 
            };
        }
    }

    async update(uid, updateData) {
        try {
            // Handle $unset operator for OTP data
            if (updateData.$unset && updateData.$unset.otpData) {
                await User.findByIdAndUpdate(uid, { $unset: { otpData: 1 } });
            }

            // Handle regular updates
            const user = await User.findByIdAndUpdate(
                uid, 
                updateData, 
                { new: true, runValidators: true }
            );
            
            if (!user) {
                throw new Error('User not found');
            }
            
            return { 
                success: true, 
                user: {
                    _id: user._id,
                    email: user.email,
                    isVerified: user.isVerified
                }
            };
        } catch (error) {
            logger.error('Error updating user:', { error });
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw { 
                    message: `User with this ${field} already exists`,
                    code: 400,
                    field
                };
            }
            throw { 
                message: error.message || 'Failed to update user',
                code: error.code || 500
            };
        }
    }

     async updatePassword(uid, updateData) {
        try {
            const user = await User.findByIdAndUpdate(uid, updateData, { new: true });
            if (!user) {
                throw { message: "user not found", code: 404 };
            }
            return { success: true };
        } catch (error) {
            if (error.code) throw error;
            throw { message: "user not found", code: 404 };
        }
    }

    async delete(id) {
        try {
            const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
            if (!user) {
                throw { message: "user not found", code: 404 };
            }
            return { message: "user deleted successfully" };
        } catch (error) {
            if (error.code) throw error;
            throw { message: "user not found", code: 404 };
        }
    }
    
    async getByEmail(email) {
        try {
            const user = await User.findOne({ email });
            return user;
        } catch (error) {
            if (error.code) throw error;
            throw { message: "Error finding user by email", code: 500 };
        }
    }
}

module.exports = userDbClass