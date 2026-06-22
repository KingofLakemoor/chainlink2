const users = [
  { id: 'zy6', username: 'The Admin' }, // User complaining
  { id: 'referred_user', username: 'The Individual', referrerId: 'zy6' }
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
