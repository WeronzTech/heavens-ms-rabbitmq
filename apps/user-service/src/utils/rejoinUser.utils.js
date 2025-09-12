export function shouldArchiveCurrentStay(user) {
  return (
    (user.stayDetails && user.stayDetails.roomNumber) ||
    (user.userType === "messOnly" && user.messDetails?.kitchenId)
  );
}

export function createServiceHistoryEntry(user) {
  const baseEntry = {
    userType: user.userType,
    rentType: user.rentType,
    propertyName: user.stayDetails?.propertyName,
    sharingType: user.stayDetails?.sharingType,
    roomNumber: user.stayDetails?.roomNumber,
    nonRefundableDeposit: user.stayDetails?.nonRefundableDeposit,
    refundableDeposit: user.stayDetails?.refundableDeposit,
    depositAmountPaid: user.stayDetails?.depositAmountPaid,
    rent:
      user.stayDetails?.monthlyRent ||
      user.stayDetails?.dailyRent ||
      user.messDetails?.rent,
    reason: user.statusRequest?.reason || "",
  };

  // Add type-specific dates
  if (user.userType === "messOnly") {
    return {
      ...baseEntry,
      kitchenName: user.messDetails?.kitchenName,
      serviceStartDate: user.messDetails?.messStartDate || new Date(),
      serviceEndDate:
        user.vacatedAt || user.messDetails?.messEndDate || new Date(),
    };
  } else if (user.rentType === "daily") {
    return {
      ...baseEntry,
      serviceStartDate: user.stayDetails?.checkInDate || new Date(),
      serviceEndDate:
        user.vacatedAt || user.stayDetails?.checkOutDate || new Date(),
    };
  } else {
    // Monthly resident
    return {
      ...baseEntry,
      serviceStartDate: user.stayDetails?.joinDate || new Date(),
      serviceEndDate: user.vacatedAt || new Date(),
    };
  }
}

export function calculateEndDate(startDate, days = 1) {
  const date = startDate ? new Date(startDate) : new Date();
  date.setDate(date.getDate() + days);
  return date;
}
