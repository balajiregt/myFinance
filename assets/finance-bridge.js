/* Compatibility helpers for the original portfolio readers. */
function ffGoldData() { return FinanceCore.read(localStorage,FinanceCore.GOLD_KEY,FinanceCore.emptyGold); }
function ffActiveRDs(rows) { return FinanceCore.activeRDs(rows,ffGoldData()); }
function ffGoldReminders() {
  const g=ffGoldData(), month=FinanceCore.month();
  return g.schemes.filter(s=>!s.redeemed).flatMap(s=>FinanceCore.goldSummary(s,g).slots
    .filter(slot=>slot.month<=month && slot.remaining>0)
    .map(slot=>({type:'gold',source:'auto',schemeId:s.id,title:`Gold instalment: ${s.name} · ${slot.month}`,dueDate:slot.due,amount:slot.remaining,detail:'Unpaid balance · record payment in Gold'})));
}
function ffFreshQuote() {
  const q=JSON.parse(localStorage.getItem('mypf_tanishq_quote')||'null');
  if(q) q.fresh=!!q.fresh && q.today?.date===FinanceCore.day() && Date.now()-Date.parse(q.fetchedAt)<30*60*1000;
  return q;
}
function ffGoldValue() { const g=ffGoldData(); return FinanceCore.sum(g.schemes,s=>FinanceCore.goldSummary(s,g,ffFreshQuote()).value); }
function ffRedeemedValue(g) { const q=ffFreshQuote();return q?.fresh ? Math.round(g.grams*q.today.rate) : g.costBasis; }
function ffSIPBudget() {
  if(window.FinanceUI) return FinanceCore.sum(FinanceCore.budget(FinanceUI.input(),FinanceCore.month()).categories.filter(c=>c.type==='sip'),c=>c.planned);
  return FinanceCore.sum(JSON.parse(localStorage.getItem('mypf_sip_plans')||'[]').filter(p=>p.status==='active'),p=>p.amount);
}
