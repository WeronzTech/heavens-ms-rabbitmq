import emailConfig from "./config/email.config.js";
import pdfService from "./pdf.service.js";
import { renderTemplate } from "./template.service.js";
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

  // NEW METHOD: Send email with attachments
  async sendEmailWithAttachment(
    to,
    subject,
    templateName,
    context = {},
    attachments = []
  ) {
    try {
      const html = await renderTemplate(templateName, context);

      const mailOptions = {
        from: emailConfig.from,
        to,
        subject,
        html,
        attachments: attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email with attachment sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.log(`Email with attachment failed to ${to}: ${error.message}`);
      throw error;
    }
  }

  // Updated Fee Receipt Email with PDF Attachment
  async sendFeeReceiptEmail(userEmail, newPayment) {
    try {
      console.log("Generating PDF receipt for:", userEmail);

      // Generate PDF receipt
      const pdfBuffer = await pdfService.generateFeeReceipt(newPayment);
      console.log("PDF generated successfully");

      // Prepare email context
      const context = {
        name: newPayment.name,
        contact: newPayment.contact,
        amount: newPayment.amount,
        waveOffAmount: newPayment.waveOffAmount,
        transactionId: newPayment.transactionId,
        paymentDate: newPayment.paymentDate,
        paymentMethod: newPayment.paymentMethod,
        paymentForMonths: newPayment.paymentForMonths,
        property: newPayment?.property?.name,
        currentYear: new Date().getFullYear(),
        FRONTEND_URL: process.env.FRONTEND_URL,
      };

      // Create PDF attachment
      const attachments = [
        {
          filename: `receipt-${
            newPayment.transactionId || new Date().getTime()
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      // Send email with PDF attachment
      return await this.sendEmailWithAttachment(
        userEmail,
        "Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        context,
        attachments
      );
    } catch (error) {
      console.error("Error in sendFeeReceiptEmail:", error);
      // Fallback: Send email without attachment if PDF generation fails
      console.log("Falling back to email without attachment");
      return await this.sendEmail(
        userEmail,
        "Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        {
          name: newPayment.name,
          contact: newPayment.contact,
          amount: newPayment.amount,
          waveOffAmount: newPayment.waveOffAmount,
          transactionId: newPayment.transactionId,
          paymentDate: newPayment.paymentDate,
          paymentMethod: newPayment.paymentMethod,
          paymentForMonths: newPayment.paymentForMonths,
          property: newPayment.property,
        }
      );
    }
  }

  async sendDepositFeeReceiptEmail(userEmail, newDeposit) {
    try {
      console.log("Generating PDF receipt for:", userEmail);

      // Generate PDF receipt
      const pdfBuffer = await pdfService.generateFeeReceipt(newDeposit);
      console.log("PDF generated successfully");

      // Prepare email context
      const context = {
        name: newDeposit.name,
        contact: newDeposit.contact,
        amount: newDeposit.amountPaid,
        waveOffAmount: newDeposit.waveOffAmount,
        transactionId: newDeposit.transactionId,
        paymentDate: newDeposit.paymentDate,
        paymentMethod: newDeposit.paymentMethod,
        property: newDeposit.propertyName,
        currentYear: new Date().getFullYear(),
        FRONTEND_URL: process.env.FRONTEND_URL,
        isRefund: true,
      };

      // Create PDF attachment
      const attachments = [
        {
          filename: `receipt-${
            newDeposit.transactionId || new Date().getTime()
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      // Send email with PDF attachment
      return await this.sendEmailWithAttachment(
        userEmail,
        "Deposit Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        context,
        attachments
      );
    } catch (error) {
      console.error("Error in sendFeeReceiptEmail:", error);
      // Fallback: Send email without attachment if PDF generation fails
      console.log("Falling back to email without attachment");
      return await this.sendEmail(
        userEmail,
        "Deposit Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        {
          name: newDeposit.name,
          contact: newDeposit.contact,
          amount: newDeposit.amountPaid,
          waveOffAmount: newDeposit.waveOffAmount,
          transactionId: newDeposit.transactionId,
          paymentDate: newDeposit.paymentDate,
          paymentMethod: newDeposit.paymentMethod,
          property: newDeposit.propertyName,
        }
      );
    }
  }

  async sendBusFeeReceiptEmail(userEmail, newBusFee) {
    try {
      console.log("Generating PDF receipt for:", userEmail);

      // Generate PDF receipt
      const pdfBuffer = await pdfService.generateFeeReceipt(newBusFee);
      console.log("PDF generated successfully");

      // Prepare email context
      const context = {
        name: newBusFee.name,
        contact: newBusFee.contact,
        amount: newBusFee.amountPaid,
        waveOffAmount: newBusFee.waveOffAmount,
        transactionId: newBusFee.transactionId,
        paymentDate: newBusFee.paymentDate,
        paymentMethod: newBusFee.paymentMethod,
        property: newBusFee.propertyName,
        currentYear: new Date().getFullYear(),
        FRONTEND_URL: process.env.FRONTEND_URL,
        isRefund: true,
      };

      // Create PDF attachment
      const attachments = [
        {
          filename: `receipt-${
            newBusFee.transactionId || new Date().getTime()
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      // Send email with PDF attachment
      return await this.sendEmailWithAttachment(
        userEmail,
        "Bus Fee Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        context,
        attachments
      );
    } catch (error) {
      console.error("Error in sendFeeReceiptEmail:", error);
      // Fallback: Send email without attachment if PDF generation fails
      console.log("Falling back to email without attachment");
      return await this.sendEmail(
        userEmail,
        "Bus Fee Payment Receipt - Thank You for Your Payment",
        "feeReceipt",
        {
          name: newBusFee.name,
          contact: newBusFee.contact,
          amount: newBusFee.amountPaid,
          waveOffAmount: newBusFee.waveOffAmount,
          transactionId: newBusFee.transactionId,
          paymentDate: newBusFee.paymentDate,
          paymentMethod: newBusFee.paymentMethod,
          property: newBusFee.propertyName,
        }
      );
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

  async sendPasswordResetEmail(user, resetUrl, expiryHours) {
    return this.sendEmail(user.email, "Reset Your Password", "passwordReset", {
      name: user.name,
      resetUrl,
      expiryHours,
      FRONTEND_URL: process.env.FRONTEND_URL,
      currentYear: new Date().getFullYear(),
    });
  }

  async sendServerDownEmail(serviceName, error) {
    const adminEmail = process.env.EMAIL_FROM; // Need this env var
    const subject = `🚨 ALERT: ${serviceName} is DOWN`;
    const html = `
      <h1>Service Alert</h1>
      <p>The service <strong>${serviceName}</strong> is currently down.</p>
      <p>Error details: ${error}</p>
      <p>Time: ${new Date().toLocaleString()}</p>
    `;

    try {
      const mailOptions = {
        from: emailConfig.from,
        to: adminEmail,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Alert email sent for ${serviceName}`);
    } catch (err) {
      console.error(`Failed to send alert email for ${serviceName}:`, err);
    }
  }
}

export default new EmailService();
