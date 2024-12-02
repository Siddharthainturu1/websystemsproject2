import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

export const uploadToBucket = async (localFilePath, destinationPath) => {
  try {
    const bucket = storage.bucket(bucketName);

    // Upload the file
    await bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata: {
        cacheControl: "no-cache", // Optional: Add metadata as needed
      },
    });

    // Generate a signed URL
    const file = bucket.file(destinationPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week expiration
    });

    return url; // Return the signed URL
  } catch (error) {
    console.error("Error uploading file to Cloud Storage:", error);
    throw error;
  }
};
