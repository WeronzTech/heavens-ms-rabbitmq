import { renderTemplate } from "./template.service.js";
import emailConfig from "../../config/email.config.js";
import nodemailer from "nodemailer";
console.log(emailConfig);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendEmail(to, subject, templateName, context = {}) {
    try {
      const html = await renderTemplate(templateName, context);

      const mailOptions = {
        from: emailConfig.from,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      //   logger.info(`Email sent: ${info.messageId}`);
      console.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      //   logger.error(`Email failed to ${to}: ${error.message}`);
      console.log(`Email failed to ${to}: ${error.message}`);
      throw error;
    }
  }

  // Specific email methods
  async sendApprovalEmail(student, verificationToken) {
    const verificationLink = `${
      process.env.BACKEND_URL
    }/api/v2/user/email/verify?token=${verificationToken}&email=${encodeURIComponent(
      student.email
    )}`;

    return this.sendEmail(
      student.email,
      "Your Registration Has Been Approved - Verify Your Email",
      "approval",
      {
        name: student.name,
        verificationLink,
        FRONTEND_URL: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      }
    );
  }

  async sendOnboardingEmail(student) {
    return this.sendEmail(
      student.email,
      "Complete Your Onboarding",
      "onboarding",
      {
        name: student.name,
        loginLink: `${process.env.FRONTEND_URL}/login`,
      }
    );
  }
}

export default new EmailService();
