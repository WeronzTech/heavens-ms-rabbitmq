import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema(
  {
    title: { type: String, required: false }, 
    propertyId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
    },
    image: { type: String, required: true }, 
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

const Carousel= mongoose.model("Carousel", carouselSchema);

export default Carousel;
