import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // e.g., 'residentId'
    seq: { type: Number, default: 1110 } // default value before first increment
});

export default mongoose.model('Counter', counterSchema);
