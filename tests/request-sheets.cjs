const assert = require('node:assert/strict');
const base = process.env.TEST_URL || 'http://127.0.0.1:8791';
if (!base.includes('127.0.0.1:8791')) throw new Error('Use the isolated QA server on port 8791.');
let checks = 0;
const created = new Set();
async function api(path, method='GET', body, expected=200) {
  const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();
  assert.equal(r.status,expected,JSON.stringify(data));
  checks++;
  return data;
}
const order=(name='Thiết bị QA',quantity=2)=>({order_name:name,quantity,total_quantity:5,reason:'Mua mới',status:'Đang xử lý',approval_date:'',handover_date:'',receiver:'',note:'Giữ ghi chú & ký tự < >'});
const draft=(kind='order')=>({kind,department:'__QA_PHIẾU__',request_date:'2026-10-13',items:kind==='order'?[order('Máy A'),order('Máy B',3)]:[{device_name:'Thiết bị dự trù A',quantity:4,reason:'Bổ sung',priority:'Ưu tiên'},{device_name:'Thiết bị dự trù B',quantity:1,reason:'Thay thế',priority:'Không cần gấp'}]});
(async()=>{
 const before=await api('/bootstrap');
 assert.ok(before.orders.length > 0);
 assert.equal(before.request_sheets.filter(s=>s.kind==='order').length,before.orders.length);
 assert.ok(before.orders.every(item=>item.sheet_id==='legacy-'+item.id));
 checks+=3;
 try {
  const first=await api('/requests','POST',draft(),201);created.add(first.id);
  assert.equal(first.items.length,2);assert.ok(first.items.every(i=>i.sheet_id===first.id));checks+=2;
  const second=await api('/requests','POST',draft(),201);created.add(second.id);
  assert.notEqual(first.id,second.id);checks++;
  const read=await api('/requests/'+first.id);assert.deepEqual(read,first);checks++;
  const edit={...draft(),department:'__QA_SỬA_PHIẾU__',items:[{...first.items[0],status:'Đã giao hàng',approval_date:'2026-10-13',handover_date:'2026-10-14',receiver:'Người thử nghiệm'},order('Máy C',8)]};
  const edited=await api('/requests/'+first.id,'PUT',edit);
  assert.equal(edited.items.length,2);assert.equal(edited.items[0].id,first.items[0].id);assert.equal(edited.items[0].receiver,'Người thử nghiệm');assert.ok(!edited.items.some(i=>i.id===first.items[1].id));assert.ok(edited.items.every(i=>i.department===edit.department));checks+=5;
  await api('/requests/'+first.id,'PUT',{...edit,items:[second.items[0]]},400);
  assert.deepEqual(await api('/requests/'+first.id),edited);checks++;
  for(const invalid of [
    {...draft(),department:'   '},
    {...draft(),items:[]},
    {...draft(),items:[order(' ')]},
    {...draft(),items:[order('Âm',-1)]},
    {...draft(),items:[order('Lẻ',1.5)]},
    {...draft(),request_date:'2026-02-30'},
    {...draft(),items:Array.from({length:101},()=>order())},
    {...draft(),items:[{...order(),status:'Sai'}]}
  ])await api('/requests','POST',invalid,400);
  await api('/requests/'+first.id,'PUT',{...edit,items:[order('   ')]},400);
  assert.deepEqual(await api('/requests/'+first.id),edited);checks++;
  const estimate=await api('/requests','POST',draft('estimate'),201);created.add(estimate.id);
  assert.equal(estimate.items.length,2);assert.equal(estimate.items[0].priority,'Ưu tiên');checks+=2;
  const estimateEdit=await api('/requests/'+estimate.id,'PUT',{...draft('estimate'),items:[{...estimate.items[0],quantity:7,priority:'Không cần gấp'}]});
  assert.equal(estimateEdit.items[0].quantity,7);assert.equal(estimateEdit.items.length,1);checks+=2;
  await api('/requests','POST',{...draft('estimate'),items:[{device_name:'Invalid',quantity:0}]},400);
  await api('/requests','POST',{...draft('estimate'),items:[{device_name:'Invalid',quantity:2,priority:'Khẩn'}]},400);
  const large=await api('/requests','POST',{...draft(),items:Array.from({length:100},(_,i)=>order('Biên '+i))},201);created.add(large.id);
  const largeEdit=await api('/requests/'+large.id,'PUT',{...draft(),items:large.items});
  assert.equal(largeEdit.items.length,100);checks++;
  const reduced=await api('/requests/'+large.id,'PUT',{...draft(),items:[large.items[0]]});
  assert.equal(reduced.items.length,1);assert.equal(reduced.items[0].id,large.items[0].id);checks+=2;
  const imported=await api('/orders/batch','POST',[{...order('Import A'),department:'__QA_IMPORT_A__',request_date:'2026-10-13'},{...order('Import B'),department:'__QA_IMPORT_A__',request_date:'2026-10-13'},{...order('Import C'),department:'__QA_IMPORT_B__',request_date:'2026-10-13'}],201);
  assert.equal(imported.sheets,2);checks++;
  const withImport=await api('/bootstrap');
  withImport.request_sheets.filter(s=>s.department.startsWith('__QA_IMPORT')).forEach(s=>created.add(s.id));
  await api('/orders/batch','POST',[order('Valid'),order('')],400);
  const current=await api('/bootstrap');
  assert.equal(current.orders.length,withImport.orders.length);checks++;
  for(const key of ['assets','maintenance','inspection','atbx','tools','tasks','replacement','oxy','engineer','handover','n2','tool_sets','tool_set_items']){assert.deepEqual(current[key],before[key]);checks++;}
  assert.deepEqual(current.orders.filter(i=>i.sheet_id.startsWith('legacy-')),before.orders);checks++;
 }finally{
  for(const id of created)await api('/requests/'+id,'DELETE');
 }
 const after=await api('/bootstrap');
 assert.deepEqual(after.orders,before.orders);assert.deepEqual(after.estimate_items,before.estimate_items);assert.deepEqual(after.request_sheets,before.request_sheets);checks+=3;
 console.log('PASS: '+checks+' assertions / API checks. Existing data intact; test sheets removed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
