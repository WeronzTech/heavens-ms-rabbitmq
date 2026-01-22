import PettyCash from "../models/pettyCash.model.js";
import Manager from "../models/manager.model.js";
import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { ACCOUNT_SYSTEM_NAMES } from "../../../accounts-service/src/config/accountMapping.config.js";
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

    let pettyCash = await PettyCash.findOne({ manager });

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

export const getPettyCash = async (data = {}) => {
  try {
    const { propertyId, managerId } = data;
    let filter = {};

    if (propertyId && managerId) {
      // both property + manager
      const manager = await Manager.findOne({
        _id: new mongoose.Types.ObjectId(managerId),
        propertyId: new mongoose.Types.ObjectId(propertyId),
      }).select("_id");

      if (!manager) {
        return {
          success: false,
          status: 404,
          message: "Manager not found for this property",
          data: [],
        };
      }
      filter.manager = manager._id;
    } else if (managerId) {
      // only managerId
      filter.manager = new mongoose.Types.ObjectId(managerId);
    } else if (propertyId) {
      // only propertyId → get all managers of this property
      const managers = await Manager.find({
        propertyId: { $in: [new mongoose.Types.ObjectId(propertyId)] },
      }).select("_id");

      filter.manager = { $in: managers.map((m) => m._id) };
    }
    // else: no propertyId & no managerId → return all

    const pettyCashRecords = await PettyCash.find(filter).lean();

    return {
      success: true,
      status: 200,
      data: pettyCashRecords,
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

export const getPettyCashByManager = async (data) => {
  try {
    const { managerId } = data;

    if (!managerId) {
      return {
        success: false,
        status: 400,
        message: "Manager ID is required",
        data: null,
      };
    }

    const pettyCash = await PettyCash.findOne({ manager: managerId }).lean();

    if (!pettyCash) {
      return {
        success: true,
        status: 200,
        message: "No petty cash found for this manager",
        data: {
          inHandAmount: 0,
          inAccountAmount: 0,
          total: 0,
          manager: managerId,
        },
      };
    }

    const { inHandAmount = 0, inAccountAmount = 0, manager } = pettyCash;
    const total = inHandAmount + inAccountAmount;

    return {
      success: true,
      status: 200,
      message: "Petty cash fetched successfully",
      data: {
        inHandAmount,
        inAccountAmount,
        total,
        manager,
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
    const { pettyCashId } = data;
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
