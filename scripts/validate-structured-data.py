"""Validate generated markup, identity links, local assets, dates and sitemap."""
from pathlib import Path
import importlib.util,json,re,xml.etree.ElementTree as ET
from urllib.parse import urlsplit,unquote
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('schema',ROOT/'scripts/update-structured-data.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
inventory=json.loads((ROOT/'docs/schema-inventory.json').read_text());counts=Counter();errors=[]
for entry in inventory['pages']:
 p=ROOT/entry['file'];s=p.read_text();url=entry['url'];blocks=m.SCHEMA.findall(s)
 if len(blocks)!=1:errors.append(f'{p}: schema block count {len(blocks)}')
 if len(m.CANON.findall(s))!=1 or 'href="'+url+'"' not in m.CANON.findall(s)[0]:errors.append(f'{p}: canonical')
 nodes=m.nodes(s);counts.update(str(n['@type']) for n in nodes)
 ids=[n['@id'] for n in nodes if '@id' in n]
 if len(ids)!=len(set(ids)):errors.append(f'{p}: duplicate IDs')
 if entry['file']!='faq/index.html' and any(n['@type']=='FAQPage' for n in nodes):errors.append(f'{p}: FAQ outside dedicated page')
 def walk(x):
  if isinstance(x,list):
   for item in x:walk(item)
  elif isinstance(x,dict):
   if any(k in x for k in ('review','aggregateRating')):errors.append(f'{p}: review markup')
   for key in ('provider','publisher'):
    if key in x and x[key]!={'@id':m.ORG}:errors.append(f'{p}: inconsistent {key}')
   for key in ('image','logo'):
    if key in x:
     values=x[key] if isinstance(x[key],list) else [x[key]]
     for value in values:
      link=value.get('url','') if isinstance(value,dict) else value
      if isinstance(link,str) and link.startswith(m.BASE) and not (ROOT/unquote(urlsplit(link).path.lstrip('/'))).exists():errors.append(f'{p}: missing {key} {link}')
   for v in x.values():walk(v)
 walk(nodes)
 for n in nodes:
  if n['@type'] in ('Article','BlogPosting'):
   for key in ('headline','description','author','publisher','mainEntityOfPage'):
    if not n.get(key):errors.append(f'{p}: missing article {key}')
   for key in ('datePublished','dateModified'):
    if key in n and not re.match(r'^\d{4}-\d{2}-\d{2}',n[key]):errors.append(f'{p}: invalid {key}')
  if n['@type']=='BreadcrumbList':
   for i,item in enumerate(n['itemListElement'],1):
    if item['position']!=i:errors.append(f'{p}: breadcrumb sequence')
    target=ROOT/unquote(urlsplit(item['item']).path.lstrip('/'))
    if target.is_dir():target=target/'index.html'
    if not target.exists():errors.append(f'{p}: missing breadcrumb {item["item"]}')
 for img in re.findall(r'<img\b[^>]*>',s,re.I):
  if not re.search(r'\balt\s*=',img,re.I):errors.append(f'{p}: missing alt')
urls=[e.text for e in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls)==len(set(urls))==len(inventory['pages'])
assert set(urls)=={p['url'] for p in inventory['pages']}
print(json.dumps({'pages':len(inventory['pages']),'types':dict(counts),'errors':errors},indent=2))
raise SystemExit(bool(errors))
