'use strict';
const C = require('../assets/finance-core');
const SOURCE_URL = 'https://www.tanishq.co.in/gold-rate.html?lang=en';
const TTL = 15 * 60 * 1000;
const plain = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&#8377;|&#x20b9;|&rupee;/gi,'₹').replace(/\s+/g,' ');
function parseRates(html) {
  // Tanishq publishes all purities as row attributes. Read only the explicit 22K field.
  const headlineTable=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(x=>x[0]).find(x=>/class=["'][^"']*\bgoldrate-table-22kt\b/.test(x));
  const historyTable=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(x=>x[0]).find(x=>/class=["'][^"']*\bgoldrate-history-table\b/.test(x));
  const headline=headlineTable && plain(headlineTable).match(/1\s*G\s*₹\s*([\d,]+(?:\.\d+)?)/);
  if(!headline || !historyTable) throw Error('Published 22K rate table unavailable');
  const history=[],seen=new Map();
  for(const row of historyTable.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
    const d=plain(row[0]).match(/(\d{2})-(\d{2})-(\d{4})/), value=row[0].match(/data-goldrate22kt=["']([\d,.]+)["']/i);
    if(!d) continue;
    if(!value) throw Error('Dated row has no explicit 22K rate');
    const date=`${d[3]}-${d[2]}-${d[1]}`,rate=Number(value[1].replace(/,/g,''));
    if(!C.validDay(date)||!(rate>0&&rate<1000000)) throw Error('Invalid published rate');
    if(seen.has(date)) {if(seen.get(date)!==rate)throw Error('Conflicting published rates');continue;}
    seen.set(date,rate);history.push({date,rate});
  }
  history.sort((a,b)=>b.date.localeCompare(a.date));
  if(!history.length || history[0].rate!==Number(headline[1].replace(/,/g,''))) throw Error('22K headline and dated history do not match');
  return history.slice(0,31);
}
function normalize(history, fetchedAt, now=new Date(), failed=false) {
  const today=C.day(now), yesterday=new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const current=history.find(x=>x.date===today)||null, previous=history.find(x=>x.date===yesterday)||null;
  const fresh=!failed && !!current && now-Date.parse(fetchedAt)<TTL*2;
  return {version:1,source:'Tanishq',sourceUrl:SOURCE_URL,purity:'22K',currency:'INR',unit:'gram',fetchedAt,today:current,yesterday:previous,history,fresh,freshness:fresh?'fresh':failed?'upstream unavailable':'stale',comparisonAvailable:fresh&&!!previous};
}
function createProvider(fetcher=fetch, clock=()=>new Date()) {
  let cache=null, inflight=null, retryAfter=0;
  async function load() {
    const now=clock();
    if(cache && now-Date.parse(cache.fetchedAt)<TTL && now<retryAfter) return normalize(cache.history,cache.fetchedAt,now,cache.failed);
    if(cache && !cache.failed && now-Date.parse(cache.fetchedAt)<TTL) return normalize(cache.history,cache.fetchedAt,now);
    if(now<retryAfter && cache) return normalize(cache.history,cache.fetchedAt,now,true);
    if(inflight) return inflight;
    inflight=(async()=>{
      try {
        const response=await fetcher(SOURCE_URL,{signal:AbortSignal.timeout(12000),headers:{Accept:'text/html','User-Agent':'FinFolio/1.0 (public gold rate reader)'},redirect:'error'});
        if(!response.ok) throw Error('Rate source unavailable');
        const html=await response.text(); if(html.length>3000000) throw Error('Rate response too large');
        cache={history:parseRates(html),fetchedAt:clock().toISOString(),failed:false}; retryAfter=+clock()+TTL;
      } catch { cache={history:cache?.history||[],fetchedAt:cache?.fetchedAt||null,failed:true}; retryAfter=+clock()+60000; }
      return normalize(cache.history,cache.fetchedAt,clock(),cache.failed);
    })();
    try {return await inflight;} finally {inflight=null;}
  }
  return load;
}
const getRates=createProvider();
async function handler(event) {
  if(event.httpMethod!=='GET') return {statusCode:405,headers:{Allow:'GET'},body:JSON.stringify({error:'Method not allowed'})};
  const data=await getRates();
  return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'},body:JSON.stringify(data)};
}
module.exports={handler,parseRates,normalize,createProvider};
