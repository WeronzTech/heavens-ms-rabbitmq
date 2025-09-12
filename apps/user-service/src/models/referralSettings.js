import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema({
    level: Number,
    requiredReferrals: Number,
    rewardPerReferral: Number
}, { _id: false });

const referralSettingsSchema = new mongoose.Schema({
    levels: [levelSchema],
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('ReferralSettings', referralSettingsSchema);
