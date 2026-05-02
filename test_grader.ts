import { adminDb } from './src/lib/firebase-admin.js';
import { gradeSingleMatchup } from './src/services/grader.js';

async function runTest() {
  if (!adminDb) {
    console.error("adminDb not initialized");
    process.exit(1);
  }

  const userId = "testuser_grader_123";
  const matchupId = "test_matchup_123";

  console.log("Setting up test data...");
  await adminDb.collection('users').doc(userId).set({
    coins: 100,
    stats: { wins: 0, losses: 0, pushes: 0 }
  });

  await adminDb.collection('matchups').doc(matchupId).set({
    gameId: matchupId,
    status: 'STATUS_SCHEDULED',
    homeTeam: { id: "home", score: 0 },
    awayTeam: { id: "away", score: 0 },
    cost: 10,
    reward: 20,
    metadata: { lowerScoreWins: false }
  });

  await adminDb.collection('picks').doc(`${userId}_${matchupId}`).set({
    userId,
    matchupId,
    pick: { id: "home" },
    status: 'PENDING',
    coins: 10
  });

  console.log("Updating matchup to STATUS_FINAL with home win...");
  const updatedMatchup = {
    gameId: matchupId,
    status: 'STATUS_FINAL',
    homeTeam: { id: "home", score: 10 },
    awayTeam: { id: "away", score: 5 },
    cost: 10,
    reward: 20,
    metadata: { lowerScoreWins: false }
  };
  await adminDb.collection('matchups').doc(matchupId).set(updatedMatchup);

  console.log("Running grader...");
  await gradeSingleMatchup(updatedMatchup);

  console.log("Checking results...");
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const pickDoc = await adminDb.collection('picks').doc(`${userId}_${matchupId}`).get();

  console.log("User coins:", userDoc.data()?.coins);
  console.log("Pick status:", pickDoc.data()?.status);

  if (userDoc.data()?.coins === 130 && pickDoc.data()?.status === 'WIN') {
    console.log("Test passed!");
  } else {
    console.error("Test failed!");
  }

  process.exit(0);
}

runTest().catch(console.error);
