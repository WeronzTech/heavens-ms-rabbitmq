// import multer from "multer";
// import {
//   getStorage,
//   ref,
//   uploadBytes,
//   getDownloadURL,
//   deleteObject,
// } from "firebase/storage";
// import { v4 as uuidv4 } from "uuid";
// import sharp from "sharp";

// const storage = getStorage(firebaseApp);

// export const upload = multer({
//   storage: multer.memoryStorage(),

//   fileFilter: (req, file, cb) => {
//     // Allow CSV files of any size
//     if (
//       file.mimetype === "text/csv" ||
//       file.mimetype === "application/vnd.ms-excel"
//     ) {
//       cb(null, true); // Accept CSV files without size limitation
//     } else {
//       cb(null, true); // Accept other files below 1 MB
//     }
//   },
// });

// export const uploadToFirebase = async (
//   file,
//   folderName,
//   originalQuality = false
// ) => {
//   if (!file) {
//     throw new Error("File not found");
//   }
//   const uniqueName = uuidv4();
//   const storageRef = ref(
//     storage,
//     `${folderName}/${uniqueName}-${file.originalname || file.name}`
//   );

//   let fileBuffer;

//   if (file?.mimetype?.startsWith("image/")) {
//     // If it's an image, process it with sharp

//     try {
//       if (originalQuality) {
//         fileBuffer = file.buffer;
//       } else {
//         fileBuffer = await sharp(file.buffer)
//           .resize({ width: 800 })
//           .jpeg({ quality: 100 })
//           .toBuffer();
//       }
//     } catch (err) {
//       throw new Error("Image processing failed");
//     }
//   } else if (
//     file.mimetype === "text/csv" ||
//     file.mimetype === "application/vnd.ms-excel" ||
//     file.mimetype.startsWith("audio/") ||
//     file.mimetype.startsWith("application/pdf")
//   ) {
//     // If it's a CSV, skip sharp and use the original buffer
//     fileBuffer = file.buffer;
//   } else {
//     // For unsupported file types, log and throw an error
//     throw new Error("Unsupported file format");
//   }

//   // Upload file to Firebase
//   await uploadBytes(storageRef, fileBuffer);
//   const downloadURL = await getDownloadURL(storageRef);

//   return downloadURL;
// };

// export const deleteFromFirebase = async (fileUrl) => {
//   const storageRef = ref(storage, fileUrl);
//   try {
//     await deleteObject(storageRef);
//   } catch (error) {
//     if (error.code === "storage/object-not-found") return;
//     throw error;
//   }
// };
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
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
        .resize({ width: 800 })
        .jpeg({ quality: 100 })
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
