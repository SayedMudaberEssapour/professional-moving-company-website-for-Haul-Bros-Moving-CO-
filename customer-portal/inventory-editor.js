/* Owner-only draft editor. No database writes occur until Save Changes. */
(() => {
const catalog=[['Small box',3],['Medium box',4.5],['Large box',6],['Wardrobe box',12],['Sofa',65],['Sectional',120],['Armchair',25],['Coffee table',15],['TV',12],['TV stand',20],['Bookcase',25],['Bed / mattress set',70,0.5],['Dresser',40],['Nightstand',10],['Dining table',40,0.4],['Dining chair',8],['Desk',35,0.3],['Office chair',12],['Cabinet',30],['Refrigerator',60],['Washer / dryer (each)',30],['Patio table',25],['Outdoor chair',10],['Bicycle',12],['Tool chest',25],['Rug',10],['Floor lamp',5],['Mirror / artwork',5],['Piano / safe / specialty item',80,1,true]];
const presets={'Living room':[0,1,4,5,6,7,8,9,10,25,26,27],'Bedroom 1':[0,1,2,3,11,12,13,27],'Bedroom 2':[0,1,2,3,11,12,13],'Kitchen / dining':[0,1,2,14,15,18,19],'Office':[0,1,10,16,17,18],'Garage / storage':[0,1,2,18,20,23,24,28],'Patio / outdoor':[21,22,23],'Other areas':[0,1,2,25,26,27,28]};
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 function summarize(inventory){let volume=0,count=0,unmeasured=0;for(const room of inventory||[])for(const item of room.items||[]){const quantity=Number(item.quantity);if(!Number.isFinite(quantity)||quantity<=0)continue;count+=quantity;const unit=Number(item.cubic_feet_each??catalog.find(entry=>entry[0]===item.item)?.[1]);if(Number.isFinite(unit)&&unit>0)volume+=quantity*unit;else unmeasured+=quantity;}return {volume:Math.round(volume*10)/10,count,unmeasured};}
 window.HaulBrosInventoryEditor=Object.freeze({summarize,mount(root,inventory){
  const total=el('p');total.className='estimate-total';total.setAttribute('aria-live','polite');root.append(total);const groups=el('div');root.append(groups);let serial=0;
  function addRoom(name,items=[],presetName=name){
   const section=el('details');section.className='inventory-room-editor';section.open=groups.children.length===0;
   const summary=el('summary',name),label=el('label','Room / area name'),title=el('input');title.value=name;title.maxLength=200;title.setAttribute('aria-label','Room / area name');label.append(title);section.append(summary,label);
   title.oninput=()=>{summary.textContent=title.value||'New area';};
   const rows=el('div');rows.className='room-item-grid';section.append(rows);
   function addItem(item,quantity=0,volume=null){
    const row=el('div'),label=el('label',item),input=el('input');row.className='room-item';input.type='number';input.min=0;input.max=999;input.step=1;input.value=quantity;input.required=true;input.setAttribute('aria-label',name+': '+item+' quantity');input.dataset.item=item;label.append(input);row.append(label);const volumeLabel=el('label','Cubic feet each'),unit=el('input');unit.type='number';unit.min='0.1';unit.max='100000';unit.step='0.1';unit.value=volume??'';unit.setAttribute('aria-label',name+': '+item+' cubic feet each');unit.dataset.unitVolume='true';volumeLabel.append(unit);row.append(volumeLabel);rows.append(row);input.oninput=()=>{unit.required=Number(input.value)>0;};input.oninput();
   }
   const remaining=new Map(items.map(item=>[item.item,{...item}]));
   for(const id of presets[presetName]||[]){const [item,volume]=catalog[id],saved=remaining.get(item);addItem(item,saved?.quantity||0,saved?.cubic_feet_each??volume);remaining.delete(item);}
   for(const item of remaining.values())addItem(item.item,item.quantity,item.cubic_feet_each??catalog.find(entry=>entry[0]===item.item)?.[1]??null);
   const chooser=el('select');chooser.setAttribute('aria-label','Item to add to '+name);for(const [item] of catalog){const option=el('option',item);chooser.append(option);}section.append(chooser);
   const add=el('button','Add Selected Item');add.type='button';add.className='secondary';add.onclick=()=>{const found=[...rows.querySelectorAll('input')].find(input=>input.dataset.item===chooser.value);if(found){found.value=Number(found.value)+1;found.dispatchEvent(new Event('input',{bubbles:true}));}else addItem(chooser.value,1,catalog.find(item=>item[0]===chooser.value)?.[1]||20);};section.append(add);
   const custom=el('input');custom.placeholder='Custom item name';custom.maxLength=200;custom.setAttribute('aria-label','Custom item for '+name);const addCustom=el('button','Add Custom Item');addCustom.type='button';addCustom.className='secondary';addCustom.onclick=()=>{if(custom.value.trim()){addItem(custom.value.trim(),1);custom.value='';}};section.append(custom,addCustom);
   const remove=el('button','Remove Area');remove.type='button';remove.className='secondary';remove.onclick=()=>{section.remove();updateTotal();};section.append(remove);groups.append(section);updateTotal();
   return {section,title,rows};
  }
  const current=new Map((inventory||[]).map(room=>[room.room,room.items||[]]));
  for(const name of Object.keys(presets)){addRoom(name,current.get(name)||[]);current.delete(name);}
  for(const [name,items] of current)addRoom(name,items,/^Bedroom/.test(name)?'Bedroom 1':'Other areas');
  const buttons=el('div');buttons.className='owner-actions';
  for(const [text,template] of [['Add Bedroom','Bedroom 1'],['Add Kitchen / Dining','Kitchen / dining'],['Add Other Area','Other areas']]){const button=el('button',text);button.type='button';button.className='secondary';button.onclick=()=>{serial++;const names=[...groups.querySelectorAll('[aria-label="Room / area name"]')].map(input=>input.value);let name=template;if(template==='Bedroom 1'){let number=1;while(names.includes('Bedroom '+number))number++;name='Bedroom '+number;}else if(names.includes(name))name+=' '+serial;const room=addRoom(name,[],template);room.section.open=true;room.title.focus();};buttons.append(button);}root.append(buttons);
  root.append(el('p','These are private draft changes. Customers see them only after Save Changes. Set quantities to zero to omit items. Update estimated time separately when the inventory changes.'));
  function read(){const rooms=[];for(const section of groups.children){const name=section.querySelector('[aria-label="Room / area name"]').value.trim();const items=[...section.querySelectorAll('input[data-item]')].filter(input=>Number(input.value)>0).map(input=>{const volume=Number(input.closest('.room-item').querySelector('[data-unit-volume]').value);if(!Number.isFinite(volume)||volume<=0)throw new Error('Enter cubic feet for '+input.dataset.item+' in '+name+'.');return {item:input.dataset.item,quantity:Number(input.value),cubic_feet_each:volume};});if(items.length){if(!name)throw new Error('Enter a room name for every area with items.');rooms.push({room:name,items});}}return rooms;}
  function updateTotal(){try{const summary=summarize(read());total.textContent='Draft approximate volume: '+summary.volume+' cu ft · '+summary.count+' items';}catch(_){total.textContent='Enter a volume for each selected item to calculate the draft total.';}}
  root.addEventListener('input',updateTotal);root.addEventListener('click',()=>queueMicrotask(updateTotal));updateTotal();
  return {read};
 }});
})();
