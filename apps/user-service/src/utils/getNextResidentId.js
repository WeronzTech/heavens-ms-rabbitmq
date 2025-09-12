import counterModal from "../models/counter.modal.js";

export const getNextResidentId = async () => {
  const counter = await counterModal.findByIdAndUpdate(
    {_id: "residentId"},
    {$inc: {seq: 1}},
    {new: true, upsert: true} // create if it doesn't exist
  );

  return `HVNS${counter.seq}`;
};
