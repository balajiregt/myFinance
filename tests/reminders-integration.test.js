const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../assets/finance-core'),html=fs.readFileSync(require.resolve('../index.html'),'utf8');
test('gold unpaid instalments reconcile with reminder totals and remain due on month-end',()=>{
  const rd={id:42,bank:'Tanishq',monthly:10000,maturity:'2027-04-30'};
  const gold=C.migrateRD(C.emptyGold(),rd,{startMonth:'2026-07'});
  const elements={},storage=new Map([[C.GOLD_KEY,JSON.stringify(gold)],['mypf_rds',JSON.stringify([rd])]]);
  const ctx=vm.createContext({FinanceCore:{...C,day:()=> '2026-10-31',month:()=> '2026-10'},localStorage:{getItem:k=>storage.get(k)||null},getCustomReminders:()=>[],OPENCLAW_CRONS:[],document:{getElementById:id=>elements[id]??=( {style:{}} )}});
  vm.runInContext(fs.readFileSync(require.resolve('../assets/finance-bridge'),'utf8'),ctx);
  vm.runInContext(html.slice(html.indexOf('function generateAutoReminders()'),html.indexOf('function renderAutoReminders()')),ctx);
  vm.runInContext(html.slice(html.indexOf('function updateRemindersSummary('),html.indexOf('function renderCronStatus(')),ctx);
  let rows=ctx.generateAutoReminders();
  assert.equal(rows.length,2);assert.ok(rows.every(r=>r.type==='gold'));
  ctx.updateRemindersSummary(rows);
  assert.equal(elements['rem-overdue'].textContent,1);assert.equal(elements['rem-upcoming'].textContent,1);assert.equal(elements['rem-total'].textContent,2);
  gold.payments.push({id:'oct',schemeId:gold.schemes[0].id,month:'2026-10',amount:10000});storage.set(C.GOLD_KEY,JSON.stringify(gold));
  rows=ctx.generateAutoReminders();assert.equal(rows.length,1);assert.equal(rows[0].dueDate,'2026-09-30');
  gold.schemes[0].redeemed={id:'physical'};storage.set(C.GOLD_KEY,JSON.stringify(gold));assert.equal(ctx.generateAutoReminders().length,0);
});
