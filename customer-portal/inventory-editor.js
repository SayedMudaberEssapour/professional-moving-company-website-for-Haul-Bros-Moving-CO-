/* Owner-only draft editor. No database writes occur until Save Changes. */
(() => {
const catalog=[['Small box',3],['Medium box',4.5],['Large box',6],['Wardrobe box',12],['Sofa',65],['Sectional',120],['Armchair',25],['Coffee table',15],['TV',12],['TV stand',20],['Bookcase',25],['Bed / mattress set',70,0.5],['Dresser',40],['Nightstand',10],['Dining table',40,0.4],['Dining chair',8],['Desk',35,0.3],['Office chair',12],['Cabinet',30],['Refrigerator',60],['Washer / dryer (each)',30],['Patio table',25],['Outdoor chair',10],['Bicycle',12],['Tool chest',25],['Rug',10],['Floor lamp',5],['Mirror / artwork',5],['Piano / safe / specialty item',80,1,true]];
const presets={'Living room':[0,1,4,5,6,7,8,9,10,25,26,27],'Bedroom 1':[0,1,2,3,11,12,13,27],'Bedroom 2':[0,1,2,3,11,12,13],'Kitchen / dining':[0,1,2,14,15,18,19],'Office':[0,1,10,16,17,18],'Garage / storage':[0,1,2,18,20,23,24,28],'Patio / outdoor':[21,22,23],'Other areas':[0,1,2,25,26,27,28]};
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 window.HaulBrosInventoryEditor=Object.freeze({mount(root,inventory){
  const groups=el('div');root.append(groups);let serial=0;
  function addRoom(name,items=[],presetName=name){
   const section=el('details');section.className='inventory-room-editor';section.open=groups.children.length===0;
   const summary=el('summary',name),label=el('label','Room / area name'),title=el('input');title.value=name;title.maxLength=200;title.setAttribute('aria-label','Room / area name');label.append(title);section.append(summary,label);
   title.oninput=()=>{summary.textContent=title.value||'New area';};
   const rows=el('div');rows.className='room-item-grid';section.append(rows);
   function addItem(item,quantity=0,volume=20){
    const row=el('label',item),input=el('input');row.className='room-item';input.type='number';input.min=0;input.max=999;input.step=1;input.value=quantity;input.required=true;input.setAttribute('aria-label',name+': '+item+' quantity');input.dataset.item=item;input.dataset.volume=volume;row.append(input);rows.append(row);
   }
   const remaining=new Map(items.map(item=>[item.item,{...item}]));
   for(const id of presets[presetName]||[]){const [item,volume]=catalog[id],saved=remaining.get(item);addItem(item,saved?.quantity||0,saved?.cubic_feet_each??volume);remaining.delete(item);}
   for(const item of remaining.values())addItem(item.item,item.quantity,item.cubic_feet_each??20);
   const chooser=el('select');chooser.setAttribute('aria-label','Item to add to '+name);for(const [item] of catalog){const option=el('option',item);chooser.append(option);}section.append(chooser);
   const add=el('button','Add Selected Item');add.type='button';add.className='secondary';add.onclick=()=>{const found=[...rows.querySelectorAll('input')].find(input=>input.dataset.item===chooser.value);if(found){found.value=Number(found.value)+1;found.dispatchEvent(new Event('input',{bubbles:true}));}else addItem(chooser.value,1,catalog.find(item=>item[0]===chooser.value)?.[1]||20);};section.append(add);
   const custom=el('input');custom.placeholder='Custom item name';custom.maxLength=200;custom.setAttribute('aria-label','Custom item for '+name);const addCustom=el('button','Add Custom Item');addCustom.type='button';addCustom.className='secondary';addCustom.onclick=()=>{if(custom.value.trim()){addItem(custom.value.trim(),1);custom.value='';}};section.append(custom,addCustom);
   const remove=el('button','Remove Area');remove.type='button';remove.className='secondary';remove.onclick=()=>section.remove();section.append(remove);groups.append(section);
   return {section,title,rows};
  }
  const current=new Map((inventory||[]).map(room=>[room.room,room.items||[]]));
  for(const name of Object.keys(presets)){addRoom(name,current.get(name)||[]);current.delete(name);}
  for(const [name,items] of current)addRoom(name,items,/^Bedroom/.test(name)?'Bedroom 1':'Other areas');
  const buttons=el('div');buttons.className='owner-actions';
  for(const [text,template] of [['Add Bedroom','Bedroom 1'],['Add Kitchen / Dining','Kitchen / dining'],['Add Other Area','Other areas']]){const button=el('button',text);button.type='button';button.className='secondary';button.onclick=()=>{serial++;const names=[...groups.querySelectorAll('[aria-label="Room / area name"]')].map(input=>input.value);let name=template;if(template==='Bedroom 1'){let number=1;while(names.includes('Bedroom '+number))number++;name='Bedroom '+number;}else if(names.includes(name))name+=' '+serial;const room=addRoom(name,[],template);room.section.open=true;room.title.focus();};buttons.append(button);}root.append(buttons);
  root.append(el('p','These are private draft changes. Customers see them only after Save Changes. Set quantities to zero to omit items. Update estimated time separately when the inventory changes.'));
  return {read(){const rooms=[];for(const section of groups.children){const name=section.querySelector('[aria-label="Room / area name"]').value.trim();const items=[...section.querySelectorAll('input[data-item]')].filter(input=>Number(input.value)>0).map(input=>({item:input.dataset.item,quantity:Number(input.value),cubic_feet_each:Number(input.dataset.volume)}));if(items.length){if(!name)throw new Error('Enter a room name for every area with items.');rooms.push({room:name,items});}}return rooms;}};
 }});
})();
