"""Apply reviewed local copy without changing location-page templates.

Run from the repository root. Census and source data live beside this script.
The editorials deliberately distinguish postal areas from Census boundaries.
"""
import html
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'scripts/location-facts.json').read_text())
PARA = 'text-slate-600 leading-relaxed mb-5'
LINK = 'underline underline-offset-4 font-semibold'


def p(text):
    return f'<p class="{PARA}">{text}</p>'


def a(url, label):
    return f'<a class="{LINK}" href="{html.escape(url, quote=True)}">{html.escape(label)}</a>'


def distance(one, two):
    lat1, lon1, lat2, lon2 = map(math.radians, [one['latitude'], one['longitude'], two['latitude'], two['longitude']])
    return math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2


for row in DATA:
    file = ROOT / 'Locations' / (row['stem'] + '.html')
    original = file.read_text()
    s = original
    city = row['name']
    nearby = sorted((r for r in DATA if r != row), key=lambda r: distance(row, r))[:3]
    population = (
        f'The 2020 Census counted {row["population"]:,} residents in {row["census_name"]}, '
        f'with approximately {row["land_sq_miles"]:.2f} square miles of land. '
        f'That is about {row["density"]:,} residents per square mile. '
        'These are 2020 figures for the Census boundary, not a current estimate or a count of everyone using the mailing address.'
    )
    comparison = nearby[0]
    relation = 'higher' if row['density'] > comparison['density'] else 'lower'
    density_context = (
        f'This density was {relation} than nearby {comparison["name"]} '
        f'({comparison["density"]:,} residents per square mile in 2020). '
        'Population density provides local context; the actual driveway, curb space and building access determine the loading plan.'
    )
    source_links = ' · '.join(a(url, label) for label, url in row['sources'])
    # Same outer block and typography as the original local-company section.
    block = '<div class="space-y-6 pt-6"><div class="text-center space-y-2">'
    block += f'<h2 class="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900">Planning a Move in {html.escape(city)}</h2></div>\n'
    for heading, text in [
        ('Local areas and community boundaries', row['areas']),
        ('Nearby highways and local streets', row['roads']),
        ('Street access and moving-day planning', row['advice']),
        ('Population and density: 2020 Census', population),
    ]:
        block += f'<h3 class="font-black uppercase text-base text-slate-900">{heading}</h3>\n' + p(html.escape(text)) + '\n'
    block += p(html.escape(density_context)) + '\n'
    block += p('Nearby moving-service pages: ' + ', '.join(a(r['stem']+'.html', r['name']) for r in nearby) + '.') + '\n'
    block += p('Local references: ' + source_links + '.') + '\n'
    pattern = r'<div class="space-y-6 pt-6"><div class="text-center space-y-2"><h2[^>]*>(?:[^<]*Professional Moving Company|Planning a Move in [^<]*)</h2></div>.*?(?=</div><div id="services")'
    s, n = re.subn(pattern, lambda _: block, s, count=1, flags=re.S)
    assert n == 1, file
    s = re.sub(r'<!-- Geographic reference: .*? -->', '<!-- Local geographic and Census sources are listed in the local planning section. -->', s)
    # Keep service claims and pricing intact, but make the opening preview local.
    intro = f'Planning a move in {city}? {row["areas"].split(". ")[0].rstrip(".")}. Haul Bros Moving Co LLC helps plan packing, loading and delivery around your actual address and access conditions.'
    intro_pattern = r'(<section id="why-us".*?<h2[^>]*>.*?</h2></div>\s*)<p class="text-slate-600 leading-relaxed mb-5">.*?</p>'
    s, n = re.subn(intro_pattern, lambda m: m[1] + p(html.escape(intro)), s, count=1, flags=re.S)
    assert n == 1, file
    location_label = city if row['state'] == 'DC' else f'{city}, {row["state"]}'
    description = f'Movers in {location_label}. Plan your move with local area, road and access details. House, apartment, packing and storage help from Haul Bros.'
    s = re.sub(r'(<meta name="description" content=")[^"]*(">)', lambda m: m[1] + html.escape(description, quote=True) + m[2], s, count=1)
    questions = [
        (f'Which local areas should I mention for a move in {city}?', row['areas'] + ' Include the full street address and community or building name when requesting an estimate.'),
        (f'Which roads are near {city} for moving-day planning?', row['roads'] + ' These are geographic reference points; the mover will confirm a suitable truck route and current access conditions.'),
        (f'What access details matter for my {city} move?', row['advice']),
    ]
    cards = '<!-- Local moving questions -->\n'
    for question, answer in questions:
        cards += '<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-2xl space-y-2">'
        cards += f'<h3 class="font-black uppercase text-base text-slate-900">{html.escape(question)}</h3>'
        cards += p(html.escape(answer)) + '</div>\n'
    cards += '<!-- End local moving questions -->\n'
    s = re.sub(r'<!-- Local moving questions -->.*?<!-- End local moving questions -->\s*', '', s, flags=re.S)
    faq_pattern = r'(<div id="faq".*?<div class="space-y-4">)'
    s, n = re.subn(faq_pattern, lambda m: m[1] + cards, s, count=1, flags=re.S)
    assert n == 1, file

    def schema_update(match):
        schema = json.loads(match[1])
        for entity in schema.get('@graph', []):
            if entity.get('@type') == 'FAQPage':
                names = {q for q, _ in questions}
                entity['mainEntity'] = [
                    {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': answer}}
                    for q, answer in questions
                ] + [q for q in entity['mainEntity'] if q['name'] not in names]
            if entity.get('@type') == 'Service':
                entity['description'] = description
        return '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>'

    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', schema_update, s, flags=re.S)
    if s != original:
        file.write_text(s)
        print(file.relative_to(ROOT))
