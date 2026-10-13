// Shared sheet workflows for orders and equipment estimates.
const requestUi = {
  order: { page: 1, selected: null, bound: false },
  estimate: { page: 1, selected: null, bound: false },
  editor: null, saving: false, previousFocus: null
};
const requestPageId = kind => kind === 'order' ? 'orders' : 'estimates';
const sheetCode = sheet => (sheet.kind === 'order' ? 'DH-' : 'DT-') + (sheet.id.startsWith('legacy-') ? sheet.id.slice(7).padStart(4, '0') : sheet.id.slice(0, 8).toUpperCase());
const requestBuildingIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 21V5h10v16M14 11h6v10M2 21h20M7 8h4M7 12h4M7 16h4M17 14v2"/></svg>';
function requestItems(sheet) {
  return (sheet.kind === 'order' ? state.orders : state.estimate_items)
    .filter(item => item.sheet_id === sheet.id)
    .sort((a, b) => Number(a.id) - Number(b.id));
}
function requestSheetStatus(sheet) {
  const items = requestItems(sheet);
  if (sheet.kind === 'estimate') return items.some(item => item.priority === 'Ưu tiên') ? 'Ưu tiên' : 'Không cần gấp';
  if (items.length && items.every(item => item.status === 'Đã giao hàng')) return 'Đã giao hàng';
  if (items.length && items.every(item => item.status === 'Chờ phê duyệt')) return 'Chờ phê duyệt';
  return 'Đang xử lý';
}
function requestBadge(value) {
  const color = { 'Đã giao hàng':'green', 'Chờ phê duyệt':'orange', 'Đang xử lý':'blue', 'Ưu tiên':'orange', 'Không cần gấp':'gray' }[value] || 'gray';
  return '<span class="badge '+color+'">'+escHtml(value)+'</span>';
}
function initRequestPage(kind) {
  const ui = requestUi[kind];
  if (!ui.bound) {
    document.getElementById(kind+'-query').addEventListener('input', debounce(() => { ui.page=1; renderRequestList(kind); }, 160));
    ['department','filter'].forEach(field => document.getElementById(kind+'-'+field).addEventListener('change', () => { ui.page=1; renderRequestList(kind); }));
    const list = document.getElementById(kind+'-list');
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-sheet-id]');
      if (button) showRequestDetail(kind, button.dataset.sheetId);
    });
    ui.bound = true;
  }
  const select = document.getElementById(kind+'-department');
  const current = select.value;
  const departments = [...new Set(state.request_sheets.filter(s=>s.kind===kind).map(s=>s.department))].sort((a,b)=>a.localeCompare(b,'vi'));
  select.innerHTML = '<option value="">Tất cả khoa/phòng</option>'+departments.map(d=>'<option value="'+escHtml(d)+'">'+escHtml(d)+'</option>').join('');
  if(departments.includes(current)) select.value = current;
  renderRequestList(kind);
  if (ui.selected && state.request_sheets.some(s=>s.id===ui.selected)) showRequestDetail(kind,ui.selected);
  else backToRequestList(kind);
}
function filteredRequestSheets(kind) {
  const query = document.getElementById(kind+'-query').value.trim().toLocaleLowerCase('vi');
  const department = document.getElementById(kind+'-department').value;
  const filter = document.getElementById(kind+'-filter').value;
  return state.request_sheets.filter(sheet => {
    if (sheet.kind!==kind || (department && sheet.department!==department)) return false;
    const items=requestItems(sheet);
    if (filter && !(kind==='order' ? items.some(i=>i.status===filter) : items.some(i=>i.priority===filter))) return false;
    return !query || [sheet.department,sheetCode(sheet),...items.map(i=>i.order_name||i.device_name)].join(' ').toLocaleLowerCase('vi').includes(query);
  });
}
function renderRequestList(kind) {
  const sheets = state.request_sheets.filter(s=>s.kind===kind);
  const items = kind==='order' ? state.orders : state.estimate_items;
  const stats = kind==='order'
    ? [['Phiếu đặt hàng',sheets.length,'▤'],['Thiết bị / mặt hàng',items.length,'◇'],['Phiếu chưa hoàn tất',sheets.filter(s=>requestSheetStatus(s)!=='Đã giao hàng').length,'◷'],['Khoa/phòng đặt hàng',new Set(sheets.map(s=>s.department)).size,'▥']]
    : [['Phiếu dự trù',sheets.length,'▤'],['Thiết bị dự trù',items.length,'◇'],['Thiết bị ưu tiên',items.filter(i=>i.priority==='Ưu tiên').length,'↑'],['Khoa/phòng đề nghị',new Set(sheets.map(s=>s.department)).size,'▥']];
  document.getElementById(kind+'-summary').innerHTML=stats.map(([label,value,symbol])=>'<div class="request-stat"><div><div class="request-stat-label">'+label+'</div><div class="request-stat-value">'+value+'</div></div><div class="request-stat-symbol" aria-hidden="true">'+symbol+'</div></div>').join('');
  const filtered=filteredRequestSheets(kind);
  const totalPages=Math.max(1,Math.ceil(filtered.length/12));
  const ui=requestUi[kind];
  ui.page=Math.min(ui.page,totalPages);
  document.getElementById(kind+'-count').textContent=filtered.length+' phiếu';
  const shown=filtered.slice((ui.page-1)*12,ui.page*12);
  document.getElementById(kind+'-list').innerHTML=shown.length ? shown.map(sheet=>`
    <button type="button" class="sheet-row" data-sheet-id="${escHtml(sheet.id)}" aria-label="Xem phiếu ${escHtml(sheet.department)} ${escHtml(sheetCode(sheet))}">
      <span class="sheet-department-icon" aria-hidden="true">${requestBuildingIcon}</span>
      <span class="sheet-row-content"><h3>${escHtml(sheet.department)}</h3><span class="sheet-meta"><span class="sheet-code">${escHtml(sheetCode(sheet))}</span><span>${fmtDate(sheet.request_date)||'Chưa có ngày'}</span><span>${requestItems(sheet).length} thiết bị</span></span></span>
      <span class="sheet-row-end">${requestBadge(requestSheetStatus(sheet))}<span class="sheet-chevron" aria-hidden="true">›</span></span>
    </button>`).join('') : `<div class="request-empty"><div class="empty-icon">▤</div><h3>${sheets.length?'Không tìm thấy phiếu phù hợp':'Chưa có phiếu '+(kind==='order'?'đặt hàng':'dự trù')}</h3><p>${sheets.length?'Thử một tên thiết bị khác hoặc thay đổi bộ lọc.':'Tạo phiếu đầu tiên và tập hợp nhu cầu của khoa/phòng trong một danh sách.'}</p><button class="btn primary" onclick="${sheets.length?"resetRequestFilters('"+kind+"')":"openRequestEditor('"+kind+"')"}">${sheets.length?'Xóa bộ lọc':'＋ Tạo phiếu đầu tiên'}</button></div>`;
  const start=filtered.length?(ui.page-1)*12+1:0;
  document.getElementById(kind+'-pagination').innerHTML=`<span>Hiển thị ${start}–${Math.min(ui.page*12,filtered.length)} / ${filtered.length} phiếu</span><div><button class="btn sm" ${ui.page===1?'disabled':''} onclick="changeRequestPage('${kind}',-1)" aria-label="Trang trước">‹</button><span>${ui.page} / ${totalPages}</span><button class="btn sm" ${ui.page===totalPages?'disabled':''} onclick="changeRequestPage('${kind}',1)" aria-label="Trang sau">›</button></div>`;
}
function changeRequestPage(kind,delta){requestUi[kind].page+=delta;renderRequestList(kind);}
function resetRequestFilters(kind){['query','department','filter'].forEach(f=>document.getElementById(kind+'-'+f).value='');requestUi[kind].page=1;renderRequestList(kind);}
function backToRequestList(kind) {
  requestUi[kind].selected=null;
  const page=document.getElementById('page-'+requestPageId(kind));
  page.querySelector('.request-list-area').hidden=false;
  page.querySelector('.request-detail-area').hidden=true;
}
function showRequestDetail(kind,id) {
  const sheet=state.request_sheets.find(s=>s.id===id && s.kind===kind);
  if(!sheet){toast('Phiếu không còn tồn tại.','error');return;}
  requestUi[kind].selected=id;
  const page=document.getElementById('page-'+requestPageId(kind));
  page.querySelector('.request-list-area').hidden=true;
  const detail=page.querySelector('.request-detail-area');
  detail.hidden=false;
  const items=requestItems(sheet);
  const field=(label,value)=>'<dl><dt>'+label+'</dt><dd>'+escHtml(value==null||value===''?'—':value)+'</dd></dl>';
  detail.innerHTML=`<button class="back-link" onclick="backToRequestList('${kind}')">← Danh sách ${kind==='order'?'đơn hàng':'dự trù'}</button>
    <div class="detail-banner">
      <div class="detail-banner-left"><div class="sheet-department-icon" aria-hidden="true">${requestBuildingIcon}</div><div><div class="eyebrow">PHIẾU ${kind==='order'?'ĐẶT HÀNG':'DỰ TRÙ'}</div><h1>${escHtml(sheet.department)}</h1><div class="detail-meta"><span>${escHtml(sheetCode(sheet))}</span><span>Ngày đề nghị: ${fmtDate(sheet.request_date)||'—'}</span>${requestBadge(requestSheetStatus(sheet))}</div></div></div>
      <div class="detail-toolbar"><button class="btn" data-action="export">Xuất phiếu</button><button class="btn danger" data-action="delete">Xóa phiếu</button><button class="btn primary" data-action="edit">Chỉnh sửa phiếu</button></div>
    </div>
    <div class="detail-items-title"><h2>Thiết bị trong phiếu</h2><span>${items.length} thiết bị · ${items.reduce((sum,i)=>sum+Number(i.quantity||0),0)} tổng số lượng</span></div>
    ${items.map((item,index)=>`<article class="detail-item"><div class="detail-item-head"><div class="detail-item-title"><span class="item-number">${String(index+1).padStart(2,'0')}</span><h3>${escHtml(item.order_name||item.device_name)}</h3></div>${requestBadge(kind==='order'?item.status:item.priority)}</div>
      <div class="detail-item-grid">${kind==='order'
        ?field('Số lượng mua',item.quantity)+field('Tổng số lượng',item.total_quantity)+field('Lý do',item.reason)+field('Ngày phê duyệt',fmtDate(item.approval_date))+field('Ngày bàn giao',fmtDate(item.handover_date))+field('Người nhận',item.receiver)
        :field('Khoa/phòng',sheet.department)+field('Số lượng cần',item.quantity)+field('Lý do',item.reason)+field('Mức độ cần thiết',item.priority)}</div>
      ${kind==='order'&&item.note?'<div class="detail-item-note">Ghi chú: '+escHtml(item.note)+'</div>':''}</article>`).join('')}`;
  detail.querySelector('[data-action="edit"]').onclick=()=>openRequestEditor(kind,id);
  detail.querySelector('[data-action="delete"]').onclick=()=>deleteRequestSheet(kind,id);
  detail.querySelector('[data-action="export"]').onclick=()=>exportRequestList(kind,id);
}
function editorField(label,key,value='',type='text',options=null,extra='') {
  return '<label class="editor-field '+(key==='order_name'||key==='device_name'?'name-field':'')+'">'+label+
    (options?'<select class="select" data-key="'+key+'">'+options.map(o=>'<option '+(o===value?'selected':'')+'>'+escHtml(o)+'</option>').join('')+'</select>'
    :'<input class="input" data-key="'+key+'" type="'+type+'" value="'+escHtml(value)+'" '+extra+'>')+'</label>';
}
function openRequestEditor(kind,id=null) {
  if(requestUi.saving)return;
  const sheet=id?state.request_sheets.find(s=>s.id===id):null;
  if(id&&!sheet){toast('Phiếu không còn tồn tại.','error');return;}
  requestUi.previousFocus=document.activeElement;
  requestUi.editor={kind,id,initial:''};
  const name=kind==='order'?'đặt hàng':'dự trù';
  document.getElementById('request-editor-title').textContent=(id?'Chỉnh sửa':'Tạo')+' phiếu '+name;
  document.getElementById('request-editor-kicker').textContent=id?sheetCode(sheet):'MUA SẮM & CUNG ỨNG';
  document.querySelector('.sheet-form-intro').textContent='Một phiếu cho một khoa/phòng. Thêm tất cả thiết bị cần '+(kind==='order'?'đặt hàng':'dự trù')+' bên dưới.';
  document.getElementById('request-dept').value=sheet?.department||'';
  document.getElementById('request-date').value=sheet?.request_date||(!id?todayInputDate():'');
  const departments=[...new Set([...state.assets,...state.request_sheets].map(r=>r.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  document.getElementById('request-departments').innerHTML=departments.map(d=>'<option value="'+escHtml(d)+'"></option>').join('');
  document.getElementById('request-editor-items').replaceChildren();
  (sheet?requestItems(sheet):[{}]).forEach(item=>addRequestItem(item));
  document.getElementById('request-form-error').hidden=true;
  requestUi.editor.initial=JSON.stringify(readRequestDraft());
  document.getElementById('request-editor').classList.add('show');
  document.body.style.overflow='hidden';
  document.getElementById('request-dept').focus();
}
function addRequestItem(item={}) {
  const editor=requestUi.editor;
  if(!editor||requestUi.saving)return;
  if(document.querySelectorAll('.editor-item').length>=100){toast('Mỗi phiếu tối đa 100 thiết bị.','error');return;}
  const row=document.createElement('section');
  row.className='editor-item';
  if(item.id)row.dataset.id=item.id;
  const order=editor.kind==='order';
  row.innerHTML='<div class="editor-item-head"><span class="editor-item-number"></span><button class="btn sm" type="button" aria-label="Bỏ thiết bị khỏi phiếu">Bỏ dòng ×</button></div><div class="editor-main-grid">'+
    editorField('Tên thiết bị *',order?'order_name':'device_name',item.order_name||item.device_name||'','text',null,'required maxlength="500" placeholder="Nhập tên thiết bị"')+
    editorField(order?'SL mua':'Số lượng cần *','quantity',item.quantity??(order?0:1),'number',null,'required min="'+(order?0:1)+'" step="1"')+
    editorField('Lý do','reason',item.reason||'','text',null,'placeholder="Mua mới, thay thế..."')+
    (order?editorField('Trạng thái','status',item.status||'Đang xử lý','text',['Đang xử lý','Chờ phê duyệt','Đã giao hàng']):editorField('Mức độ cần thiết','priority',item.priority||'Không cần gấp','text',['Không cần gấp','Ưu tiên']))+'</div>'+
    (order?'<details class="editor-details" '+(item.id?'open':'')+'><summary>Thông tin phê duyệt, bàn giao & ghi chú</summary><div class="editor-extra-grid">'+
      editorField('Tổng số lượng','total_quantity',item.total_quantity??0,'number',null,'required min="0" step="1"')+
      editorField('Ngày phê duyệt','approval_date',item.approval_date||'','date')+
      editorField('Ngày bàn giao','handover_date',item.handover_date||'','date')+
      editorField('Người nhận bàn giao','receiver',item.receiver||'')+
      '<label class="editor-field wide-field">Ghi chú<input class="input" data-key="note" value="'+escHtml(item.note||'')+'"></label></div></details>':'');
  row.querySelector('button').onclick=()=>{if(requestUi.saving)return;if(document.querySelectorAll('.editor-item').length===1){toast('Phiếu cần ít nhất một thiết bị.','error');return;}row.remove();updateRequestDraftCount();};
  document.getElementById('request-editor-items').appendChild(row);
  updateRequestDraftCount();
}
function updateRequestDraftCount(){
  const rows=[...document.querySelectorAll('.editor-item')];
  rows.forEach((row,i)=>row.querySelector('.editor-item-number').textContent='THIẾT BỊ '+String(i+1).padStart(2,'0'));
  document.getElementById('request-editor-count').textContent=rows.length+' / 100 thiết bị';
}
function readRequestDraft(){
  const editor=requestUi.editor;
  return {kind:editor.kind,department:document.getElementById('request-dept').value.trim(),request_date:document.getElementById('request-date').value,
    items:[...document.querySelectorAll('.editor-item')].map(row=>{
      const item={};if(row.dataset.id)item.id=Number(row.dataset.id);
      row.querySelectorAll('[data-key]').forEach(input=>item[input.dataset.key]=input.type==='number'?Number(input.value):input.value.trim());
      return item;
    })};
}
function closeRequestEditor(force=false) {
  if(requestUi.saving)return;
  if(!force&&requestUi.editor&&JSON.stringify(readRequestDraft())!==requestUi.editor.initial&&!confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?'))return;
  document.getElementById('request-editor').classList.remove('show');
  document.body.style.overflow='';
  requestUi.editor=null;
  requestUi.previousFocus?.focus();
}
async function saveRequestSheet(event) {
  event.preventDefault();
  if(requestUi.saving||!requestUi.editor)return;
  const draft=readRequestDraft(), {id,kind}=requestUi.editor;
  const error=document.getElementById('request-form-error');
  error.hidden=true;
  if(!draft.department||draft.items.some(i=>!(i.order_name||i.device_name)?.trim())){error.textContent='Vui lòng nhập khoa/phòng và tên của tất cả thiết bị.';error.hidden=false;return;}
  requestUi.saving=true;
  const controls=[...document.querySelectorAll('#request-editor input,#request-editor select,#request-editor button')];
  controls.forEach(c=>c.disabled=true);
  const saveButton=document.getElementById('request-save');
  saveButton.textContent='Đang lưu phiếu...';
  try{
    const saved=await apiFetch('/requests'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',body:JSON.stringify(draft)});
    // Update local state immediately, so a refresh failure never prompts a duplicate create.
    const {items,...sheet}=saved;
    state.request_sheets=[sheet,...state.request_sheets.filter(s=>s.id!==sheet.id)];
    if(kind==='order')state.orders=[...state.orders.filter(i=>i.sheet_id!==sheet.id),...items];
    else state.estimate_items=[...state.estimate_items.filter(i=>i.sheet_id!==sheet.id),...items];
    requestUi.saving=false;
    closeRequestEditor(true);
    requestUi[kind].selected=sheet.id;
    initRequestPage(kind);
    toast(id?'Đã cập nhật phiếu.':'Đã tạo 1 phiếu gồm '+items.length+' thiết bị.');
    await boot(true);
  }catch(err){error.textContent=err.message;error.hidden=false;}
  finally{requestUi.saving=false;controls.forEach(c=>c.disabled=false);saveButton.textContent='Lưu phiếu';}
}
async function deleteRequestSheet(kind,id) {
  const sheet=state.request_sheets.find(s=>s.id===id);
  if(!sheet||!confirm('Xóa phiếu '+sheetCode(sheet)+' của '+sheet.department+' và toàn bộ '+requestItems(sheet).length+' thiết bị trong phiếu?'))return;
  try {
    await apiFetch('/requests/'+encodeURIComponent(id),{method:'DELETE'});
    state.request_sheets=state.request_sheets.filter(s=>s.id!==id);
    state.orders=state.orders.filter(i=>i.sheet_id!==id);
    state.estimate_items=state.estimate_items.filter(i=>i.sheet_id!==id);
    requestUi[kind].selected=null;
    initRequestPage(kind);
    toast('Đã xóa phiếu.');
  }catch(err){toast(err.message,'error');}
}
function exportRequestList(kind,id=null) {
  const sheets=id?state.request_sheets.filter(s=>s.id===id):filteredRequestSheets(kind);
  const rows=sheets.flatMap(sheet=>requestItems(sheet).map(item=>({...item,department:sheet.department,request_date:sheet.request_date,sheet_code:sheetCode(sheet)})));
  if(!rows.length){toast('Không có dữ liệu để xuất.','error');return;}
  const columns=kind==='order'?[{key:'sheet_code',label:'Mã phiếu'},{key:'department',label:'Khoa/Phòng'},{key:'order_name',label:'Tên thiết bị'},{key:'request_date',label:'Ngày đề nghị'},{key:'quantity',label:'SL mua'},{key:'total_quantity',label:'Tổng SL'},{key:'reason',label:'Lý do'},{key:'status',label:'Trạng thái'},{key:'approval_date',label:'Ngày phê duyệt'},{key:'handover_date',label:'Ngày bàn giao'},{key:'receiver',label:'Người nhận'},{key:'note',label:'Ghi chú'}]
    :[{key:'sheet_code',label:'Mã phiếu'},{key:'department',label:'Khoa'},{key:'device_name',label:'Tên thiết bị'},{key:'quantity',label:'Số lượng cần'},{key:'reason',label:'Lý do'},{key:'priority',label:'Mức độ cần thiết'},{key:'request_date',label:'Ngày đề nghị'}];
  exportExcel(rows,columns,(kind==='order'?'don-hang':'du-tru')+'.xlsx');
}
function exportOrders(){exportRequestList('order');}
document.getElementById('request-form').addEventListener('submit',saveRequestSheet);
document.getElementById('request-editor').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.stopPropagation();closeRequestEditor();}
  if(event.key==='Tab'){
    const focusable=[...document.querySelectorAll('#request-editor button:not(:disabled),#request-editor input:not(:disabled),#request-editor select:not(:disabled),#request-editor summary')].filter(e=>e.getClientRects().length);
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1)?.focus();}
    else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0]?.focus();}
  }
});
window.addEventListener('beforeunload',event=>{if(requestUi.editor&&(requestUi.saving||JSON.stringify(readRequestDraft())!==requestUi.editor.initial)){event.preventDefault();event.returnValue='';}});
