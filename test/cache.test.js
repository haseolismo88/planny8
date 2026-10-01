import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCachedHandler} from '../api/generate.js';
function fakeDB(){const map=new Map();return {map,db:async(cmd,key,...args)=>{
 if(cmd==='GET')return map.get(key)||null;
 if(cmd==='SET'){if(args.includes('NX')&&map.has(key))return null;map.set(key,args[0]);return 'OK';}
 if(cmd==='EVAL'){const k=args[1];if(key.includes('INCR')){const n=(map.get(k)||0)+1;map.set(k,n);return n;}if(map.get(k)===args[2])map.delete(k);return 1;}
 throw Error('Unknown command');
}};}
const body={product:{product:'Botol'},ideas:[1,2,3,4].map(id=>({id,parts:[{scene:'Product detail'}]}))};
const line=id=>Array.from({length:18},(_,i)=>i===0?'idea'+id:'kata'+i).join(' ');
async function invoke(handler,b=body){const res={setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{},body:b},res);return res;}
test('database reuse, one-idea regeneration, context invalidation and request logs',async()=>{
 const {map,db}=fakeDB();let calls=[];
 const core=async(req,res)=>{calls.push(req.body);res.status(200).json({ideas:req.body.ideas.map(x=>({id:x.id,dialogues:[line(x.id)]}))});};
 const handler=createCachedHandler(core,db);
 assert.equal((await invoke(handler)).code,200);assert.equal(calls.length,1);
 const cached=await invoke(createCachedHandler(core,db));assert.equal(cached.data.cacheHits,4);assert.equal(calls.length,1);
 await invoke(handler,{...body,ideas:[body.ideas[0]],regenerate:true});assert.equal(calls.length,2);assert.equal(calls[1].ideas.length,1);
 await invoke(handler,{...body,product:{product:'Produk baru'}});assert.equal(calls.length,3);
 assert.equal([...map.keys()].filter(k=>k.startsWith('planny8:usage:')).length,4);
 assert.equal((await invoke(handler,{...body,regenerate:true})).code,400);
});
test('missing database fails closed; concurrent duplicate returns busy without extra AI',async()=>{
 let calls=0;const failed=createCachedHandler(async()=>{calls++;},async()=>{throw Error();});
 assert.equal((await invoke(failed)).code,503);assert.equal(calls,0);
 const {db}=fakeDB();let release,entered;const ready=new Promise(r=>entered=r);
 const handler=createCachedHandler(async(req,res)=>{calls++;entered();await new Promise(r=>release=r);res.status(200).json({ideas:req.body.ideas.map(x=>({id:x.id,dialogues:[line(x.id)]}))});},db);
 const first=invoke(handler);await ready;assert.equal((await invoke(handler)).code,409);release();assert.equal((await first).code,200);assert.equal(calls,1);
});
test('daily limit blocks misses but permits cached results',async()=>{
 const previous=process.env.DAILY_GENERATION_LIMIT;process.env.DAILY_GENERATION_LIMIT='1';
 try{const {db}=fakeDB();let calls=0;const h=createCachedHandler(async(req,res)=>{calls++;res.status(200).json({ideas:req.body.ideas.map(x=>({id:x.id,dialogues:[line(x.id)]}))});},db);
 assert.equal((await invoke(h)).code,200);assert.equal((await invoke(h)).code,200);assert.equal((await invoke(h,{...body,product:{product:'new'}})).data.code,'DAILY_LIMIT');assert.equal(calls,1);
 }finally{if(previous===undefined)delete process.env.DAILY_GENERATION_LIMIT;else process.env.DAILY_GENERATION_LIMIT=previous;}
});
