// Navigation and shared polish; existing modules retain their own workflows.
function navigateWorkspace(page) {
  document.querySelector('.nav-item[data-page="'+page+'"]')?.click();
}
const workspaceGroups=[
  ['ĐIỀU HÀNH',['dashboard','tasks']],
  ['THIẾT BỊ & VẬN HÀNH',['assets','maintenance','inspection','atbx','replacement','tools','toolsets','engineer']],
  ['MUA SẮM & CUNG ỨNG',['orders','estimates','handover','oxy','n2']]
];
const workspaceNav=document.querySelector('.nav');
workspaceGroups.forEach(([title,pages])=>{
  const heading=document.createElement('div');heading.className='nav-label';heading.textContent=title;workspaceNav.appendChild(heading);
  pages.forEach(page=>{
    const item=document.querySelector('.nav-item[data-page="'+page+'"]');
    if(!item)return;
    item.tabIndex=0;item.setAttribute('role','button');
    item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}});
    item.addEventListener('click',()=>{
      document.getElementById('workspace-current').textContent=item.querySelector('span').textContent;
      document.querySelectorAll('.nav-item').forEach(link=>link.setAttribute('aria-current',link===item?'page':'false'));
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('mobile-overlay').classList.remove('show');
      if(page==='orders'||page==='estimates')backToRequestList(page==='orders'?'order':'estimate');
      window.scrollTo({top:0,behavior:'instant'});
    });
    workspaceNav.appendChild(item);
  });
});
const workspaceFooter=document.createElement('div');
workspaceFooter.className='sidebar-footer';
workspaceFooter.innerHTML='<span class="live-dot"></span><span>TBYT Workspace<br>Quản lý thiết bị & nhu cầu</span>';
document.querySelector('.sidebar').appendChild(workspaceFooter);
document.getElementById('workspace-date').textContent=new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'long',year:'numeric'});
document.querySelectorAll('.page-header button').forEach(button=>{
  // Replace the original emoji with consistent line icons, preserving click handlers.
  const text=button.textContent;
  if(!text.includes('📥')&&!text.includes('📤'))return;
  const isExport=text.includes('📥');
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 16v4h16v-4M12 3v12M7 '+(isExport?'10':'8')+'l5 '+(isExport?'5':'-5')+' 5 '+(isExport?'-5':'5')+'"/></svg>';
  button.innerHTML=icon+'<span>'+escHtml(text.replace(/[📥📤]/gu,'').trim())+'</span>';
});
// Readability for the legacy table modules and input labels.
document.querySelectorAll('.form-group').forEach(group=>{
  const label=group.querySelector('label'),control=group.querySelector('input[id],select[id],textarea[id]');
  if(label&&control)label.htmlFor=control.id;
});
document.querySelectorAll('.modal-header button').forEach(button=>{
  if(!button.textContent.trim()&&!button.getAttribute('aria-label'))button.setAttribute('aria-label','Đóng biểu mẫu');
});
