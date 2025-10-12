// import mongoose, { Schema } from "mongoose";

// const staffSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     contactNumber: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//   },
//   { _id: false }
// );

// const agencySchema = new Schema(
//   {
//     agencyName: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     staffs: {
//       type: [staffSchema],
//       default: [],
//     },
//   },
//   { timestamps: true }
// );

// const Agency = mongoose.model("Agency", agencySchema);

// export default Agency;

import mongoose, { Schema } from "mongoose";

const agencySchema = new Schema(
  {
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    hasAgency: {
      type: Boolean,
      default: false,
      required: true,
    },
    agencyName: {
      type: String,
      trim: true,
      unique: true,
      required: function () {
        return this.hasAgency;
      },
    },
    contactNumber: {
      type: String,
      unique: true,
      required: function () {
        return !this.hasAgency;
      },
    },
  },
  { timestamps: true }
);

const Agency = mongoose.model("Agency", agencySchema);

export default Agency;
