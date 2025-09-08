const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendEmail(to, subject, template, data) {
        try {
            const templatePath = path.join(__dirname, '../templates', `${template}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateContent);
            const html = compiledTemplate(data);

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to,
                subject,
                html
            };

            const result = await this.transporter.sendMail(mailOptions);
            return result;
        } catch (error) {
            logger.error(`Email sending error: ${error.message}`, { error });
            // throw error;
            return false
        }
    }




    async sendNewBookNotification(users, book, addedBy) {
        const promises = users
            .filter(user => user && user.email)  // Ensure user has email
            .map(user =>
                this.sendEmail(
                    user.email,
                    'New Book Added to Library',
                    'emails/new-book',
                    {
                        firstName: user.email.split('@')[0] || 'User',
                        bookTitle: book.title,
                        bookAuthor: book.author,
                        addedBy: addedBy ? addedBy.email : 'System',
                        bookCategory: book.category,
                        bookPublishedDate: book.published_date
                    }
                ).catch(err => {
                    console.error(`Failed to send email to ${user.email}:`, err);
                    return null;
                })
            );

        return Promise.allSettled(promises);
    }
}

module.exports = new EmailService();
