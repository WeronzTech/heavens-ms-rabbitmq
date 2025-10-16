import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { createAccountLog } from "./accountsLog.service.js";

// export const manualAddSalary = async (data) => {
//   try {
//     const { employeeId, employeeType,employeeName, salary, date, paidBy,propertyId,paymentMethod } = data;
//     // if (!employeeId || !employeeType || !salary || !date || employeeName || propertyId) {
//     //   return {
//     //     success: false,
//     //     status: 400,
//     //     message:
//     //       "Missing required fields: employeeId, employeeType, salary, date, paidBy,employeeName, propertyId.",
//     //   };
//     // }

//     const newSalaryRecord = await StaffSalaryHistory.create({
//       ...data,
//       salaryPending: salary,
//       status: "pending",
//       remarkType: "MANUAL_ADDITION",
//     });
//     return {
//       success: true,
//       status: 201,
//       message: "Salary record added successfully.",
//       data: newSalaryRecord,
//     };
//   } catch (error) {
//     console.error("Manual Add Salary Service Error:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Internal Server Error",
//       error: error.message,
//     };
//   }
// };

export const manualAddSalary = async (data) => {
  try {
    const {
      employeeId,
      employeeType,
      employeeName,
      salary,
      date,
      paidBy,
      propertyId,
      paymentMethod,
      transactionId,
      advanceSalary,
      remarkType,
    } = data;

    if (remarkType === "ADVANCE_PAYMENT" && advanceSalary > 0) {
      const newSalaryRecord = await StaffSalaryHistory.create({
        employeeId,
        employeeName,
        employeeType,
        propertyId,
        date,
        salary: 0,
        advanceSalary,
        paidAmount: advanceSalary,
        status: "paid",
        remarkType: "ADVANCE_PAYMENT",
        paidBy,
        paymentMethod,
        transactionId,
      });

      await createAccountLog({
        logType: "Salary",
        action: "Payment",
        description: `Advance salary of ₹${advanceSalary} paid to ${employeeName}`,
        amount: -advanceSalary, // Negative as it's an outflow
        propertyId: data.propertyId,
        performedBy: data.paidBy,
        referenceId: newSalaryRecord._id,
      });

      const updatePayload = {
        id: employeeId,
        updates: { $inc: { advanceSalary } },
      };
      if (employeeType === "Staff") {
        await sendRPCRequest(PROPERTY_PATTERN.STAFF.UPDATE_STAFF, {
          staffId: employeeId,
          updateData: { $inc: { advanceSalary } },
        });
      } else if (employeeType === "Manager") {
        await sendRPCRequest(
          CLIENT_PATTERN.MANAGER.EDIT_MANAGER,
          updatePayload
        );
      }

      return {
        success: true,
        status: 201,
        message: "Advance salary recorded successfully.",
        data: newSalaryRecord,
      };
    } else {
      const newSalaryRecord = await StaffSalaryHistory.create({
        ...data,
        salaryPending: salary,
        status: "pending",
        remarkType: "MANUAL_ADDITION",
      });

      await createAccountLog({
        logType: "Salary",
        action: "Create",
        description: `Manually added salary record of ₹${salary} for ${employeeName}`,
        amount: -salary,
        propertyId: data.propertyId,
        performedBy: data.paidBy,
        referenceId: newSalaryRecord._id,
      });
      return {
        success: true,
        status: 201,
        message: "Salary record added successfully.",
        data: newSalaryRecord,
      };
    }
  } catch (error) {
    console.error("Manual Add Salary Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

// export const getAllSalaryRecords = async (filters) => {
//   try {
//     const { employeeId, propertyId, startDate, endDate } = filters;
//     const query = {};

//     if (employeeId) query.employeeId = employeeId;

//     if (startDate && endDate) {
//       query.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       };
//     }

//     if (propertyId) {
//       const [staffResponse, managerResponse] = await Promise.all([
//         sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_STAFF_BY_PROPERTYID, {
//           propertyId,
//         }),
//         sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, { propertyId }),
//       ]);

//       // ✅ Ensure both RPC responses are arrays
//       const staffData = Array.isArray(staffResponse?.data)
//         ? staffResponse.data
//         : Array.isArray(staffResponse?.data?.data)
//         ? staffResponse.data.data
//         : [];

//       const managerData = Array.isArray(managerResponse?.data)
//         ? managerResponse.data
//         : Array.isArray(managerResponse?.data?.data)
//         ? managerResponse.data.data
//         : [];

//       const staffIds = staffData
//         .filter((s) => s.status === "Active")
//         .map((s) => s._id);

//       const managerIds = managerData
//         .filter((m) => m.status === "Active")
//         .map((m) => m._id);

//       const employeeIds = [...staffIds, ...managerIds];

//       if (employeeIds.length === 0) {
//         return {
//           success: true,
//           status: 200,
//           message: "No employees found for this property.",
//           data: [],
//         };
//       }

//       query.employeeId = { $in: employeeIds };
//     }

//     const records = await StaffSalaryHistory.find(query)
//       .populate({
//         path: "employeeId",
//         select: "name staffId managerId",
//       })
//       .populate("paidBy", "name")
//       .sort({ date: -1 });

//     return {
//       success: true,
//       status: 200,
//       message: "Salary records retrieved successfully.",
//       data: records,
//     };
//   } catch (error) {
//     console.error("Get All Salary Records Service Error:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Internal Server Error",
//       error: error.message,
//     };
//   }
// };

export const getAllSalaryRecords = async (filters) => {
  try {
    const {
      propertyId,
      type,
      paymentMethod,
      search,
      month,
      year,
      page = 1,
      limit = 20,
    } = filters;

    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (type) query.employeeType = type;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) query.employeeName = { $regex: search, $options: "i" };

    // Month & year filter using date range
    if (month || year) {
      const now = new Date();
      const filterYear = year || now.getFullYear();
      const filterMonth = month ? month - 1 : 0; // JS months 0-11

      const start = new Date(filterYear, filterMonth, 1, 0, 0, 0, 0);
      const end = month
        ? new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999)
        : new Date(filterYear, 11, 31, 23, 59, 59, 999);

      query.date = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;

    // Fetch paginated records
    const records = await StaffSalaryHistory.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRecords = await StaffSalaryHistory.countDocuments(query);

    // Aggregate total paidAmount
    const totalPaidResult = await StaffSalaryHistory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    const totalPaidAmount =
      totalPaidResult.length > 0 ? totalPaidResult[0].totalPaidAmount : 0;

    return {
      success: true,
      status: 200,
      message: "Salary records retrieved successfully.",
      data: records,
      totalPaidAmount,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  } catch (error) {
    console.error("Get All Salary Records Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
