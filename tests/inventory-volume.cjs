const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const context={window:{}};vm.runInNewContext(fs.readFileSync('customer-portal/inventory-editor.js','utf8'),context);const summarize=context.window.HaulBrosInventoryEditor.summarize;
let s=summarize([{room:'Living room',items:[{item:'Sofa',quantity:1,cubic_feet_each:65}]},{room:'Bedroom',items:[{item:'Bed',quantity:2,cubic_feet_each:70}]}]);assert.equal(s.volume,205);assert.equal(s.count,3);assert.equal(s.unmeasured,0);
s=summarize([{items:[{item:'Medium box',quantity:3},{item:'Custom cabinet',quantity:2,cubic_feet_each:18.2}]}]);assert.equal(s.volume,49.9);assert.equal(s.count,5);
s=summarize([{items:[{item:'Unknown custom item',quantity:2},{item:'Sofa',quantity:0}]}]);assert.equal(s.unmeasured,2);assert.equal(s.volume,0);
assert.equal(summarize([]).volume,0);
console.log('PASS: multiple rooms, item quantities, fractional volumes, catalog fallback, unknown sizes, empty inventory.');
