import re
import json

with open('full_pdf.txt', 'r') as f:
    text = f.read()

lines = text.split('\n')
combinations = {}
for line in lines:
    line = line.strip()
    match = re.match(r'^(\d{1,3})\s+((3[A-L]\s+){7}3[A-L])$', line)
    if match:
        idx = int(match.group(1))
        teams = [t.strip() for t in match.group(2).split()]
        combinations[idx] = teams

print(f"Found {len(combinations)} perfectly matching combinations.")
for i in range(1, 496):
    if i not in combinations:
        print(f"Missing {i}")

# Save to a json
with open('src/services/worldCupCombinations.json', 'w') as f:
    json.dump(combinations, f, indent=2)


# Manually add combination 18
combinations[18] = "3H 3G 3I 3C 3J 3D 3L 3K".split()

with open('src/services/worldCupCombinations.json', 'w') as f:
    json.dump(combinations, f, indent=2)
