import re
import json

with open('full_pdf.txt', 'r') as f:
    text = f.read()

# We need the matches from round of 32:
"""
(1) M73 Runner‑up A (2A) v.Runner‑up B (2B)
(2) M74 Winner E (1E) v.Best 3rd place of ABCDF
(3) M75 Winner F (1F) v.Runner‑up C (2C)
(4) M76 Winner C (1C) v. Runner‑up F (2F)
(5) M77 Winner I (1I) v.Best 3rd place of CDFGH
(6) M78 Runner‑up E (2E) v. Runner‑up I (2I)
(7) M79 Winner A (1A) v.Best 3rd place of CEFHI
(8) M80 Winner L (1L) v.Best 3rd place of EHIJK
(9) M81 Winner D (1D) v.Best 3rd place of BEFIJ
(10) M82 Winner G (1G) v.Best 3rd place of AEHIJ
(11) M83 Runner‑up K (2K) v. Runner‑up L (2L)
(12) M84 Winner H (1H) v. Runner‑up J (2J)
(13) M85 Winner B (1B) v.Best 3rd place of EFGIJ
(14) M86 Winner J (1J) v.Runner‑up H (2H)
(15) M87 Winner K (1K) v.Best 3rd place of DEIJL
(16) M88 Runner‑up D (2D) v.Runner‑up G (2G)
"""
round_32 = {
    "M73": ["2A", "2B"],
    "M74": ["1E", "ABCDF"],
    "M75": ["1F", "2C"],
    "M76": ["1C", "2F"],
    "M77": ["1I", "CDFGH"],
    "M78": ["2E", "2I"],
    "M79": ["1A", "CEFHI"],
    "M80": ["1L", "EHIJK"],
    "M81": ["1D", "BEFIJ"],
    "M82": ["1G", "AEHIJ"],
    "M83": ["2K", "2L"],
    "M84": ["1H", "2J"],
    "M85": ["1B", "EFGIJ"],
    "M86": ["1J", "2H"],
    "M87": ["1K", "DEIJL"],
    "M88": ["2D", "2G"]
}

# we need the combinations for best 3rd placed teams and their matchups.
# the option represents what group the 8 best 3rd placed teams come from.
# The table header is Option 1A 1B 1D 1E 1G 1I 1K 1L
# But wait, looking closely at the combinations, they just say:
# 1 3E 3J 3I 3F 3H 3G 3L 3K
# The PDF says:
# "Option 1A 1B 1D 1E 1G 1I 1K 1L" which means the 8 teams playing in the matches
# But WHICH matches?
# Let's read section 12.6 again carefully.
