/* Shared deterministic accounting. Amounts are INR; dates use Asia/Kolkata calendar days. */
(function(root, factory) { const api = factory(); if (typeof module === 'object') module.exports = api; else root.FinanceCore = api; })(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const GOLD_KEY = 'mypf_gold_schemes_v1', SAVINGS_KEY = 'mypf_savings_v1';
  const clone = x => JSON.parse(JSON.stringify(x));
  const money = x => Math.round((Number(x) || 0) * 100) / 100;
  const sum = (a, fn) => money(a.reduce((n, x) => n + Number(fn(x) || 0), 0));
  const day = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const month = () => day().slice(0,7);
  const validMonth = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');
  const addMonth = (m, n) => { if (!validMonth(m)) throw Error('Choose an instalment month.'); const d = new Date(m+'-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth()+n); return d.toISOString().slice(0,7); };
  const validDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(Date.parse(d)) && new Date(d+'T00:00:00Z').toISOString().slice(0,10) === d;
  const lastDay = m => new Date(Date.UTC(+m.slice(0,4), +m.slice(5,7), 0)).getUTCDate();
  const deadline = (s,m) => m+'-'+String(Math.min(s.deadlineDay || 31,lastDay(m))).padStart(2,'0');
  const emptyGold = () => ({version:1,schemes:[],payments:[],migrations:[]});
  const emptySavings = () => ({version:1,categories:[],contributions:[],months:{}});
  function read(storage,key,fallback) { const raw=storage.getItem(key); if (!raw) return fallback(); const x=JSON.parse(raw); if (x.version !== 1) throw Error('Unsupported data version. Restore a compatible backup before editing.'); return x; }
  const amountAt = (s,m) => (s.amounts || []).filter(x=>x.month<=m).sort((a,b)=>b.month.localeCompare(a.month))[0]?.amount ?? s.monthly;
  function schedule(s,g,today=day()) {
    return Array.from({length:s.instalments},(_,i)=> {
      const m=addMonth(s.startMonth,i), planned=money(amountAt(s,m));
      const paid=sum(g.payments.filter(p=>p.schemeId===s.id && p.month===m && !p.voided),p=>p.amount);
      const due=deadline(s,m), remaining=Math.max(0,money(planned-paid));
      const days=Math.round((Date.parse(due+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
      const status=s.redeemed ? 'Redeemed' : !remaining ? 'Paid' : today>due ? 'Overdue' : m>today.slice(0,7) ? 'Upcoming' : days<=10 ? 'Due soon' : 'Payment window';
      return {month:m,planned,paid,remaining,due,status};
    });
  }
  function goldSummary(s,g,quote=null,today=day()) {
    const payments=g.payments.filter(p=>p.schemeId===s.id && !p.voided), slots=schedule(s,g,today);
    const deposited=sum(payments,p=>p.amount), confirmedGrams=payments.reduce((n,p)=>n+(p.grams == null ? 0 : +p.grams),0);
    const confirmedCost=sum(payments.filter(p=>p.grams != null),p=>p.amount);
    const allConfirmed=payments.length>0 && payments.every(p=>p.grams>0);
    const valued=allConfirmed && quote?.fresh && quote.today?.date===today && quote.purity==='22K';
    return {deposited,confirmedGrams,confirmedCost,averageRate:confirmedGrams ? confirmedCost/confirmedGrams:null,
      estimatedGrams:payments.filter(p=>p.grams==null && p.rate>0).reduce((n,p)=>n+p.amount/p.rate,0),
      remaining:sum(slots,p=>p.remaining),paidCount:slots.filter(p=>!p.remaining).length,slots,
      value:s.redeemed ? 0 : valued ? money(confirmedGrams*quote.today.rate) : deposited,
      valueBasis:s.redeemed?'Transferred to physical gold':valued?'Indicative 22K value':'Deposited cost',complete:slots.every(p=>!p.remaining)};
  }
  function validatePayment(p,s,g) {
    p={...p,receipt:String(p.receipt||'').trim()};
    if (!s || s.redeemed) throw Error('This scheme is not open for payments.');
    if (!schedule(s,g).some(x=>x.month===p.month)) throw Error('Select a month within this scheme.');
    if (!(Number.isFinite(p.amount) && p.amount>0)) throw Error('Enter an amount greater than zero.');
    if (p.date && (!validDay(p.date) || p.date>day())) throw Error('Enter a valid payment date, no later than today.');
    for (const k of ['rate','grams']) if (p[k]!=null && !(Number.isFinite(p[k]) && p[k]>0)) throw Error('Rate and receipt grams must be positive, or left blank.');
    const other=sum(g.payments.filter(x=>x.schemeId===s.id && x.month===p.month && x.id!==p.id && !x.voided),x=>x.amount);
    if (money(other+p.amount)>money(amountAt(s,p.month))) throw Error('Payments exceed this instalment. Correct an existing payment or the scheme amount.');
    if (p.receipt && g.payments.some(x=>!x.voided && x.schemeId===s.id && x.id!==p.id && x.receipt===p.receipt)) throw Error('This receipt is already recorded. Edit the existing payment.');
    return {...p,version:1,amount:money(p.amount)};
  }
  function migratedIds(g) { return new Set(g.migrations.map(x=>String(x.sourceId))); }
  function activeRDs(rds,g) { const ids=migratedIds(g); return rds.filter(x=>!ids.has(String(x.id))); }
  function migrateRD(g,rd,setup) {
    if (rd?.id == null || String(rd.id)==='') throw Error('The original RD must have an identifier.');
    if (migratedIds(g).has(String(rd.id))) return clone(g);
    if (!validMonth(setup.startMonth)) throw Error('Confirm the first instalment month.');
    const next=clone(g), id='rd:'+rd.id;
    const scheme={version:1,id,sourceId:rd.id,name:setup.name || 'Tanishq',monthly:10000,instalments:10,startMonth:setup.startMonth,deadlineDay:Number(setup.deadlineDay||31),dropPct:Number(setup.dropPct??1),createdAt:new Date().toISOString()};
    if (!(scheme.deadlineDay>=1 && scheme.deadlineDay<=31) || !(scheme.dropPct>0 && scheme.dropPct<=100)) throw Error('Check deadline and drop threshold.');
    next.migrations.push({sourceId:rd.id,schemeId:id,backup:clone(rd),migratedAt:new Date().toISOString()});
    next.schemes.push(scheme);
    for(let i=0;i<2;i++) {
      const details=setup.payments?.[i]||{};
      next.payments.push(validatePayment({id:id+':backfill:'+i,schemeId:id,month:addMonth(scheme.startMonth,i),date:details.date||null,amount:10000,rate:details.rate||null,grams:details.grams||null,receipt:details.receipt||'',historical:true},scheme,next));
    }
    return next;
  }
  function dropSignal(s,g,q,today=day()) {
    const slot=schedule(s,g,today).find(x=>x.month===today.slice(0,7));
    if (!slot || !slot.remaining || s.redeemed) return {eligible:false,reason:'No unpaid current instalment'};
    const yesterday=new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10);
    if (!q?.fresh || q.purity!=='22K' || q.source!=='Tanishq' || q.today?.date!==today || q.yesterday?.date!==yesterday || !(q.today.rate>0 && q.yesterday.rate>0)) return {eligible:false,reason:'Comparison unavailable'};
    const changePct=(q.today.rate/q.yesterday.rate-1)*100;
    return {eligible:changePct<=-(s.dropPct??1)+1e-9,changePct,reason:changePct<=-(s.dropPct??1)+1e-9?'Drop threshold reached':'Threshold not reached'};
  }
  function sources(input,m) {
    return [...(input.sips||[]).map(x=>({id:'sip:'+x.id,sourceId:x.id,type:'sip',name:x.name,amount:+x.amount||0,active:x.status==='active' && (!x.startDate || x.startDate.slice(0,7)<=m)})),
      ...activeRDs(input.rds||[],input.gold).map(x=>({id:'rd:'+x.id,sourceId:x.id,type:'rd',name:x.bank||x.label||'Recurring deposit',amount:+x.monthly||0,active:(!x.start || x.start.slice(0,7)<=m) && (!(x.maturity||x.maturityDate) || (x.maturity||x.maturityDate).slice(0,7)>=m)})),
      ...input.gold.schemes.map(x=>({id:'gold:'+x.id,sourceId:x.id,type:'gold',name:x.name,amount:amountAt(x,m),active:!x.redeemed && schedule(x,input.gold).some(p=>p.month===m)}))];
  }
  function categories(input,m) {
    const linked=sources(input,m), manual=input.savings.categories;
    const overrides=manual.filter(x=>x.link);
    const rows=linked.map(x=>{ const o=overrides.find(c=>c.link===x.id); const rev=(o?.revisions||[]).filter(r=>r.month<=m).sort((a,b)=>b.month.localeCompare(a.month))[0]; return {...x,...rev,id:x.id,sourceId:x.sourceId,link:x.id,amount:x.amount,active:x.active && rev?.active!==false,order:o?.order??999}; });
    manual.filter(x=>!x.link).forEach(x=>{const rev=x.revisions.filter(r=>r.month<=m).sort((a,b)=>b.month.localeCompare(a.month))[0]; if(rev) rows.push({...x,...rev});});
    return rows.sort((a,b)=>(a.order??999)-(b.order??999));
  }
  function ledger(input,m) {
    return [...input.savings.contributions.filter(x=>!x.voided && x.month===m),...input.gold.payments.filter(x=>!x.voided && x.month===m).map(x=>({...x,categoryId:'gold:'+x.schemeId,linkedGold:true}))];
  }
  // Same rule as the VPS bot's spending.py: moving your own money is not spending.
  const NOT_SPENDING=['Investment','Mutual Fund','Transfer','Card Bill Payment','Savings'];
  // Recurring reminder: first occurrence on or after today, counted from the original date (31st stays month-end).
  // Same rule as the VPS reminders.py.
  function nextOccurrence(iso,freq,today=day()) {
    const months={monthly:1,quarterly:3,'half-yearly':6,yearly:12}[String(freq).toLowerCase()]||12;
    const [y,m,d]=String(iso).split('-').map(Number); if(!y||!m||!d) return iso;
    for(let k=0;k<2400;k++) {
      const t=y*12+(m-1)+k*months, yy=Math.floor(t/12), mm=t%12+1, last=new Date(Date.UTC(yy,mm,0)).getUTCDate();
      const out=`${yy}-${String(mm).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
      if(out>=today) return out;
    }
    return iso;
  }
  function expenseTransactions(input,m=null) {
    const linked=new Set(input.savings.contributions.filter(c=>!c.voided && c.transactionId).map(c=>String(c.transactionId)));
    return (input.transactions||[]).filter(x=>(!m||(x.date||'').slice(0,7)===m) && !linked.has(String(x.id)) && x.type!=='credit' && x.type!=='income' && x.type!=='transfer' && !NOT_SPENDING.includes(x.category));
  }
  function budget(input,m,preferSnapshot=true) {
    const snapshot=preferSnapshot ? input.savings.months[m] : null;
    const rows=(snapshot?.categories || categories(input,m)).map(c=> { const migrated=input.gold.migrations.find(x=>'rd:'+x.sourceId===c.id); return migrated ? {...c,id:'gold:'+migrated.schemeId,link:'gold:'+migrated.schemeId,sourceId:migrated.schemeId,type:'gold'}:c; });
    const entries=ledger(input,m), categoriesWithPaid=rows.map(c=>{const paid=sum(entries.filter(x=>x.categoryId===c.id),x=>x.amount); const planned=c.active?money(c.amount):0;return {...c,planned,paid,remaining:Math.max(0,money(planned-paid))};});
    const planned=sum(categoriesWithPaid,c=>c.planned), recorded=sum(entries,c=>c.amount);
    const income=snapshot?.income ?? input.income, spending=snapshot?.spending ?? input.spending, target=snapshot?.target ?? input.target;
    const targetAmount=target?.type==='percent'?money(income*(target.value??0)/100):target?.type==='amount'?money(target.value):null;
    const tx=expenseTransactions(input,m);
    return {month:m,income,spending,planned,recorded,remaining:sum(categoriesWithPaid,c=>c.remaining),remainder:money(income-spending-planned),target,targetAmount,categories:categoriesWithPaid,entries,sharesave:snapshot?.sharesave ?? input.sharesave,actualExpenses:tx.length?sum(tx,x=>x.amount):null,actualCount:tx.length,snapshot:!!snapshot};
  }
  function snapshot(input,m) { const b=budget(input,m,false); return {version:1,month:m,savedAt:new Date().toISOString(),income:b.income,spending:b.spending,sharesave:b.sharesave,target:b.target,categories:clone(b.categories),recordedAtSave:b.recorded,actualExpensesAtSave:b.actualExpenses}; }
  function restoreEntries(dump) {
    if (!dump || typeof dump !== 'object' || Array.isArray(dump)) throw Error('Invalid backup');
    const entries=Object.fromEntries(Object.entries(dump).filter(([k])=>k.startsWith('mypf_')));
    if (!Object.keys(entries).length) throw Error('No portfolio records in backup');
    // A full older backup predates the new ledgers: restore its original portfolio, not a mixture.
    if (entries.mypf_v3) {
      if (!entries[GOLD_KEY]) entries[GOLD_KEY]=JSON.stringify(emptyGold());
      if (!entries[SAVINGS_KEY]) entries[SAVINGS_KEY]=JSON.stringify(emptySavings());
    }
    for(const key of [GOLD_KEY,SAVINGS_KEY]) if(entries[key]) {
      const v=typeof entries[key]==='string'?JSON.parse(entries[key]):entries[key];
      if(v.version!==1) throw Error('Unsupported record version in backup');
      for(const field of key===GOLD_KEY?['schemes','payments','migrations']:['categories','contributions']) if(!Array.isArray(v[field])) throw Error('Incomplete ledger in backup');
      entries[key]=JSON.stringify(v);
    }
    return entries;
  }
  return {nextOccurrence,expenseTransactions,restoreEntries,GOLD_KEY,SAVINGS_KEY,clone,money,sum,day,month,validMonth,validDay,addMonth,lastDay,deadline,emptyGold,emptySavings,read,amountAt,schedule,goldSummary,validatePayment,migratedIds,activeRDs,migrateRD,dropSignal,sources,categories,ledger,budget,snapshot};
});
