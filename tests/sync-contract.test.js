const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../assets/finance-core'),html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const keys=vm.runInNewContext(html.match(/const SYNC_KEYS = (\[[\s\S]*?\]);/)[1]);
const code=html.slice(html.indexOf('async function supaUpsertAll()'),html.indexOf('async function supaPushNow()'));
test('new records survive existing Supabase upsert and pull contracts',async()=>{
  const store=new Map([[C.GOLD_KEY,JSON.stringify(C.emptyGold())],[C.SAVINGS_KEY,JSON.stringify({...C.emptySavings(),contributions:[{id:'p',amount:10000,month:'2026-10'}]})],['mypf_migration_backup_v1','{"version":1,"backups":[]}']]);
  const cloud=[];const ctx=vm.createContext({FinanceCore:C,SYNC_KEYS:keys,localStorage:{getItem:k=>store.get(k)},_origSetItem:(k,v)=>store.set(k,v),getSupaConfig:()=>({enabled:true,url:'https://example.invalid',key:'test',userKey:'synthetic'}),supaRequest:async(method,path,rows)=>{if(method==='POST'){cloud.push(...rows);return;}return cloud;}});vm.runInContext(code,ctx);
  await ctx.supaUpsertAll();const expected=new Map(store);store.clear();await ctx.supaPullAll();assert.deepEqual(store,expected);assert.ok(cloud.some(x=>x.data_key===C.GOLD_KEY));
});
test('old backup restores without retaining a newer migrated scheme',()=>{const result=C.restoreEntries({mypf_v3:'{"salary":10}',mypf_rds:'[{"id":42}]'});assert.deepEqual(JSON.parse(result[C.GOLD_KEY]),C.emptyGold());assert.deepEqual(JSON.parse(result[C.SAVINGS_KEY]),C.emptySavings());});
test('invalid/newer ledger fails before replacing storage',()=>{assert.throws(()=>C.restoreEntries({[C.GOLD_KEY]:'{"version":2}'}));assert.throws(()=>C.restoreEntries({[C.GOLD_KEY]:'{"version":1}'}));});
