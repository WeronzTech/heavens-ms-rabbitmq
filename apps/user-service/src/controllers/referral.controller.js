import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import {
  getUserReferralDetails,
  completeReferral,
} from "../services/referral.service.js";

createResponder(
  USER_PATTERN.REFERRAL.GET_USER_REFERRAL_DETAILS,
  async (data) => {
    return await getUserReferralDetails(data);
  }
);

createResponder(USER_PATTERN.REFERRAL.COMPLETE_REFERRAL, async (data) => {
  return await completeReferral(data);
});

createResponder(USER_PATTERN.REFERRAL.GET_SETTINGS, async () => {
  return await getReferralSettings();
});

createResponder(USER_PATTERN.REFERRAL.UPDATE_SETTINGS, async (data) => {
  return await upsertReferralSettings(data);
});
