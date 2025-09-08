const { DataTypes } = require('sequelize');

function createBookModel(sequelize) {
    return sequelize.define('Book', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    pdf_url: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
        }
    },
    published_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'English'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
}, {
    tableName: 'books',
    timestamps: true,
    indexes: [
        {
            fields: ['title']
        },
        {
            fields: ['author']
        },
        {
            fields: ['category']
        },
        {
            fields: ['published_date']
        }
    ]
    });
}

module.exports = createBookModel;
