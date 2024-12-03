import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

export const uploadToBucket = async (localFilePath, destinationPath) => {
  if (!bucketName) {
    throw new Error(
      "Bucket name is not set. Check your environment variables."
    );
  }

  try {
    const bucket = storage.bucket(bucketName);
    const destination = path.normalize(destinationPath);

    // Upload the file
    await bucket.upload(localFilePath, {
      destination,
      metadata: {
        cacheControl: "no-cache", // Optional: Add metadata as needed
      },
    });

    console.log(`File uploaded to ${destination} in bucket ${bucketName}`);

    // Generate a signed URL
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week expiration
    });

    console.log(`Generated Signed URL: ${url}`);
    return url;
  } catch (error) {
    if (error.code === 403) {
      console.error(
        "Permission denied: Check your service account's permissions."
      );
    } else if (error.code === 404) {
      console.error(
        "Bucket or file not found: Ensure the bucket exists and is accessible."
      );
    } else {
      console.error("Error uploading file to Cloud Storage:", error);
    }
    throw error;
  }
};
