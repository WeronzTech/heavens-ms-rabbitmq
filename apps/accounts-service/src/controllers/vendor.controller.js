import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addVendor, editVendor, getAllVendors, getVendorSummary } from "../service/vendor.service.js";

createResponder(ACCOUNTS_PATTERN.VENDOR.ADD_VENDOR, async (data) => {
  return await addVendor(data);
});

createResponder(ACCOUNTS_PATTERN.VENDOR.EDIT_VENDOR, async (data) => {
  return await editVendor(data);
});

createResponder(ACCOUNTS_PATTERN.VENDOR.GET_ALL_VENDORS, async (data) => {
  return await getAllVendors(data);
});

createResponder(ACCOUNTS_PATTERN.VENDOR.GET_VENDOR_SUMMARY, async (data) => {
  return await getVendorSummary(data);
});
