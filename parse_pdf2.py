import requests
import PyPDF2
from io import BytesIO

url = "https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf"
response = requests.get(url)
pdf = PyPDF2.PdfReader(BytesIO(response.content))

with open("full_pdf.txt", "w") as f:
    for i in range(len(pdf.pages)):
        page_text = pdf.pages[i].extract_text()
        f.write(page_text + "\n")
