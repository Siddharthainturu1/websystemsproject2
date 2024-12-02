import express from "express";
import fetch from "node-fetch";
import visionClient from "../config/googleVisionConfig.js";
import Photo from "../models/photo.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadToBucket } from "../config/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the temp directory exists
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    const { accessToken, userId } = req.body;
    if (!accessToken || !userId)
      throw new Error("Access token and user ID are required");

    const albumsResponse = await fetch(
      `https://graph.facebook.com/v12.0/me?fields=albums{photos{images}}&access_token=${accessToken}`
    );
    const albumsData = await albumsResponse.json();
    const thematicCategories = {
      Adventures: ["hiking", "swimming", "camping"],
      Celebrations: ["birthday", "wedding", "party"],
    };

    const photoAnalysisPromises = albumsData.albums.data.flatMap(
      (album) =>
        album.photos?.data?.map(async (photo) => {
          const photoUrl = photo.images[0]?.source;
          if (!photoUrl) {
            console.warn(`Photo ID: ${photo.id} has no valid image URL`);
            return null;
          }

          // Check if the photo already exists in the database
          const existingPhoto = await Photo.where("url", "==", photoUrl)
            .where("userId", "==", userId)
            .get();

          if (!existingPhoto.empty) {
            console.log(`Skipping duplicate photo: ${photoUrl}`);

            return null; // Skip this photo
          }

          const tempFilePath = path.join(tempDir, `${photo.id}.jpg`);
          try {
            const response = await fetch(photoUrl);
            if (!response.ok) {
              console.error(`Failed to download photo: ${photo.id}`);
              return null;
            }
            const buffer = await response.buffer();
            fs.writeFileSync(tempFilePath, buffer);

            const cloudUrl = await uploadToBucket(
              tempFilePath,
              `photos/${photo.id}.jpg`
            );

            const [result] = await visionClient.annotateImage({
              image: { source: { imageUri: cloudUrl } },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "LANDMARK_DETECTION", maxResults: 5 },
                { type: "FACE_DETECTION" },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
              ],
            });

            const labels =
              result.labelAnnotations?.map((label) => label.description) || [];
            const landmarks =
              result.landmarkAnnotations?.map(
                (landmark) => landmark.description
              ) || [];
            const emotions =
              result.faceAnnotations?.map((face) => ({
                joy: face.joyLikelihood,
                sorrow: face.sorrowLikelihood,
                anger: face.angerLikelihood,
                surprise: face.surpriseLikelihood,
              })) || [];
            const objects =
              result.localizedObjectAnnotations?.map((object) => object.name) ||
              [];

            const category = Object.entries(thematicCategories).find(
              ([key, keywords]) =>
                labels.some((label) =>
                  keywords.includes(label.toLowerCase())
                ) ||
                objects.some((object) =>
                  keywords.includes(object.toLowerCase())
                )
            )?.[0];

            const savedPhoto = {
              userId,
              url: cloudUrl,
              labels,
              landmarks,
              emotions,
              category: category || "Uncategorized",
              date: photo.date,
            };
            await Photo.add(savedPhoto); // Filter out photos without a valid date
            const validDatePhotos = allPhotos.filter(
              (photo) => photo.date && !isNaN(new Date(photo.date).getTime())
            );
            // console.log("Saved Photo Data:", savedPhoto);

            return savedPhoto;
          } catch (err) {
            console.error(`Error processing photo ID: ${photo.id}`, err);
            return null;
          } finally {
            if (fs.existsSync(tempFilePath)) {
              try {
                fs.unlinkSync(tempFilePath);
              } catch (deleteErr) {
                console.error(
                  `Failed to delete temp file: ${tempFilePath}`,
                  deleteErr
                );
              }
            }
          }
        }) || []
    );

    const analyzedPhotos = await Promise.all(photoAnalysisPromises);
    res.json({ photos: analyzedPhotos.filter(Boolean) });
    console.log("Analyzed Photos:", analyzedPhotos.filter(Boolean));
  } catch (error) {
    console.error("Error analyzing photos:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/getAnalyzedPhotos", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) throw new Error("User ID is required");

    const photos = await Photo.where("userId", "==", userId).get();
    const formattedPhotos = photos.docs.map((doc) => doc.data());

    const emotionGroups = {
      surprise: [],
      sorrow: [],
      joy: [],
      neutral: [],
    };

    const thematicGroups = {};

    formattedPhotos.forEach((photo) => {
      // Group by emotions
      const emotions = photo.emotions || [];
      let added = false;

      emotions.forEach((emotion) => {
        if (
          !added &&
          (emotion.surprise === "VERY_LIKELY" || emotion.surprise === "LIKELY")
        ) {
          emotionGroups.surprise.push(photo);
          added = true;
        } else if (
          !added &&
          (emotion.sorrow === "VERY_LIKELY" || emotion.sorrow === "LIKELY")
        ) {
          emotionGroups.sorrow.push(photo);
          added = true;
        } else if (
          !added &&
          (emotion.joy === "VERY_LIKELY" || emotion.joy === "LIKELY")
        ) {
          emotionGroups.joy.push(photo);
          added = true;
        }
      });

      if (!added) emotionGroups.neutral.push(photo);

      // Group by thematic category
      const { category } = photo;
      if (!thematicGroups[category]) {
        thematicGroups[category] = [];
      }
      thematicGroups[category].push(photo);
    });

    res.json({
      photos: emotionGroups,
      thematicGroups,
    });
    // console.log("Grouped Photos:", emotionGroups);
  } catch (error) {
    console.error("Error fetching analyzed photos:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
