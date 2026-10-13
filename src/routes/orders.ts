import { Hono } from 'hono';
import { Env } from '../types';
import { InputError, importOrders, normalizeSheet, createSheet } from '../procurement';

const app = new Hono<Env>();
app.onError((error,c)=>{
  if (error instanceof InputError || error instanceof SyntaxError) return c.json({error:error.message},400);
  console.error('Orders error:',error);
  return c.json({error:'Không thể cập nhật đơn hàng.'},500);
});
app.get('/', async c => {
  const {results}=await c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  return c.json(results);
});
app.post('/', async c => {
  const body=await c.req.json();
  if(!body || typeof body!=='object')throw new InputError('Dữ liệu không hợp lệ.');
  const sheet=await createSheet(c.env.DB,{...body,department:body.department||'Chưa xác định khoa',items:[body]},'order');
  return c.json(sheet!.items[0],201);
});
app.post('/batch',async c=>c.json(await importOrders(c.env.DB,await c.req.json()),201));
app.put('/:id',async c=>{
  const db=c.env.DB;
  const current=await db.prepare('SELECT * FROM orders WHERE id=?').bind(c.req.param('id')).first<Record<string,any>>();
  if(!current)return c.json({error:'Không tìm thấy đơn hàng.'},404);
  const body=await c.req.json();
  const data=normalizeSheet({...body,department:body?.department||current.department||'Chưa xác định khoa',items:[body]},'order');
  const item=data.items[0];
  await db.batch([
    db.prepare('UPDATE orders SET order_name=?, quantity=?, total_quantity=?, reason=?, note=?, status=?, approval_date=?, handover_date=?, receiver=? WHERE id=?')
      .bind(item.order_name,item.quantity,item.total_quantity,item.reason,item.note,item.status,item.approval_date,item.handover_date,item.receiver,current.id),
    db.prepare('UPDATE orders SET department=?,request_date=? WHERE sheet_id=?').bind(data.department,data.request_date,current.sheet_id),
    db.prepare('UPDATE request_sheets SET department=?,request_date=? WHERE id=?').bind(data.department,data.request_date,current.sheet_id)
  ]);
  return c.json(await db.prepare('SELECT * FROM orders WHERE id=?').bind(current.id).first());
});
app.delete('/:id',async c=>{
  const db=c.env.DB;
  const current=await db.prepare('SELECT sheet_id FROM orders WHERE id=?').bind(c.req.param('id')).first<{sheet_id:string}>();
  if(!current)return c.json({error:'Không tìm thấy đơn hàng.'},404);
  await db.batch([
    db.prepare('DELETE FROM orders WHERE id=?').bind(c.req.param('id')),
    db.prepare('DELETE FROM request_sheets WHERE id=? AND NOT EXISTS(SELECT 1 FROM orders WHERE sheet_id=?)').bind(current.sheet_id,current.sheet_id)
  ]);
  return c.json({success:true});
});
export default app;
