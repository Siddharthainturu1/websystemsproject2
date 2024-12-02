import vision from "@google-cloud/vision";

// Initialize Google Vision API Client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export default visionClient;
