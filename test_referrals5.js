const users = [
  { id: 'zy6', username: 'The Admin', referrerId: 'AdminReferrer' }, // Admin was referred
  { id: 'referred_user', username: 'The Individual', referrerId: 'zy6' },
  { id: 'AdminReferrer', username: 'Admin Referrer', referrerId: undefined } // Admin referrer did NOT refer ANYONE else? Wait, they referred zy6.
];
// If I change 'zy6' to 'zy60aD7pqlamDCTN4JjadSxmxhF3'
// In ALL these cases, someone is rendered as root, and 'zy6' is in the tree!
