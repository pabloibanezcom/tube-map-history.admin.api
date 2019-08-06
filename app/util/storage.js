const fs = require('fs');
const UUID = require("uuid-v4");
const fireBaseAdmin = require("firebase-admin");

const serviceAccount = {
  "type": process.env.FIREBASE_ACCOUNT_TYPE,
  "project_id": process.env.FIREBASE_ACCOUNT_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_ACCOUNT_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_ACCOUNT_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_ACCOUNT_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_ACCOUNT_AUTH_URI,
  "token_uri": process.env.FIREBASE_ACCOUNT_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_ACCOUNT_AUTH_PROVIDER_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_ACCOUNT_CLIENT_CERT_URL
}

const getFireBaseBucket = () => {
  fireBaseAdmin.initializeApp({
    credential: fireBaseAdmin.credential.cert(serviceAccount),
    storageBucket: "gs://tube-map-history.appspot.com"
  });
  return fireBaseAdmin.storage().bucket();
}

const bucket = getFireBaseBucket();

const uploadAndGetUrl = async (localFile, remoteFile) => {
  if (!fs.existsSync(localFile)) {
    return null;
  }

  let uuid = UUID();

  const data = await bucket.upload(localFile, {
    destination: `${process.env[`FIREBASE_STORAGE_${process.env.ENVIRONMENT.toUpperCase()}`]}${remoteFile}`,
    uploadType: "media",
    metadata: {
      contentType: 'image/jpg',
      metadata: {
        firebaseStorageDownloadTokens: uuid
      }
    }
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(data[0].name)}?alt=media&token=${uuid}`;
}

module.exports = {
  uploadAndGetUrl
};