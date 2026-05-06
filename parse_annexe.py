import re

with open('annexes.txt', 'r') as f:
    text = f.read()

# find all combinations
lines = text.split('\n')
combinations = []
for line in lines:
    line = line.strip()
    match = re.match(r'^(\d{1,3})\s+(3[A-L]\s+3[A-L]\s+3[A-L]\s+3[A-L]\s+3[A-L]\s+3[A-L]\s+3[A-L]\s+3[A-L])$', line)
    if match:
        combinations.append((int(match.group(1)), match.group(2).split()))

# Sometimes combinations are split by page breaks or other things.
# Let's find all 495 combinations.
print(f"Found {len(combinations)} perfectly matching combinations.")

# the combinations follow "Option 1A 1B 1D 1E 1G 1I 1K 1L"
header_lines = [l for l in lines if 'Option' in l]
print("Headers:", header_lines)
