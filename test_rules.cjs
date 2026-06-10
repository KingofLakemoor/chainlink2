const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'chainlink-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  const authedDb = testEnv.authenticatedContext('user123').firestore();

  // Test read users
  try {
    await assertFails(unauthedDb.collection('users').doc('user456').get());
    console.log("Unauthed read users: FAIL (Expected)");
  } catch (e) { console.error(e); }

  try {
    await assertSucceeds(authedDb.collection('users').doc('user456').get());
    console.log("Authed read users: SUCCESS (Expected)");
  } catch (e) { console.error(e); }

  await testEnv.cleanup();
}

run();
