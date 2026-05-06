import json
import itertools

# We have 12 groups A-L
groups = "ABCDEFGHIJKL"

# There are 8 best 3rd placed teams out of 12
# We have 495 combinations, which is exactly "12 choose 8" = 495
# This means each option row corresponds to a specific combination of 8 groups.

with open('src/services/worldCupCombinations.json', 'r') as f:
    combs = json.load(f)

# The matches that take a 3rd placed team are:
# M74: 1E vs Best 3rd ABCDF
# M77: 1I vs Best 3rd CDFGH
# M79: 1A vs Best 3rd CEFHI
# M80: 1L vs Best 3rd EHIJK
# M81: 1D vs Best 3rd BEFIJ
# M82: 1G vs Best 3rd AEHIJ
# M85: 1B vs Best 3rd EFGIJ
# M87: 1K vs Best 3rd DEIJL

# Let's map these to the 8 column headers from the PDF:
# Option 1A 1B 1D 1E 1G 1I 1K 1L
# Notice these match exactly the group winners playing a 3rd placed team!
# M79: 1A
# M85: 1B
# M81: 1D
# M74: 1E
# M82: 1G
# M77: 1I
# M87: 1K
# M80: 1L

# So the column headers "1A 1B 1D 1E 1G 1I 1K 1L" represent who that 3rd placed team is playing.
print("Match mappings:")
print("1A -> M79 (CEFHI)")
print("1B -> M85 (EFGIJ)")
print("1D -> M81 (BEFIJ)")
print("1E -> M74 (ABCDF)")
print("1G -> M82 (AEHIJ)")
print("1I -> M77 (CDFGH)")
print("1K -> M87 (DEIJL)")
print("1L -> M80 (EHIJK)")
