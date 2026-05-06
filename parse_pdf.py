import requests
import PyPDF2
from io import BytesIO

url = "https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf"
response = requests.get(url)
pdf = PyPDF2.PdfReader(BytesIO(response.content))

text = ""
for i in range(len(pdf.pages)):
    page_text = pdf.pages[i].extract_text()
    if "Section III" in page_text or "Annexe C" in page_text or "Combinations for Eight Best" in page_text:
        text += page_text + "\n"

print("Done extracting. Writing to extracted.txt")
with open("extracted.txt", "w") as f:
    f.write(text)
