import mongoose from "mongoose";
import {
  extractStudentIdFromReferralLink,
  generateReferralLink,
  getReferralLevelAndRewardFromDB,
} from "../utils/referral.utils.js";

export const setupReferralForNewStudent = (student) => {
  const referralLink = generateReferralLink(student._id, student.name);

  student.referralInfo = {
    referralLink: referralLink,
    referralHistory: {
      referredStudents: [],
      lastUsed: null,
    },
    totalReferrals: 0,
    referralEarnings: 0,
    withdrawnAmount: 0,
  };
};

export const handleReferralIfUsed = async (referralLink, newStudentId) => {
  const result = extractStudentIdFromReferralLink(referralLink);
  const studentId = result?.studentId;
  // console.log("studentID", studentId);

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    console.log("Invalid or missing studentId");
    return;
  }

  const [referrer, newStudent] = await Promise.all([
    Student.findById(studentId),
    Student.findById(newStudentId),
  ]);

  // console.log('referrer:', referrer);
  // console.log('newStudent:', newStudent);

  if (!referrer || !newStudent) {
    console.log("Referrer or new student not found");
    return;
  }

  if (studentId === newStudentId.toString()) {
    console.log("Self-referral attempt blocked");
    return;
  }

  // ✅ Optional: Prevent processing twice
  if (newStudent.referralInfo?.isReferralProcessed) {
    console.log("Referral already processed");
    return;
  }

  const existingInfo = referrer.referralInfo || {};
  const currentHistory = existingInfo.referralHistory || {
    referredStudents: [],
    lastUsed: null,
  };

  const updatedReferralHistory = {
    referredStudents: [...currentHistory.referredStudents, newStudent.name],
    lastUsed: new Date(),
  };

  const newTotalReferrals = (existingInfo.totalReferrals || 0) + 1;
  const {reward, level} = await getReferralLevelAndRewardFromDB(
    newTotalReferrals
  );

  referrer.referralInfo = {
    ...existingInfo,
    referralHistory: updatedReferralHistory,
    totalReferrals: newTotalReferrals,
    referralLink: existingInfo.referralLink || "",
    referralEarnings: (existingInfo.referralEarnings || 0) + reward,
    withdrawnAmount: existingInfo.withdrawnAmount || 0,
    level,
  };

  referrer.markModified("referralInfo");

  // ✅ Mark referral as processed on newStudent
  newStudent.referralInfo = {
    ...newStudent.referralInfo,
    isReferralProcessed: true,
  };
  newStudent.markModified("referralInfo");

  await Promise.all([referrer.save(), newStudent.save()]);
  // console.log(newStudent)
  // console.log("Referral processed and saved");
};

export const handleReferralOnApproval = async (student) => {
  console.log(student);
  if (student.referralInfo?.referredByLink) {
    await handleReferralIfUsed(
      student.referralInfo.referredByLink,
      student._id
    );
  }

  if (!student.referralInfo) student.referralInfo = {};

  if (!student.referralInfo.referralLink) {
    student.referralInfo.referralLink = generateReferralLink(
      student._id,
      student.name
    );
  }

  //   student.markModified("referralInfo");
};
