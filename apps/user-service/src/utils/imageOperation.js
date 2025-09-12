import multer from "multer";
import sharp from "sharp";
import {v4 as uuidv4} from "uuid";
import admin from "../config/firebase.js";

// Use the Admin SDK Storage instance
const bucket = admin.storage().bucket();

// Multer config
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "text/csv",
      "application/vnd.ms-excel",
      "application/pdf",
      "audio/mpeg",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format"), false);
    }
  },
});

// Upload Function
export const uploadToFirebase = async (
  file,
  folderName,
  originalQuality = false
) => {
  if (!file) {
    throw new Error("No file provided");
  }

  const uniqueName = `${uuidv4()}-${file.originalname}`;
  const destination = `${folderName}/${uniqueName}`;
  let bufferToUpload = file.buffer;

  // Compress image if not keeping original
  if (file.mimetype.startsWith("image/") && !originalQuality) {
    try {
      bufferToUpload = await sharp(file.buffer)
        .resize({width: 800})
        .jpeg({quality: 100})
        .toBuffer();
    } catch (err) {
      throw new Error("Image processing failed");
    }
  }

  const fileUpload = bucket.file(destination);
  await fileUpload.save(bufferToUpload, {
    metadata: {
      contentType: file.mimetype,
    },
    public: true,
  });

  // Get public URL
  const downloadURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  return downloadURL;
};

// Delete Function
export const deleteFromFirebase = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const url = new URL(fileUrl);
    const filePath = decodeURIComponent(
      url.pathname.replace(`/${bucket.name}/`, "")
    );
    const file = bucket.file(filePath);
    await file.delete();
  } catch (error) {
    if (error.code === 404) return; // Ignore not found
    throw error;
  }
};
