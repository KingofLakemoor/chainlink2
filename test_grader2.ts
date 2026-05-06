import { setAdminDbMock, gradeMatchups } from './src/services/grader.js';

let updatedUser: any = null;
let updatedPick: any = null;

const mockPickDoc = {
  id: "pick1",
  ref: { id: "pick1" },
  data: () => ({
    userId: "u1",
    status: "PENDING",
    pick: { id: "home" },
    coins: 10
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
    }),
    doc: (id: string) => ({ id })
  }),
  runTransaction: async (cb: any) => {
    const transaction = {
      get: async (ref: any) => {
        if (ref.id === 'pick1') return { exists: true, data: () => mockPickDoc.data() };
        if (ref.id === 'u1') return { exists: true, data: () => ({ coins: 100, stats: { wins: 0, losses: 0, pushes: 0 }}) };
        return { exists: false };
      },
      update: (ref: any, data: any) => {
        if (ref.id === 'u1') updatedUser = data;
        if (ref.id === 'pick1') updatedPick = data;
      },
      set: () => {}
    };
    await cb(transaction);
  }
};

setAdminDbMock(mockAdminDb);

async function run() {
  const matchup = {
    gameId: "m1",
    status: "STATUS_FINAL",
    type: "SPREAD",
    homeTeam: { id: "home", score: 20 },
    awayTeam: { id: "away", score: 24 },
    metadata: { spread: 4 } // home +4. adjusted home = 24. Tie!
  };

  await gradeMatchups([matchup]);

  console.log("Updated Pick:", updatedPick);

  if (updatedPick.status !== "PUSH") {
    console.error(`Test Failed: Expected PUSH, got ${updatedPick.status}.`);
    process.exit(1);
  }

  if (updatedUser.coins !== 110) {
    console.error(`Test Failed: Expected coins to be refunded to 110, got ${updatedUser.coins}.`);
    process.exit(1);
  }

  console.log("Test Passed!");
}

run().catch(console.error);
