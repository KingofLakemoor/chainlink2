const users = [
  { id: '1', username: 'Root User', referrerId: undefined },
  { id: '2', username: 'Orphan Root', referrerId: 'nonexistent' },
  { id: '3', username: 'Valid Root', referrerId: '4' },
  { id: '4', username: 'Valid Root Referrer', referrerId: undefined }
];

const referredMap = {};
users.forEach(u => {
  if (u.referrerId) {
    if (!referredMap[u.referrerId]) {
      referredMap[u.referrerId] = [];
    }
    referredMap[u.referrerId].push(u);
  }
});

const usersWithReferrals = users.filter(u => referredMap[u.id] && referredMap[u.id].length > 0);
console.log("usersWithReferrals IDs:", usersWithReferrals.map(u => u.id));

const roots1 = usersWithReferrals.filter(u => !u.referrerId);
console.log("roots1 IDs:", roots1.map(u => u.id));

const roots2 = usersWithReferrals.filter(u => u.referrerId && !users.find(x => x.id === u.referrerId));
console.log("roots2 IDs:", roots2.map(u => u.id));

// What if '4' is missing from users array?
const missingUsers = users.filter(u => u.id !== '4');
const missingMap = {};
missingUsers.forEach(u => {
  if (u.referrerId) {
    if (!missingMap[u.referrerId]) missingMap[u.referrerId] = [];
    missingMap[u.referrerId].push(u);
  }
});
const missingWithRef = missingUsers.filter(u => missingMap[u.id] && missingMap[u.id].length > 0);
console.log("missingWithRef IDs (should NOT contain 4):", missingWithRef.map(u => u.id));

// What if the user "zy6" didn't refer anyone else? But they WERE referred by someone?
// The user says "I referred an individual". So they DID refer someone. So they are in usersWithReferrals!
