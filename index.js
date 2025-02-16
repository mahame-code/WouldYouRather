import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDB, initDB } from "./db.js";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static("public"));

initDB();

function hash(str) {
  return crypto
    .createHash("md5")
    .update("4B39BA05-BE1C-4BF3-83CA-20435B48208F" + str)
    .digest("hex");
}

function getRemoteAddress(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  return ip.replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");
}

app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "view/index.html");

  console.log(indexPath);
  res.sendFile(indexPath);
});

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.get("/api/challenges/random", async (req, res) => {
  const db = await getDB();
  const remoteAddress = getRemoteAddress(req);
  let challenge = await db.get(
    `SELECT challenges.* FROM challenges
    WHERE NOT EXISTS
    (
    SELECT 1 FROM votes
    WHERE votes.challenge_id = challenges.id
    AND votes.ip_address = ?
    )
    ORDER BY RANDOM()
    LIMIT 1`,
    [remoteAddress]
  );
  if (!challenge) {
    challenge = await db.get(
      `SELECT challenges.* FROM challenges
    ORDER BY RANDOM()
    LIMIT 1`
      // [remoteAddress]
    );
  }

  res.json(challenge);
});

app.post("/api/challenges/:challengeId/votes", async (req, res) => {
  const { choice } = req.body;
  const { challengeId } = req.params;
  const remoteAddress = getRemoteAddress(req);

  if (choice !== "right" && choice !== "left") {
    res.json({ error: "Invalid vote" });
    return;
  }

  const db = await getDB();

  // Vérifier si l'utilisateur a déjà voté
  const alreadyVoted = await db.get(
    "SELECT ip_address FROM votes WHERE challenge_id = ? AND ip_address = ?",
    [challengeId, remoteAddress]
  );

  if (!alreadyVoted) {
    await db.run(
      `INSERT INTO votes (challenge_id, choice, ip_address) VALUES (?, ?, ?)`,
      [challengeId, choice, remoteAddress]
    );
  }

  // Récupérer les stats en comptant uniquement le premier vote de chaque utilisateur
  const result = await db.get(
    `
    SELECT
    COUNT(DISTINCT first_votes.ip_address) as total_votes,
    SUM(CASE WHEN votes.choice = 'left' THEN 1 ELSE 0 END) as left_votes,
    SUM(CASE WHEN votes.choice = 'right' THEN 1 ELSE 0 END) as right_votes
  FROM (
    SELECT challenge_id, ip_address, MIN(rowid) as first_vote_id
    FROM votes
    WHERE challenge_id = ?
    GROUP BY ip_address
  ) AS first_votes
  JOIN votes ON votes.rowid = first_votes.first_vote_id;`,
    [challengeId]
  );

  res.json({
    total_votes: result.total_votes,
    left_votes: result.left_votes,
    right_votes: result.right_votes,
  });
});

const PORT = process.env.PORT || 3000;
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erreur lors de l'initialisation de la base :", err);
  });
