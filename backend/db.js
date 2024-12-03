import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountKeyPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
  );
}

const serviceAccountKey = JSON.parse(
  fs.readFileSync(path.resolve(serviceAccountKeyPath), "utf8")
);

initializeApp({
  credential: cert(serviceAccountKey),
});

const db = getFirestore();
export default db;
