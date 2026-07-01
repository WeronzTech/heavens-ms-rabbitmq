import admin from "firebase-admin";
import dotenv from "dotenv";
import FcmToken from "../models/fcmToken.model.js";

dotenv.config();

const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

export const app = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccount),
  },
  "project"
);

export const sendPushNotificationToUser = async (fcmToken, message) => {
  const mes = {
    notification: {
      title: message?.title,
      body: message?.body,
      image:
        message?.image ||
        "https://firebasestorage.googleapis.com/v0/b/heaven-living.appspot.com/o/Ui%2Fappicon.png?alt=media&token=7b583740-481e-4908-8f32-a2344c2d9736",
    },
    webpush: {
      fcm_options: {
        link: "https://dashboard.famto.in/home",
      },
      notification: {
        icon: "https://firebasestorage.googleapis.com/v0/b/heaven-living.appspot.com/o/Ui%2Fappicon.png?alt=media&token=7b583740-481e-4908-8f32-a2344c2d9736",
      },
    },
    token: fcmToken,
  };

  try {
    await admin.messaging(app).send(mes);
    console.log("Push notification sent successfully.");
    return true;
  } catch (error) {
    const errorCode = error.code || (error.errorInfo && error.errorInfo.code);
    console.error(`Error sending push notification to token ${fcmToken ? fcmToken.substring(0, 10) : ""}...: ${errorCode || error.message}`);
    
    // Clean up invalid/unregistered tokens from the database
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token" ||
      error.message === "NotRegistered"
    ) {
      try {
        console.log(`Removing unregistered token ${fcmToken ? fcmToken.substring(0, 10) : ""}... from database.`);
        await FcmToken.updateMany({}, { $pull: { token: fcmToken } });
        await FcmToken.deleteMany({ token: { $size: 0 } });
      } catch (dbErr) {
        console.error("Failed to clean up stale FCM token from database:", dbErr.message);
      }
    }
    return false;
  }
};
