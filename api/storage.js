import {createHash, randomUUID} from 'node:crypto';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const modelName = () => process.env.OPENAI_MODEL?.trim() || 'gpt-6-luna';
export const effort = () => process.env.OPENAI_REASONING_EFFORT?.trim() || 'none';
export async function redis(...command) {
  const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token) throw Error('DATABASE_NOT_CONFIGURED');
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(1500)});
  if(!response.ok) throw Error('DATABASE_UNAVAILABLE');
  const data=await response.json(); if(data.error)throw Error('DATABASE_UNAVAILABLE'); return data.result;
}
export async function logUsage(event, db=redis) {
  const pricing=event.model==='gpt-6-luna'&&Number.isFinite(event.inputTokens)&&Number.isFinite(event.outputTokens)?{estimatedUsd:((event.inputTokens-(event.cachedInputTokens||0))*0.1+(event.cachedInputTokens||0)*0.01+event.outputTokens*0.5)/1000000}:{};
  const row={id:randomUUID(),time:new Date().toISOString(),...event,...pricing};
  console.info('planny.usage',JSON.stringify(row));
  try { await db('SET',`planny8:usage:${row.time.slice(0,10)}:${row.id}`,JSON.stringify(row),'EX',2592000); }
  catch { console.warn('planny.usage.database_unavailable'); }
}
export async function increment(key, ttl, db=redis) {
  return Number(await db('EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",1,key,ttl));
}
