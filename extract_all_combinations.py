import re

with open('annexes.txt', 'r') as f:
    text = f.read()

lines = text.split('\n')
combinations = {}
for line in lines:
    line = line.strip()
    match = re.match(r'^(\d{1,3})\s+((3[A-L]\s+){7}3[A-L])$', line)
    if match:
        combinations[int(match.group(1))] = match.group(2).split()

print(f"Found {len(combinations)} unique perfectly matching combinations.")
for i in range(1, 496):
    if i not in combinations:
        print(f"Missing {i}")
