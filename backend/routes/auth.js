import express from "express";
import fetch from "node-fetch";
import {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_REDIRECT_URI,
} from "../config/facebookConfig.js";
import Users from "../models/User.js";

const router = express.Router();

router.get("/facebook", (req, res) => {
  const authURL = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${FACEBOOK_REDIRECT_URI}&scope=email,user_photos`;
  res.redirect(authURL);
});

router.get("/facebook/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error("Authorization code not provided");

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${FACEBOOK_REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token)
      throw new Error("Failed to retrieve access token");

    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`
    );
    const userData = await userResponse.json();
    if (!userData.id || !userData.name)
      throw new Error("Failed to retrieve user data");

    const email = userData.email || `${userData.id}@facebook.com`;
    await Users.doc(userData.id).set({
      name: userData.name,
      email,
      facebookId: userData.id,
    });

    res.redirect(
      `http://localhost:3000/?accessToken=${tokenData.access_token}&userId=${userData.id}`
    );
  } catch (error) {
    console.error("Error during Facebook login:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
