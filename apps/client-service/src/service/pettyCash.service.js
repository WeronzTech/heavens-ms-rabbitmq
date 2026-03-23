import PettyCash from "../models/pettyCash.model.js";
import Manager from "../models/manager.model.js";
import mongoose from "mongoose";
import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
import {ACCOUNTS_PATTERN} from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {ACCOUNT_SYSTEM_NAMES} from "../../../accounts-service/src/config/accountMapping.config.js";
import PettyCashTransaction from "../models/pettyCashTransaction.model.js";

// const ACCOUNT_NAMES_CONST = {
//   PETTY_CASH: "Petty Cash",
//   BANK_ACCOUNT: "Bank Account",
// };

export const addPettyCash = async (data) => {
  try {
    const {
      inHandAmount,
      inAccountAmount,
      manager,
      managerName,
      transactionId,
      date,
      notes,
      createdBy,
      createdByName,
      paymentMode,
    } = data;

    const client = await Manager.findById(manager);
    if (!client) {
      return {
        success: false,
        message: "Manager not found",
        status: 404,
      };
    }

    if (transactionId) {
      const existingExpense = await PettyCashTransaction.findOne({
        transactionId,
      });
      if (existingExpense) {
        return {
          success: false,
          status: 400,
          message: `Transaction ID "${transactionId}" already exists`,
        };
      }
    }

    let pettyCash = await PettyCash.findOne({manager});

    if (!pettyCash) {
      pettyCash = await PettyCash.create({
        manager,
        managerName,
        inHandAmount: 0,
        inAccountAmount: 0,
      });
    }

    // Update balances
    pettyCash.inHandAmount += Number(inHandAmount || 0);
    pettyCash.inAccountAmount += Number(inAccountAmount || 0);
    await pettyCash.save();

    // 🔹 Create transaction record (ledger)
    await PettyCashTransaction.create({
      pettyCash: pettyCash._id,
      manager,
      managerName,
      inHandAmount: Number(inHandAmount || 0),
      inAccountAmount: Number(inAccountAmount || 0),
      balanceAfter: {
        inHandAmount: pettyCash.inHandAmount,
        inAccountAmount: pettyCash.inAccountAmount,
      },
      date,
      transactionId,
      notes,
      referenceId: pettyCash._id,
      referenceType: "PettyCash",
      createdBy,
      createdByName,
      paymentMode,
    });

    const transactions = [];

    if (Number(inHandAmount) > 0) {
      transactions.push(
        {
          systemName: ACCOUNT_SYSTEM_NAMES.ASSET_PETTY_CASH,
          debit: Number(inHandAmount),
        },
        {
          systemName: ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH,
          credit: Number(inHandAmount),
        },
      );
    }

    if (Number(inAccountAmount) > 0) {
      transactions.push(
        {
          systemName: ACCOUNT_SYSTEM_NAMES.ASSET_PETTY_CASH,
          debit: Number(inAccountAmount),
        },
        {
          systemName: ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK,
          credit: Number(inAccountAmount),
        },
      );
    }

    if (transactions.length > 0) {
      try {
        await sendRPCRequest(ACCOUNTS_PATTERN.ACCOUNTING.CREATE_JOURNAL_ENTRY, {
          date: new Date(),
          description: `Petty cash top-up for ${managerName}`,
          // propertyId: property._id || property,
          transactions,
          referenceId: pettyCash._id,
          referenceType: "PettyCash",
        });
      } catch (rpcError) {
        console.error(
          `[ClientService] Failed to create journal entry for petty cash ${pettyCash._id}: ${rpcError.message}`,
        );
      }
    }

    return {
      success: true,
      message: "Petty cash updated successfully",
      status: 200,
      data: {
        id: pettyCash._id,
        inHandAmount: pettyCash.inHandAmount,
        inAccountAmount: pettyCash.inAccountAmount,
        manager: pettyCash.manager,
        managerName: pettyCash.managerName,
        createdAt: pettyCash.createdAt,
        updatedAt: pettyCash.updatedAt,
      },
    };
  } catch (error) {
    console.error("Petty cash service error:", error);

    return {
      success: false,
      message: "Failed to add/update petty cash",
      error: error.message,
      status: 500,
      data: null,
    };
  }
};

// export const getPettyCash = async (data = {}) => {
//   try {
//     const {propertyId, managerId} = data;
//     let filter = {};
//     console.log(data);
//     // 🔹 CASE 1: If managerId is provided
//     if (managerId) {
//       const managerQuery = {
//         _id: new mongoose.Types.ObjectId(managerId),
//       };

//       // If propertyId is also provided, validate manager belongs to property
//       if (propertyId) {
//         managerQuery.propertyId = new mongoose.Types.ObjectId(propertyId);
//       }

//       const manager = await Manager.findOne(managerQuery).select("_id");

//       if (!manager) {
//         return {
//           success: false,
//           status: 404,
//           message: "Manager not found for this property",
//           data: [],
//         };
//       }

//       filter.manager = manager._id;
//     }

//     // 🔹 CASE 2: If NO managerId but propertyId exists
//     else if (propertyId) {
//       const managers = await Manager.find({
//         propertyId: new mongoose.Types.ObjectId(propertyId),
//       }).select("_id");

//       const managerIds = managers.map((m) => m._id);

//       if (managerIds.length === 0) {
//         return {
//           success: true,
//           status: 200,
//           message: "No managers found for this property",
//           data: [],
//         };
//       }

//       filter.manager = {$in: managerIds};
//     }
//     console.log("cxxxxxcxcxxxxxxx");

//     console.log(filter);
//     // 🔹 CASE 3: If neither propertyId nor managerId → return all
//     const pettyCashRecords = await PettyCash.find(filter).lean();

//     return {
//       success: true,
//       status: 200,
//       data: pettyCashRecords,
//     };
//   } catch (error) {
//     console.error("Petty cash fetch error:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Failed to fetch petty cash records",
//       error: error.message,
//       data: null,
//     };
//   }
// };

export const getPettyCash = async (data = {}) => {
  try {
    const {propertyId, managerId} = data;

    let managers = [];

    // 🔹 CASE 1: Specific manager
    if (managerId) {
      const managerQuery = {
        _id: new mongoose.Types.ObjectId(managerId),
      };

      if (propertyId) {
        managerQuery.propertyId = new mongoose.Types.ObjectId(propertyId);
      }

      const manager = await Manager.findOne(managerQuery).select(
        "_id name createdAt updatedAt",
      );

      if (!manager) {
        return {
          success: false,
          status: 404,
          message: "Manager not found for this property",
          data: [],
        };
      }

      managers = [manager];
    }

    // 🔹 CASE 2: Property managers
    else if (propertyId) {
      managers = await Manager.find({
        propertyId: new mongoose.Types.ObjectId(propertyId),
      }).select("_id name createdAt updatedAt");

      if (managers.length === 0) {
        return {
          success: true,
          status: 200,
          message: "No managers found for this property",
          data: [],
        };
      }
    }

    // 🔹 CASE 3: ALL managers (🔥 FIX)
    else {
      managers = await Manager.find({}).select("_id name createdAt updatedAt");
    }
    console.log(managers);
    const managerIds = managers.map((m) => m._id);

    // 🔹 1. TOTAL ADDED
    const added = await PettyCashTransaction.aggregate([
      {
        $match: {
          manager: {$in: managerIds},
        },
      },
      {
        $group: {
          _id: "$manager",
          managerName: {$first: "$name"},
          inHand: {$sum: "$inHandAmount"},
          inAccount: {$sum: "$inAccountAmount"},
          createdAt: {$min: "$createdAt"},
          updatedAt: {$max: "$updatedAt"},
        },
      },
    ]);

    // 🔹 2. FETCH USAGE FROM ACCOUNTS SERVICE
    let usageData = [];

    try {
      usageData = await sendRPCRequest(
        ACCOUNTS_PATTERN.EXPENSE.GET_PETTY_CASH_USAGE,
        {
          managerIds, // 🔥 send all managers instead of single
        },
      );
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      usageData = [];
    }

    // 🔹 Maps
    const addedMap = {};
    added.forEach((a) => {
      addedMap[a._id.toString()] = a;
    });

    const usageMap = {};
    usageData.forEach((u) => {
      usageMap[u.manager] = {
        inHand: u.inHand || 0,
        inAccount: u.inAccount || 0,
      };
    });

    // 🔹 Final response (🔥 includes ALL managers)
    const result = managers.map((manager) => {
      const id = manager._id.toString();

      const addedData = addedMap[id] || {
        inHand: 0,
        inAccount: 0,
        createdAt: manager.createdAt,
        updatedAt: manager.updatedAt,
      };

      const usage = usageMap[id] || {
        inHand: 0,
        inAccount: 0,
      };

      return {
        _id: manager._id,
        manager: manager._id,
        managerName: manager.name,

        inHandAmount: addedData.inHand - usage.inHand,
        inAccountAmount: addedData.inAccount - usage.inAccount,

        createdAt: addedData.createdAt,
        updatedAt: addedData.updatedAt,
        __v: 0,
      };
    });
    console.log(result);
    return {
      success: true,
      status: 200,
      data: result,
    };
  } catch (error) {
    console.error("Petty cash fetch error:", error);

    return {
      success: false,
      status: 500,
      message: "Failed to fetch petty cash records",
      error: error.message,
      data: null,
    };
  }
};

// export const getPettyCashByManager = async (data) => {
//   try {
//     const {managerId} = data;

//     if (!managerId) {
//       return {
//         success: false,
//         status: 400,
//         message: "Manager ID is required",
//         data: null,
//       };
//     }

//     const pettyCash = await PettyCash.findOne({manager: managerId}).lean();

//     if (!pettyCash) {
//       return {
//         success: true,
//         status: 200,
//         message: "No petty cash found for this manager",
//         data: {
//           inHandAmount: 0,
//           inAccountAmount: 0,
//           total: 0,
//           manager: managerId,
//         },
//       };
//     }

//     const {inHandAmount = 0, inAccountAmount = 0, manager} = pettyCash;
//     const total = inHandAmount + inAccountAmount;

//     return {
//       success: true,
//       status: 200,
//       message: "Petty cash fetched successfully",
//       data: {
//         inHandAmount,
//         inAccountAmount,
//         total,
//         manager,
//       },
//     };
//   } catch (error) {
//     console.error("Petty cash service error:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Failed to fetch petty cash",
//       error: error.message,
//       data: null,
//     };
//   }
// };

export const getPettyCashByManager = async (data) => {
  try {
    const {managerId} = data;

    if (!managerId) {
      return {
        success: false,
        status: 400,
        message: "Manager ID is required",
        data: null,
      };
    }

    const managerObjectId = new mongoose.Types.ObjectId(managerId);

    // 🔹 1. TOTAL ADDED (transactions)
    const added = await PettyCashTransaction.aggregate([
      {
        $match: {manager: managerObjectId},
      },
      {
        $group: {
          _id: "$manager",
          inHand: {$sum: "$inHandAmount"},
          inAccount: {$sum: "$inAccountAmount"},
        },
      },
    ]);

    const addedData = added[0] || {
      inHand: 0,
      inAccount: 0,
    };

    // 🔹 2. FETCH USAGE FROM ACCOUNTS SERVICE
    let usage = {
      inHand: 0,
      inAccount: 0,
    };

    try {
      const usageData = await sendRPCRequest(
        ACCOUNTS_PATTERN.EXPENSE.GET_PETTY_CASH_USAGE,
        {managerId},
      );

      if (usageData && usageData.length > 0) {
        usage = {
          inHand: usageData[0].inHand || 0,
          inAccount: usageData[0].inAccount || 0,
        };
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      // fallback → assume no usage
    }

    // 🔹 3. FINAL BALANCE
    const inHandAmount = addedData.inHand - usage.inHand;
    const inAccountAmount = addedData.inAccount - usage.inAccount;
    const total = inHandAmount + inAccountAmount;

    return {
      success: true,
      status: 200,
      message: "Petty cash fetched successfully",
      data: {
        inHandAmount,
        inAccountAmount,
        total,
        manager: managerId,
      },
    };
  } catch (error) {
    console.error("Petty cash service error:", error);

    return {
      success: false,
      status: 500,
      message: "Failed to fetch petty cash",
      error: error.message,
      data: null,
    };
  }
};

export const getPettyCashByIdService = async (data) => {
  try {
    const {pettyCashId} = data;
    const pettyCash = await PettyCash.findById(pettyCashId).select(
      "managerName inHandAmount inAccountAmount",
    );

    if (!pettyCash) {
      return {
        success: false,
        status: 404,
        message: "PettyCash not found",
        data: null,
      };
    }

    return pettyCash;
  } catch (err) {
    return {
      success: false,
      status: 500,
      message: err.message,
      data: null,
    };
  }
};

export const getPettyCashTransactionsByManager = async (data) => {
  try {
    const {managerId} = data;

    if (!managerId) {
      return {
        success: false,
        status: 400,
        message: "Manager ID is required",
        data: null,
      };
    }

    // Validate if manager exists
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return {
        success: false,
        status: 404,
        message: "Manager not found",
        data: null,
      };
    }

    // Get petty cash record for this manager
    const pettyCash = await PettyCash.findOne({manager: managerId});

    if (!pettyCash) {
      return {
        success: true,
        status: 200,
        message: "No petty cash transactions found for this manager",
        data: [],
      };
    }

    // Fetch all transactions for this manager, sorted by date (newest first)
    const transactions = await PettyCashTransaction.find({manager: managerId})
      .sort({date: -1, createdAt: -1})
      .lean();

    // Format the response
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction._id,
      pettyCashId: transaction.pettyCash,
      managerId: transaction.manager,
      managerName: transaction.managerName,
      inHandAmount: transaction.inHandAmount,
      inAccountAmount: transaction.inAccountAmount,
      balanceAfter: transaction.balanceAfter,
      paymentMode: transaction.paymentMode,
      date: transaction.date,
      transactionId: transaction.transactionId,
      notes: transaction.notes,
      referenceId: transaction.referenceId,
      referenceType: transaction.referenceType,
      createdBy: transaction.createdBy,
      createdByName: transaction.createdbyName, // Note: field name mismatch - createdbyName in schema
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));

    const managerObjectId = new mongoose.Types.ObjectId(managerId);

    const added = await PettyCashTransaction.aggregate([
      {
        $match: {manager: managerObjectId},
      },
      {
        $group: {
          _id: "$manager",
          inHand: {$sum: "$inHandAmount"},
          inAccount: {$sum: "$inAccountAmount"},
        },
      },
    ]);

    const addedData = added[0] || {
      inHand: 0,
      inAccount: 0,
    };

    let usage = {
      inHand: 0,
      inAccount: 0,
    };

    try {
      const usageData = await sendRPCRequest(
        ACCOUNTS_PATTERN.EXPENSE.GET_PETTY_CASH_USAGE,
        {managerId},
      );

      if (usageData && usageData.length > 0) {
        usage = {
          inHand: usageData[0].inHand || 0,
          inAccount: usageData[0].inAccount || 0,
        };
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      // fallback → assume no usage
    }

    const inHandAmount = addedData.inHand - usage.inHand;
    const inAccountAmount = addedData.inAccount - usage.inAccount;
    const total = inHandAmount + inAccountAmount;

    return {
      success: true,
      status: 200,
      message: "Petty cash transactions fetched successfully",
      data: {
        managerId,
        managerName: manager.name || transactions[0]?.managerName,
        pettyCashId: pettyCash._id,
        currentBalance: {
          inHandAmount: inHandAmount,
          inAccountAmount: inAccountAmount,
          total: total,
        },
        transactions: formattedTransactions,
        count: transactions.length,
      },
    };
  } catch (error) {
    console.error("Petty cash transactions fetch error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch petty cash transactions",
      error: error.message,
      data: null,
    };
  }
};
