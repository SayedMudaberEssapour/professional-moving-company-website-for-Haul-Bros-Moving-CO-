"""Generate server-rendered JSON-LD from this static site's visible page data.
Run from any directory. No external packages; preserves visible HTML verbatim.
Location migration is deliberately separate: see docs/location-redirect-map.csv.
"""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, quote
import html, json, re, csv
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.haulbrosmoving.com/'
ORG = BASE + '#organization'
WEB = BASE + '#website'
SCHEMA = re.compile(r'<script\b[^>]*type=[\"\x27]application/ld\+json[\"\x27][^>]*>.*?</script>', re.S | re.I)
CANON = re.compile(r'<link\b(?=[^>]*\brel=[\"\x27]canonical[\"\x27])[^>]*>', re.I)
SERVICES = {
 'local-movers': ('Local Movers in Northern Virginia', 'Local moving'),
 'apartment-movers': ('Apartment Movers in Northern Virginia', 'Apartment moving'),
 'long-distance-movers': ('Long-Distance Movers from Northern Virginia', 'Long-distance moving'),
 'military-movers': ('Military Movers in Northern Virginia', 'Military moving'),
 'commercial-movers': ('Commercial Movers in Northern Virginia', 'Commercial moving'),
 'senior-movers': ('Senior Movers in Northern Virginia', 'Senior moving'),
 'house-movers': ('House Movers in Northern Virginia', 'Residential moving'),
 'student-moving': ('Student Moving in Northern Virginia', 'Student moving'),
 'packing-services': ('Packing and Unpacking Services', 'Packing services'),
 'storage-solutions': ('Storage Moving Solutions', 'Storage coordination'),
 'junk-removal': ('Junk Removal in Northern Virginia', 'Junk removal'),
 'services/last-minute-movers': ('Same Day Movers in Northern Virginia', 'Same-day moving'),
}

def text(s):
 return ' '.join(html.unescape(re.sub('<[^>]+>', ' ', s)).split())

def match(pattern, s, default=''):
 m = re.search(pattern, s, re.S | re.I)
 return m[1] if m else default

def meta(s, key):
 return html.unescape(match(r'<meta\b(?=[^>]*(?:name|property)=[\"\x27]' + re.escape(key) + r'[\"\x27])[^>]*content=[\"\x27](.*?)[\"\x27]\s*/?>', s))

def nodes(s):
 result=[]
 for block in SCHEMA.findall(s):
  data=json.loads(match(r'>(.*?)</script>',block))
  result.extend(data if isinstance(data,list) else data.get('@graph',[data]))
 return result

def area(name):
 return {'@type':'Place','name':name}

def clean_refs(node):
 if isinstance(node,list):return [clean_refs(x) for x in node]
 if not isinstance(node,dict):return node
 result={k:clean_refs(v) for k,v in node.items() if k not in ('aggregateRating','review','@context')}
 for key in ('provider','publisher'):
  if key in result:result[key]={'@id':ORG}
 if isinstance(result.get('author'),dict) and result['author'].get('@type')=='Organization':result['author']={'@id':ORG}
 return result

def generate():
 home=json.loads((ROOT/'scripts/homepage-schema.json').read_text())
 legacy=json.loads((ROOT/'scripts/legacy-article-data.json').read_text())
 report=[];redirects=[];migrations=[];alt_updates=[];unresolved=[];urls=[]
 for p in sorted(ROOT.rglob('*.html')):
  if '.git' in p.parts:continue
  s=p.read_text();rel=p.relative_to(ROOT).as_posix()
  if '<head' not in s.lower():continue
  if rel!='index.html' and ('location.replace(' in s or re.search(r'<meta[^>]*http-equiv=[\"\x27]refresh',s,re.I)):
   redirects.append(rel);continue
  h1=text(match(r'<h1\b[^>]*>(.*?)</h1>',s))
  if not h1:continue
  path=rel[:-10] if rel.endswith('index.html') else rel
  url=BASE+quote(path,safe='/-._~')
  existing=nodes(s)
  desc=meta(s,'description') or h1
  graph=[]
  if path=='':graph=home['@graph']
  else:
   graph.append({'@type':'WebPage','@id':url+'#webpage','url':url,'name':h1,'description':desc,'isPartOf':{'@id':WEB},'about':{'@id':ORG},'inLanguage':'en-US'})
   crumb=[('Home',BASE)]
   if path.startswith('Locations/'):
    citymatch=re.search(r'(?:Movers in )?(.+?),\s*(VA|MD|DC)\b',h1)
    assert citymatch, (rel,h1)
    city=re.sub(r'^.*?Movers in\s+','',citymatch[1],flags=re.I).strip()
    state=citymatch[2];label=city+', '+state
    slug=re.sub(r'[^a-z0-9]+','-',city.lower()).strip('-')
    migrations.extend([(urlsplit(url).path,'/locations/'+slug+'/'),('/Locations/'+p.parent.name+'.html','/locations/'+slug+'/')])
    oldsvc=next((x for x in existing if x.get('@type')=='Service'),{})
    # Use page description verbatim rather than claiming services not described.
    graph.append({'@type':'Service','@id':url+'#service','name':'Movers in '+label,'serviceType':'Moving services','url':url,'description':desc,'provider':{'@id':ORG},'areaServed':area(label)})
   elif path.strip('/') in SERVICES or path.startswith('long-distance/'):
    key=path.strip('/');name,kind=SERVICES.get(key,(h1,'Long-distance moving'))
    oldsvc=next((x for x in existing if x.get('@type')=='Service'),{})
    served=oldsvc.get('areaServed') if key=='long-distance-movers' or path.startswith('long-distance/') else [area('Northern Virginia'),area('Washington, DC'),area('Maryland')]
    if key=='long-distance-movers':
     destinations=[]
     for route in sorted((ROOT/'long-distance').glob('*/index.html')):
      route_title=text(match(r'<h1\b[^>]*>(.*?)</h1>',route.read_text()))
      destination=route_title.split(' to ',1)[-1].removesuffix(' Movers')
      if destination and destination!=route_title:destinations.append(area(destination))
     served=[area('Northern Virginia')]+destinations
    if not served:
     destination=h1.split(' to ',1)[-1].removesuffix(' Movers')
     served=[area('Northern Virginia'),area(destination)] if path.startswith('long-distance/') else [area('Northern Virginia')]
    graph.append({'@type':'Service','@id':url+'#service','name':name,'serviceType':kind,'url':url,'description':oldsvc.get('description') or desc,'provider':{'@id':ORG},'areaServed':served})
    if key!='services':crumb.append(('Services',BASE+'services/'))
   elif path=='services/':
    graph.append({'@type':'Service','@id':url+'#service','name':h1,'serviceType':'Moving services','url':url,'description':desc,'provider':{'@id':ORG},'areaServed':[area('Northern Virginia'),area('Washington, DC'),area('Maryland')]})
   if (path.startswith('blog/') and path!='blog/') or rel in legacy:
    crumb.append(('Blog',BASE+'blog/'))
    old=next((x for x in existing if x.get('@type') in ('BlogPosting','Article')),legacy.get(rel))
    article=clean_refs(old) if old else {'@type':'BlogPosting'}
    article.update({'@id':url+'#article','headline':h1,'description':desc,'mainEntityOfPage':{'@id':url+'#webpage'},'author':article.get('author',{'@id':ORG}),'publisher':{'@id':ORG}})
    if article.get('image') and isinstance(article['image'],str) and article['image'].startswith(BASE) and not (ROOT/urlsplit(article['image']).path.lstrip('/')).exists():
     unresolved.append(rel+': referenced article image does not exist: '+article.pop('image'))
    if not article.get('image'):
     image=meta(s,'og:image') or match(r'<(?:img)\b[^>]*src=[\"\x27]([^\"\x27]+)',match(r'(<article\b.*?</article>)',s,s))
     if image and 'black-gold' not in image and (not urljoin(url,image).startswith(BASE) or (ROOT/urlsplit(urljoin(url,image)).path.lstrip('/')).exists()):article['image']=urljoin(url,image)
     else:unresolved.append(rel+': no available editorial image; image omitted')
    if not article.get('datePublished'):
     date=match(r'<time\b[^>]*datetime=[\"\x27]([^\"\x27]+)',s)
     if date:article['datePublished']=date
     else:unresolved.append(rel+': no publication date available')
    if not article.get('dateModified') and article.get('datePublished'):article['dateModified']=article['datePublished']
    graph.append(article)
   elif path=='blog/':graph.append({'@type':'Blog','@id':url+'#blog','url':url,'name':h1,'publisher':{'@id':ORG}})
   elif path=='faq/':
    faqs=[]
    for qid,q in re.findall(r'<button\b[^>]*aria-controls="ans-(\d+)"[^>]*>.*?<span>(.*?)</span>.*?</button>',s,re.S):
     answer=match(r'<div\b[^>]*id="ans-'+qid+r'"[^>]*>(.*?)</div>',s)
     if answer:faqs.append({'@type':'Question','name':re.sub(r'^\d+\.\s*','',text(q)),'acceptedAnswer':{'@type':'Answer','text':text(answer)}})
    assert faqs,'No visible FAQ pairs found'
    graph.append({'@type':'FAQPage','@id':url+'#faq','mainEntity':faqs})
   crumb.append((h1,url))
   graph.append({'@type':'BreadcrumbList','@id':url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':i,'name':n,'item':u} for i,(n,u) in enumerate(crumb,1)]})
  s=SCHEMA.sub('',s);s=CANON.sub('',s)
  block='<link rel="canonical" href="'+url+'">\n<script type="application/ld+json">\n'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False,indent=2).replace('</','<\\/')+'\n</script>\n'
  s=s.replace('</head>',block+'</head>',1)
  def add_alt(m):
   tag=m[0]
   if re.search(r'\balt\s*=',tag,re.I):return tag
   src=match(r'\bsrc=[\"\x27]([^\"\x27]+)',tag)
   stem=Path(urlsplit(src).path).stem
   label=re.sub(r'[-_]',' ',stem).strip()
   if not label or re.fullmatch(r'(?:img|image|photo|screenshot|dsc)[\s\d.]*',label,re.I):
    unresolved.append(rel+': image needs manual description: '+src);return tag
   label=re.sub(r'\b(?:webp|jpg|png)\b','',label,flags=re.I).strip()
   alt_updates.append(rel+': '+src)
   return tag[:-1]+' alt="'+html.escape(label.capitalize(),quote=True)+'">'
  s=re.sub(r'<img\b[^>]*>',add_alt,s,flags=re.I)
  head,tail=s.split('</head>',1);head=re.sub(r'[ \t]+$', '', head, flags=re.M);head=re.sub(r'\n{3,}', '\n\n', head);s=head+'</head>'+tail
  p.write_text(s);urls.append(url)
  report.append({'file':rel,'url':url,'types':[x['@type'] for x in graph]})
 (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>'+html.escape(u)+'</loc></url>\n' for u in sorted(urls))+'</urlset>\n')
 (ROOT/'docs/schema-inventory.json').write_text(json.dumps({'pages':report,'redirect_pages_excluded':redirects,'alt_added':alt_updates,'needs_review':unresolved},indent=2)+'\n')
 with (ROOT/'docs/location-redirect-map.csv').open('w') as f:
  writer=csv.writer(f);writer.writerow(['old_path','proposed_path','status']);writer.writerows((a,b,'301') for a,b in migrations)
 print(f'Updated {len(report)} pages; excluded {len(redirects)} redirect stubs; added {len(alt_updates)} alt attributes; {len(unresolved)} review items.')

if __name__=='__main__':generate()
