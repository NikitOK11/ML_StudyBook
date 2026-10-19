"""Structural PDF checks and contact sheets for manual visual review.

Run after build:pdf and pdftoppm. PDF formulas use vector outlines, so text
extraction alone is deliberately not treated as validation of mathematical layout.
"""
from pathlib import Path
import json
import re
import sys
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
output = root / 'output/pdf'
scratch = root / 'tmp/pdfs'
pdf = output / 'fitpredict-linear-regression.pdf'
manifest = json.loads((output / 'theory-manifest.json').read_text())
assert [chapter['id'] for chapter in manifest['chapters']] == ['linear']
normalize = lambda text: re.sub(r'\s+', '', text).replace('–', '-').replace('—', '-')
reader = PdfReader(pdf)
texts = [page.extract_text() or '' for page in reader.pages]
whole = normalize(''.join(texts))
missing = [section['id'] for section in manifest['chapters'][0]['sections']
           if normalize(section['title']) not in whole]
assert not missing, f'Missing section headings: {missing}'
assert not any('\ufffd' in text for text in texts), 'Replacement glyph in PDF text'
short = [(i + 1, len(text.strip())) for i, text in enumerate(texts) if len(text.strip()) < 80]
assert not short, f'Nearly empty pages: {short}'
links = sum(1 for page in reader.pages for annotation in page.get('/Annots', [])
            if annotation.get_object().get('/Subtype') == '/Link')
assert links >= manifest['sectionCount'], 'Contents must have working PDF links'
outside = []
with pdfplumber.open(pdf) as document:
    for number, page in enumerate(document.pages, 1):
        for word in page.extract_words():
            # Chromium places the 6pt running footer in the bottom margin.
            bottom_margin = 10 if word['top'] > page.height - 30 else 45
            if word['x0'] < 45 or word['x1'] > page.width - 45 or word['top'] < 30 or word['bottom'] > page.height - bottom_margin:
                outside.append({'page': number, 'text': word['text'], 'bbox': [word['x0'], word['top'], word['x1'], word['bottom']]})
assert not outside, f'Text outside safe page bounds: {outside[:15]}'
previews = sorted(scratch.glob('linear-preview-*.jpg'))
assert len(previews) == len(reader.pages), 'Render every final PDF page before reviewing'
for batch in range(0, len(previews), 12):
    sheet = Image.new('RGB', (4 * 330, 3 * 495), '#e4e1da')
    draw = ImageDraw.Draw(sheet)
    for cell, image_path in enumerate(previews[batch:batch + 12]):
        thumb = Image.open(image_path).convert('RGB')
        thumb.thumbnail((310, 449))
        x = (cell % 4) * 330 + 10
        y = (cell // 4) * 495 + 26
        sheet.paste(thumb, (x, y))
        draw.text((x, y - 18), f'Page {batch + cell + 1}', fill='#333333')
    sheet.save(scratch / f'contact-{batch // 12 + 1}.jpg', quality=90)
result = {'pages': len(reader.pages), 'sections': manifest['sectionCount'], 'displayEquations': manifest['formulaCount'], 'pdfLinks': links, 'allHeadingsPresent': True, 'safeTextBounds': True}
(scratch / 'pdf-checks.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
