import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

// Load the service account key from the file specified in the environment variable
const serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountKeyPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set"
  );
}

// Read and parse the service account key
const serviceAccountKey = JSON.parse(
  fs.readFileSync(path.resolve(serviceAccountKeyPath), "utf8")
);

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccountKey),
});

// Export Firestore instance
const db = getFirestore();
export default db;
