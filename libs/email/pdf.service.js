import PDFDocument from "pdfkit";

class PDFService {
  async generateFeeReceipt(paymentData) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: "A4",
          info: {
            Title: "Payment Receipt - Heavens Living",
            Author: "Heavens Living",
            Subject: "Payment Receipt",
            Creator: "Heavens Living System",
            CreationDate: new Date(),
          },
        });

        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Add content to PDF
        this.addModernHeader(doc);
        this.addReceiptHeader(doc, paymentData);
        this.addCustomerDetails(doc, paymentData);
        this.addPaymentDetails(doc, paymentData);
        this.addModernFooter(doc, paymentData);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addModernHeader(doc) {
    // Company Header with Address
    doc
      .fillColor("#631930")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("HEAVENS LIVING", 50, 50);

    // Company Address
    doc
      .fillColor("#666666")
      .fontSize(10)
      .font("Helvetica")
      .text("92 Sannidhi Layout, Bande Nalla Sandra, Jigani", 50, 80)
      .text("Bommasandra, Bangalore, Karnataka - 560105", 50, 95)
      .text("Phone: +91 8660796594 | Email: heavensliving@gmail.com", 50, 110);

    // Header separator line
    doc
      .moveTo(50, 145)
      .lineTo(550, 145)
      .strokeColor("#631930")
      .lineWidth(1)
      .stroke();
  }

  addReceiptHeader(doc, paymentData) {
    // Receipt Title
    doc
      .fillColor("#333333")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PAYMENT RECEIPT", 50, 160);

    // Columns positions
    const leftCol = 50;
    const middleCol = 250;
    const rightCol = 400;
    let yPos = 190;

    doc.fillColor("#666666").fontSize(10).font("Helvetica");

    // Receipt No
    doc
      .text("Receipt No:", leftCol, yPos)
      .text(
        `${paymentData.receiptNumber || new Date().getTime()}`,
        leftCol + 70,
        yPos
      );

    // Date
    doc.text("Date:", middleCol, yPos).text(
      new Date(paymentData.paymentDate).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      middleCol + 40,
      yPos
    );

    // Time
    doc.text("Time:", rightCol, yPos).text(
      new Date(paymentData.paymentDate).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata", // force IST
      }),
      rightCol + 35,
      yPos
    );

    // Separator line
    doc
      .moveTo(50, yPos + 20)
      .lineTo(550, yPos + 20)
      .strokeColor("#e0e0e0")
      .lineWidth(0.5)
      .stroke();
  }

  addCustomerDetails(doc, paymentData) {
    let yPosition = 240;

    // Section title with background
    doc
      .fillColor("#631930")
      .rect(50, yPosition, 500, 20)
      .fill()
      .fillColor("#ffffff")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("CUSTOMER INFORMATION", 55, yPosition + 6);

    yPosition += 30;

    // Customer details in a clean layout
    const details = [
      { label: "Customer Name:", value: paymentData.name },
      { label: "Contact No:", value: paymentData.contact },
    ];

    if (paymentData.property) {
      details.push({
        label: "Property:",
        value: `Heavens Living - ${
          paymentData?.property?.name || paymentData?.propertyName
        }`,
      });
    }

    details.forEach((detail, index) => {
      const yPos = yPosition + index * 20;
      doc
        .fillColor("#333333")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(detail.label, 50, yPos)
        .font("Helvetica")
        .text(detail.value, 150, yPos);
    });

    yPosition += details.length * 20 + 15;
  }

  addPaymentDetails(doc, paymentData) {
    let yPosition = 340;

    // Payment details header
    doc
      .fillColor("#631930")
      .rect(50, yPosition, 500, 20)
      .fill()
      .fillColor("#ffffff")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("PAYMENT DETAILS", 55, yPosition + 6);

    yPosition += 30;

    // Payment items in table format
    const tableTop = yPosition;
    const itemLeft = 50;
    const amountRight = 550;

    // Table header
    doc
      .fillColor("#333333")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("DESCRIPTION", itemLeft, tableTop)
      .text("AMOUNT", amountRight - 100, tableTop, { align: "right" });

    // Table separator
    doc
      .moveTo(50, tableTop + 12)
      .lineTo(550, tableTop + 12)
      .strokeColor("#e0e0e0")
      .lineWidth(0.5)
      .stroke();

    // Payment amount row
    doc
      .fillColor("#333333")
      .fontSize(10)
      .font("Helvetica")
      .text("Payment Received", itemLeft, tableTop + 25)
      .font("Helvetica-Bold")
      .text(
        `${paymentData.amount || paymentData.amountPaid}`,
        amountRight - 100,
        tableTop + 25,
        {
          align: "right",
        }
      );

    let currentY = tableTop + 45;

    // Additional payment details
    const paymentDetails = [
      { label: "Payment Method:", value: paymentData.paymentMethod },
    ];

    if (paymentData.paymentForMonths) {
      paymentDetails.push({
        label: "Payment Period:",
        value: paymentData.paymentForMonths,
      });
    }

    if (paymentData.transactionId) {
      paymentDetails.push({
        label: "Transaction ID:",
        value: paymentData.transactionId,
      });
    }

    if (paymentData.waveOffAmount && paymentData.waveOffAmount > 0) {
      paymentDetails.push({
        label: "Amount Waived:",
        value: `${paymentData.waveOffAmount}`,
      });
    }

    paymentDetails.forEach((detail) => {
      doc
        .fillColor("#666666")
        .fontSize(9)
        .font("Helvetica")
        .text(detail.label, itemLeft, currentY)
        .text(detail.value, amountRight - 100, currentY, { align: "right" });
      currentY += 15;
    });

    // Total amount section
    currentY += 10;
    doc
      .moveTo(350, currentY)
      .lineTo(550, currentY)
      .strokeColor("#631930")
      .lineWidth(1)
      .stroke();

    currentY += 15;
    doc
      .fillColor("#631930")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("TOTAL AMOUNT PAID", 350, currentY)
      .text(
        `${paymentData.amount || paymentData.amountPaid}`,
        amountRight - 100,
        currentY,
        {
          align: "right",
        }
      );

    // Amount in words
    currentY += 25;
    doc
      .fillColor("#333333")
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Amount in Words: Rupees ${this.numberToWords(
          paymentData.amount || paymentData.amountPaid
        )} only`,
        50,
        currentY
      );
  }

  addModernFooter(doc, paymentData) {
    const yPosition = 700;

    // Thank you message
    doc
      .fillColor("#631930")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Thank you for your payment!", 50, yPosition, { align: "center" });

    // Computer generated notice
    doc
      .fillColor("#666666")
      .fontSize(8)
      .font("Helvetica")
      .text(
        `This is a computer-generated receipt. No signature required. Generated on ${new Date(
          paymentData.paymentDate
        ).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} at ${new Date(paymentData.paymentDate).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        })}`,
        50,
        yPosition + 20,
        { align: "center" }
      );

    // Contact information
    doc.text(
      "For any queries, please contact: heavensliving@gmail.com | +91 8660796594",
      50,
      yPosition + 35,
      { align: "center" }
    );

    // Final separator
    doc
      .moveTo(50, yPosition + 50)
      .lineTo(550, yPosition + 50)
      .strokeColor("#631930")
      .lineWidth(0.5)
      .stroke();

    // Website
    doc
      .fillColor("#631930")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("www.heavensliving.in", 50, yPosition + 60, { align: "center" });
  }

  // Helper function to convert numbers to words (basic implementation)
  // numberToWords(amount) {
  //   const single = [
  //     "",
  //     "One",
  //     "Two",
  //     "Three",
  //     "Four",
  //     "Five",
  //     "Six",
  //     "Seven",
  //     "Eight",
  //     "Nine",
  //   ];
  //   const twoDigits = [
  //     "Ten",
  //     "Eleven",
  //     "Twelve",
  //     "Thirteen",
  //     "Fourteen",
  //     "Fifteen",
  //     "Sixteen",
  //     "Seventeen",
  //     "Eighteen",
  //     "Nineteen",
  //   ];
  //   const tens = [
  //     "",
  //     "",
  //     "Twenty",
  //     "Thirty",
  //     "Forty",
  //     "Fifty",
  //     "Sixty",
  //     "Seventy",
  //     "Eighty",
  //     "Ninety",
  //   ];

  //   if (amount === 0) return "Zero";

  //   const convert = (num) => {
  //     if (num < 10) return single[num];
  //     if (num < 20) return twoDigits[num - 10];
  //     if (num < 100)
  //       return (
  //         tens[Math.floor(num / 10)] + (num % 10 ? " " + single[num % 10] : "")
  //       );
  //     if (num < 1000)
  //       return (
  //         single[Math.floor(num / 100)] +
  //         " Hundred" +
  //         (num % 100 ? " " + convert(num % 100) : "")
  //       );
  //     if (num < 100000)
  //       return (
  //         convert(Math.floor(num / 1000)) +
  //         " Thousand" +
  //         (num % 1000 ? " " + convert(num % 1000) : "")
  //       );
  //     if (num < 10000000)
  //       return (
  //         convert(Math.floor(num / 100000)) +
  //         " Lakh" +
  //         (num % 100000 ? " " + convert(num % 100000) : "")
  //       );
  //     return (
  //       convert(Math.floor(num / 10000000)) +
  //       " Crore" +
  //       (num % 10000000 ? " " + convert(num % 10000000) : "")
  //     );
  //   };

  //   return convert(amount);
  // }

  numberToWords(amount) {
    // Coerce to number and sanitize
    let num = Number(amount);
    if (!isFinite(num) || isNaN(num)) return "Zero";
    // Work only with integers (ignore paise)
    num = Math.floor(Math.abs(num));

    if (num === 0) return "Zero";

    const single = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const twoDigits = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    // Helper to convert numbers < 1000
    const convertHundreds = (n) => {
      let str = "";
      if (n >= 100) {
        const h = Math.floor(n / 100);
        str += single[h] + " Hundred";
        n = n % 100;
        if (n) str += " ";
      }
      if (n >= 20) {
        const t = Math.floor(n / 10);
        str += tens[t];
        if (n % 10) str += " " + single[n % 10];
      } else if (n >= 10) {
        str += twoDigits[n - 10];
      } else if (n > 0) {
        str += single[n];
      }
      return str;
    };

    // Break number into Indian groups: crore, lakh, thousand, remainder
    const parts = [];

    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
      parts.push(convertHundreds(crore) + " Crore");
      num = num % 10000000;
    }

    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
      parts.push(convertHundreds(lakh) + " Lakh");
      num = num % 100000;
    }

    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
      parts.push(convertHundreds(thousand) + " Thousand");
      num = num % 1000;
    }

    if (num > 0) {
      parts.push(convertHundreds(num));
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
}

export default new PDFService();
