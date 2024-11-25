/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {generateHint} = require("./src/services/openaiService");
const {players} = require("./src/data/players");
require("dotenv").config();

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * Resets the daily players by selecting 5 random players and generating hints
 * @return {Promise<Object>} A promise that resolves with the operation result
 */
async function resetDailyPlayersLogic() {
  try {
    console.log("Starting daily player reset");
    console.log("Number of players available:", players.length);

    // Shuffle all players and take first 5 (same method as original app)
    const selectedPlayers = [...players]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    console.log("Selected players:", selectedPlayers.map((p) => p.name));
    console.log("OpenAI API Key present:", !!openaiApiKey.value());

    // Generate hints for each player
    const playerHints = await Promise.all(
        selectedPlayers.map(async (player) => {
          console.log("Generating hint for player:", player.name);
          try {
            const hint = await generateHint(player, openaiApiKey.value());
            console.log("Generated hint for", player.name, ":", hint);
            return {player, hint};
          } catch (error) {
            console.error("Error generating hint for", player.name, ":", error);
            throw error;
          }
        }),
    );

    console.log("Generated all hints");

    // Store in Firestore
    const db = admin.firestore();
    const data = {
      players: playerHints,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    console.log("Storing data in Firestore:", JSON.stringify(data, null, 2));

    await db.collection("dailyPlayers").doc("current").set(data);

    console.log("Successfully reset daily players");
    return {success: true, message: "Daily players reset successfully"};
  } catch (error) {
    console.error("Error resetting daily players:", error);
    throw error;
  }
}

// Scheduled function (runs at midnight ET)
exports.resetDailyPlayers = onSchedule({
  schedule: "0 0 * * *", // Run at midnight ET
  region: "us-east1",
  secrets: [openaiApiKey],
}, async (event) => {
  return resetDailyPlayersLogic();
});

// HTTP function for manual testing
exports.resetDailyPlayersManual = onRequest({
  region: "us-east1",
  secrets: [openaiApiKey],
  invoker: "public", // Allow public access for testing
  timeoutSeconds: 300, // Increase timeout to 5 minutes
}, async (req, res) => {
  try {
    const result = await resetDailyPlayersLogic();
    res.json(result);
  } catch (error) {
    console.error("Error in HTTP handler:", error);
    res.status(500).json({
      error: "Failed to reset daily players",
      message: error.message,
      stack: error.stack,
    });
  }
});
