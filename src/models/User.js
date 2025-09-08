const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const otpDataSchema = new Schema({
    type: {
        type: String,
        enum: ['register', 'login', 'forgot-password'],
        default: 'register'
    },
    otp: {
        type: String,
        minlength: 4,
        maxlength: 6,
        match: /^[0-9]+$/
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

    userPassword: {
        hash: String,
        salt: String,
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    userPassword: {
        hash: {
            type: String,
        },
        salt: {
            type: String,
        }
    },
}, { versionKey: false });

const userSchema = new Schema({

    email: {
        type: String,
        index: true,
        unique: true,
        required: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    // Store password hash and salt in a separate field
    userPassword: {
        hash: {
            type: String,
            required: true
        },
        salt: {
            type: String,
            required: true
        }
    },

    otpData: otpDataSchema,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
}, {
    versionKey: false,
    timestamps: true  // automatically handles createdAt and updatedAt
});

// Add pre-save middleware to update the updatedAt field
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;