import { setAdminDbMock, gradePickemMatchups } from './src/services/pickemGrader.js';

let updatedPickemPicks: any[] = [];
const mockPickDoc = {
  id: "pick1",
  ref: { id: "pick1" },
  data: () => ({
    userId: "u1",
    status: "PENDING",
    pick: { teamId: "away" }
  })
};

const mockAdminDb = {
  collection: (name: string) => ({
    where: (field: string, op: string, val: any) => ({
      where: () => ({
        get: async () => ({
          empty: false,
          size: 1,
          docs: [mockPickDoc]
        })
      })
    })
  }),
  runTransaction: async (cb: any) => {
    const transaction = {
      get: async (ref: any) => ({
        exists: true,
        data: () => mockPickDoc.data()
      }),
      update: (ref: any, data: any) => {
        updatedPickemPicks.push(data);
      }
    };
    await cb(transaction);
  }
};

setAdminDbMock(mockAdminDb);

async function run() {
  const matchup = {
    id: "m1",
    status: "STATUS_FINAL",
    type: "SPREAD",
    homeTeam: { id: "home", score: 20 },
    awayTeam: { id: "away", score: 24 },
    metadata: { spread: -5 }
  };

  await gradePickemMatchups([matchup]);

  console.log("Updated Pickem Picks:");
  console.log(updatedPickemPicks);

  if (updatedPickemPicks.length === 0) {
    console.error("Test Failed: No picks updated.");
    process.exit(1);
  }

  if (updatedPickemPicks[0].status !== "WIN") {
    console.error(`Test Failed: Expected WIN, got ${updatedPickemPicks[0].status}.`);
    process.exit(1);
  }
  console.log("Test Passed!");
}

run().catch(console.error);
