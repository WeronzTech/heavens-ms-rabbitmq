export function calculateProfileCompletion(user) {
  let filled = 0;
  let total = 0;

  // ✅ Utility to check if a field is truly filled
  const isFieldFilled = (value) => {
    return (
      value !== null && value !== undefined && value.toString().trim() !== ""
    );
  };

  // Core fields required for all userTypes
  const coreFields = ["name", "email", "contact", "password"];
  total += coreFields.length;
  for (const field of coreFields) {
    if (isFieldFilled(user[field])) filled++;
  }

  // Personal Details (common to all) - 6 fields
  const personalFields = [
    "address",
    "dob",
    "gender",
    "profileImg",
    "aadharFront",
    "aadharBack",
  ];
  const pd = user.personalDetails || {};
  total += personalFields.length;
  for (const field of personalFields) {
    if (isFieldFilled(pd[field])) filled++;
  }

  // User type specific fields
  if (user.userType === "student") {
    // Parents Details - 4 fields
    const parentsFields = ["name", "email", "contact", "occupation"];
    const prd = user.parentsDetails || {};
    total += parentsFields.length;
    for (const field of parentsFields) {
      if (isFieldFilled(prd[field])) filled++;
    }

    // Study Details - 3 fields
    const studyFields = ["course", "yearOfStudy", "institution"];
    const sd = user.studyDetails || {};
    total += studyFields.length;
    for (const field of studyFields) {
      if (isFieldFilled(sd[field])) filled++;
    }
  } else if (user.userType === "worker") {
    // Working Details - 4 fields
    const workingFields = [
      "jobTitle",
      "companyName",
      "location",
      "emergencyContact",
    ];
    const wd = user.workingDetails || {};
    total += workingFields.length;
    for (const field of workingFields) {
      if (isFieldFilled(wd[field])) filled++;
    }
  }
  // For MessOnly and DailyRent, no additional fields beyond personal details

  if (total === 0) return 0; // Avoid divide-by-zero

  const percent = Math.round((filled / total) * 100);
  return percent;
}
