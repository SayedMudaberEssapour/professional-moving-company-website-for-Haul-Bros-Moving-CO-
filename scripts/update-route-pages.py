"""Render popular-route pages using the established service-page shell and design."""
from pathlib import Path
from urllib.parse import urljoin,urlsplit
import re,json,html
ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.haulbrosmoving.com/'
data=json.loads((ROOT/'scripts/route-page-content.json').read_text())
by_key={r['slug'].removeprefix('northern-virginia-to-').removesuffix('-movers'):r for r in data}
template=(ROOT/'long-distance-movers/index.html').read_text()
main=re.search(r'<main\b.*?</main>',template,re.S)[0]
hero=main[:main.index('<nav class="service-jump-links"')]
# Resolve the one-level service template's URLs before rendering at route depth.
def root_link(m):
 prefix,value=m.groups()
 if value.startswith(('#','mailto:','tel:','data:','javascript:')):return m[0]
 target=urljoin(BASE+'long-distance-movers/',value)
 if urlsplit(target).netloc=='www.haulbrosmoving.com':target=target.removeprefix(BASE.rstrip('/'))
 return prefix+target+'"'
template=re.sub(r'((?:href|src)=")([^"]+)"',root_link,template)
def esc(value):return html.escape(str(value),quote=True)
def section(id,title,body,classes=''):
 return f'<section id="{id}" class="service-section {classes}" aria-labelledby="{id}-heading"><h2 id="{id}-heading">{esc(title)}</h2>{body}</section>'
def paragraph(text):return '<p class="service-section-copy">'+esc(text)+'</p>'
def card(title,text):return '<article class="service-card"><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></article>'
origin_links=[('Woodbridge','/Locations/woodbridge-movers/'),('Fairfax','/Locations/Fairfax/'),('Alexandria','/Locations/Alexandria/'),('Arlington','/Locations/Arlington/'),('Manassas','/Locations/Manassas/'),('Ashburn','/Locations/Ashburn/'),('Stafford','/Locations/Stafford/')]
services=[('Packing services','/packing-services/','Choose full, partial or fragile-item packing and confirm materials and labor in the estimate.'),('Storage solutions','/storage-solutions/','Plan storage access, handling and later delivery when your home is not ready.'),('Unpacking services','/services/unpacking-services/','Ask about unpacking tasks, room placement and the work included at delivery.'),('Specialty-item moving','/services/specialty-item-movers/','Share dimensions, weight and photos of unusually heavy, delicate or oversized items.')]
for r in data:
 destination=r['destination'];short=r['short'];path='long-distance/'+r['slug']+'/';url=BASE+path
 title='Northern Virginia to '+destination+' Movers'
 seo='Northern VA to '+destination+' Movers | Haul Bros' if destination in ('North Carolina','South Carolina','Pennsylvania','Connecticut') else 'Northern Virginia to '+short+' Movers | Haul Bros'
 h=hero.replace('Long-Distance Moving from Northern Virginia',esc(title)).replace('<p class="guide-category">Long-distance moving</p>','<p class="guide-category">Popular moving routes · Interstate planning</p>')
 h=h.replace('A longer move starts with clear pickup, delivery and pricing arrangements.',esc('Plan your '+destination+' move with a clear inventory, written estimate and delivery arrangements.'))
 h=h.replace('Get Your Moving Estimate',esc('Get Your '+short+' Moving Estimate')).replace('value="Long-distance moving estimate"','value="'+esc('Northern Virginia to '+destination+' moving estimate')+'"').replace('value="https://www.haulbrosmoving.com/long-distance-movers/"','value="'+url+'"')
 h=h.replace('id="blog-moving_to" name="moving_to" type="text" required','id="blog-moving_to" name="moving_to" type="text" placeholder="'+esc(short+' address or ZIP')+'" required')
 h=h.replace('Inventory, access, timing and any extra help you need',esc('Your '+short+' destination, inventory, building access and delivery dates'))
 content=h
 links=[('route-overview','Route overview'),('destination-planning','Destination access'),('route-services','Services'),('route-pricing','Estimate & timing'),('route-questions','Questions'),('service-quote','Get an estimate')]
 content+='<nav class="service-jump-links" aria-label="Route details">'+''.join('<a href="#'+id+'">'+esc(label)+'</a>' for id,label in links)+'</nav>'
 content+=section('route-overview','Moving from Northern Virginia to '+destination,paragraph(r['intro'])+'<div class="route-facts"><div><span>Moving from</span><strong>Northern Virginia</strong></div><div><span>Moving to</span><strong>'+esc(destination)+'</strong></div><div><span>Estimate</span><strong>Inventory &amp; address based</strong></div><div><span>Delivery</span><strong>Agreed date or window</strong></div></div>'+paragraph('Send both addresses, your preferred pickup date and when you can accept delivery. The team will review availability, the services and the transportation plan before you book.'))
 content+=section('destination-planning','Plan the '+destination+' delivery','<div class="route-planning-grid">'+''.join(card(t,p) for t,p in r['focus'])+'</div><div class="route-resource-links"><h3>Official destination planning resources</h3>'+''.join('<a href="'+esc(u)+'">'+esc(label)+'</a>' for label,u in r['resources'])+'<p>Check current guidance for your address and move date. Road information does not replace vehicle-specific routing or building approval.</p></div>')
 content+=section('destination-examples','Destination details to include in your estimate',paragraph('These examples help you describe your requested destination. Confirm service coverage and dates for your exact address; listing an area does not reserve a move.')+'<div class="service-grid">'+''.join(card(t,p) for t,p in r['destinations'])+'</div>')
 content+=section('route-services','Build the moving plan around your belongings',paragraph('Loading, transportation, unloading, furniture protection and any disassembly or reassembly must be included in the accepted scope. Request additional tasks early so time, materials and equipment can be reviewed.')+'<div class="service-grid">'+''.join('<article class="service-card"><h3>'+esc(label)+'</h3><p>'+esc(copy)+'</p><a href="'+href+'">Explore '+esc(label.lower())+'</a></article>' for label,href,copy in services)+'</div>')
 content+='<figure class="service-photo"><img src="/assets/about-fleet-and-crew.webp" alt="Haul Bros moving team and trucks outside a building" width="1578" height="996" loading="lazy" decoding="async"><figcaption>A Woodbridge-based team, with the pickup, transportation and destination work set out for your own move.</figcaption></figure>'
 estimate_body=paragraph('The cost of a Northern Virginia to '+destination+' move depends on the exact addresses, shipment size, property access, packing, transport arrangements and selected services. Request an estimate for the complete inventory rather than a price based only on the destination name.')
 estimate_body+='<div class="route-pricing-grid"><article><h3>What affects your estimate?</h3><ul class="route-list"><li>Inventory, box count and oversized items</li><li>Origin and destination access, stairs and unloading distance</li><li>Transportation, agreed stops, tolls and parking arrangements</li><li>Packing labor, supplies, storage and later delivery</li><li>Pickup date and the delivery commitment in your agreement</li></ul></article><article><h3>How long will the move take?</h3><p>Loading, travel and unloading are separate parts of the schedule. Ask whether an agreed date or a delivery window applies, how updates are shared, and what happens if access or travel conditions change.</p><p>Same-day or next-day delivery should not be assumed. A passenger-car driving estimate is not a household-move schedule.</p></article></div>'
 estimate_body+=paragraph('If your agreement uses hourly billing, confirm the crew rate, estimated hours, minimums and additional services. Published local truck packages do not establish the price of an interstate shipment. Review the estimate type, deposit, cancellation and rescheduling terms before booking.')
 estimate_body+='<div class="service-inline-links"><a href="/terms-of-service/">Service and booking terms</a><a href="/blog/same-day-delivery-long-distance-move/">Understand delivery timing</a><a href="https://www.fmcsa.dot.gov/protect-your-move/how-to/subpartD">FMCSA written-estimate guidance</a></div>'
 content+=section('route-pricing','Your '+destination+' estimate and delivery plan',estimate_body,'service-rates')
 content+=section('route-preparation','What to send before moving day','<div class="route-pricing-grid"><div><ol class="route-list"><li>Give both addresses and your pickup and delivery availability.</li><li>Build a room-by-room inventory, including boxes and large items.</li><li>Share stairs, elevator reservations, truck parking and building instructions.</li><li>List packing, storage, extra stops and specialty-item needs.</li><li>Review the written service scope, price terms and delivery arrangements.</li></ol></div><aside><h3>Keep the moving plan organized</h3><p>Submit an estimate request or build your inventory online. Save the private access code shown after submission to return to your customer profile with your phone number.</p><div class="service-inline-links"><a href="/moving-inventory/">Build your moving inventory</a><a href="/blog/what-movers-cannot-transport/">Check restricted moving items</a></div></aside></div>')
 questions=[('Can Haul Bros help plan a Northern Virginia to '+destination+' move?','Send your pickup and delivery addresses, dates and inventory. Haul Bros reviews route coverage, the performing carrier and the requested work before confirming availability and booking.'),(r['question'],r['answer']),('What does the moving estimate include?','Review the written scope for loading, transport, unloading, crew or equipment, packing materials and additional services. Confirm the pricing method and how changed inventory, access or dates affect the estimate.'),('Can packing or storage be added?','Request packing, unpacking or storage when you ask for the estimate. Confirm materials, facility access, handling charges and later delivery arrangements where applicable.'),('Will my belongings be delivered the same day?','Delivery depends on the exact route, shipment, loading, travel conditions and the service agreement. Confirm the expected date or window and how moving-day updates will be provided.'),('Can I track my moving details after submitting?','Submitting the website quote form or Moving Calculator creates a private profile. Use your phone number and saved access code to return. Haul Bros adds estimate details and instructions after reviewing the request.')]
 content+=section('route-questions','Northern Virginia to '+short+' moving questions','<div class="service-faq">'+''.join('<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>' for q,a in questions)+'</div>')
 content+=section('route-origins','Northern Virginia pickup planning',paragraph('Haul Bros Moving Co LLC is based in Woodbridge, Virginia. Start with your pickup community, then provide the specific property and destination. Ask about availability for your requested date and route.')+'<div class="service-area-links">'+''.join('<a href="'+u+'">'+esc(label)+'</a>' for label,u in origin_links)+'</div>','service-area')
 related=''.join('<a href="/long-distance/'+by_key[key]['slug']+'/">Northern Virginia to '+esc(by_key[key]['short'])+'</a>' for key in r['related'])
 content+=section('related-routes','Explore related moving routes','<div class="service-related-links">'+related+'</div><div class="service-inline-links"><a href="/long-distance-movers/#moving-routes">All popular moving routes</a><a href="'+r['guide']+'">Read a related moving guide</a><a href="/services/">All moving services</a></div>')
 content+='<section class="service-final-cta"><div><h2>Ready to plan your move to '+esc(destination)+'?</h2><p>Share your date, addresses and belongings. Haul Bros will review availability and the service plan for your route.</p></div><div class="service-cta-links"><a class="service-primary-button" href="#service-quote">Request your moving estimate</a><a href="tel:+15718991919">Call 571-899-1919</a><a href="/contact/">Contact Haul Bros</a></div></section></main>'
 page=re.sub(r'<main\b.*?</main>',lambda m:content,template,flags=re.S)
 crumb='<nav aria-label="Breadcrumb" class="max-w-6xl mx-auto px-4 py-3 text-sm text-slate-600"><ol class="flex flex-wrap items-center gap-2"><li><a href="/">Home</a></li><li aria-hidden="true">/</li><li><a href="/long-distance-movers/">Long-distance moving</a></li><li aria-hidden="true">/</li><li aria-current="page">Northern Virginia to '+esc(destination)+'</li></ol></nav>'
 page=re.sub(r'<nav aria-label="Breadcrumb".*?</nav>',lambda m:crumb,page,flags=re.S)
 page=re.sub(r'<title>.*?</title>','<title>'+esc(seo)+'</title>',page,flags=re.S)
 page=re.sub(r'(<meta (?:name|property)="(?:description|og:description)" content=")[^"]*',lambda m:m[1]+esc(r['description']),page)
 page=re.sub(r'(<meta property="og:title" content=")[^"]*',lambda m:m[1]+esc(seo),page)
 page=re.sub(r'(<meta property="og:url" content=")[^"]*',lambda m:m[1]+url,page)
 page=re.sub(r'(<link rel="canonical" href=")[^"]*',lambda m:m[1]+url,page)
 page=page.replace('</head>','<link rel="stylesheet" href="/assets/moving-routes.css?v=20261127">\n<meta name="twitter:title" content="'+esc(seo)+'">\n<meta name="twitter:description" content="'+esc(r['description'])+'">\n<meta name="twitter:image" content="https://www.haulbrosmoving.com/assets/haul-bros-long-distance-truck.webp">\n</head>')
 graph={'@context':'https://schema.org','@graph':[{'@type':'WebPage','@id':url+'#webpage','url':url,'name':title,'description':r['description'],'inLanguage':'en-US','isPartOf':{'@id':BASE+'#website'},'mainEntity':{'@id':url+'#service'},'dateModified':'2026-11-27'},{'@type':'Service','@id':url+'#service','name':title,'serviceType':'Long-distance moving','url':url,'description':r['description'],'provider':{'@id':BASE+'#organization'},'areaServed':[{'@type':'Place','name':'Northern Virginia'},{'@type':'Place','name':destination}]},{'@type':'BreadcrumbList','@id':url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':BASE},{'@type':'ListItem','position':2,'name':'Long-distance moving','item':BASE+'long-distance-movers/'},{'@type':'ListItem','position':3,'name':title,'item':url}]}]}
 page=re.sub(r'(<script type="application/ld\+json">).*?(</script>)',lambda m:m[1]+'\n'+json.dumps(graph,indent=2,ensure_ascii=False)+'\n'+m[2],page,flags=re.S)
 (ROOT/path/'index.html').write_text(page)
# Update only the changed route pages' sitemap dates.
p=ROOT/'sitemap.xml';s=p.read_text()
for r in data:
 url=BASE+'long-distance/'+r['slug']+'/'
 pattern=r'<url>\s*<loc>'+re.escape(url)+r'</loc>.*?</url>'
 s,count=re.subn(pattern,'<url><loc>'+url+'</loc><lastmod>2026-11-27</lastmod></url>',s,flags=re.S);assert count==1,url
p.write_text(s)
print('Updated',len(data),'route pages using the current service-page shell.')
