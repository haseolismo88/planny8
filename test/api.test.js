import {test} from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import handler,{createHandler,words,signature,validate,checkOutput} from '../api/generate.js';
const line='Korang nak sambal rangup untuk nasi panas hari ni, tengok pilihan ni dulu dan semak detail sebelum beli.';
const body={product:{product:'Sambal',benefit:'Rangup',goal:'branding'},ideas:[{id:1,day:1,ideaNumber:1,duration:8,style:'UGC',voice:'female',engine:'Google Flow',storyline:'Hook → detail → CTA',parts:[{scene:'Show the product',stage:'Hook'}]}],avoid:[]};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};}
async function run(fn=handler,request={}){const res=response();await fn({method:'POST',headers:{},body,...request},res);return res;}
const good={status:'completed',output_text:JSON.stringify({ideas:[{id:1,dialogues:[line]}]})};
const fake=fn=>createHandler(()=>({responses:{create:fn}}));
test('Malay count, IDs, context and batch boundaries',()=>{
 assert.equal(words(line),18);assert.equal(words('a — b'),2);assert.equal(signature('Korang, NAK!'),signature('korang nak'));
 const input=validate(body);assert.equal(input.ideas[0].parts[0].end,8);assert.equal(input.product.goal,'branding');
 assert.equal(checkOutput(JSON.parse(good.output_text),input),null);
 for(const output of [{ideas:[null]},{ideas:[{id:2,dialogues:[line]}]},{ideas:[{id:1,dialogues:['Pendek']}]},{ideas:[]}])assert.ok(checkOutput(output,input));
 assert.ok(checkOutput(JSON.parse(good.output_text),{...input,avoid:[line]}));
 assert.throws(()=>validate({...body,ideas:[null]}));assert.throws(()=>validate({...body,ideas:[{...body.ideas[0],duration:16}]}));
 assert.throws(()=>validate({...body,ideas:Array(11).fill(body.ideas[0])}));
 assert.equal(validate({...body,ideas:Array.from({length:10},(_,i)=>({...body.ideas[0],id:i+1}))}).ideas.length,10);
});
test('method, validation, size, cross-site and missing-key failures never call SDK',async()=>{
 const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{
  const fn=fake(()=>{throw Error('must not call');});
  assert.equal((await run(fn,{method:'GET'})).code,405);
  assert.equal((await run(fn,{body:'broken'})).code,400);
  assert.equal((await run(fn,{body:{product:{product:'x'.repeat(1100001)}}})).code,413);
  assert.equal((await run(fn,{headers:{'sec-fetch-site':'cross-site'}})).code,403);
  const res=await run(fn);assert.equal(res.code,503);assert.equal(res.data.code,'MISSING_API_KEY');
 }finally{if(key!==undefined)process.env.OPENAI_API_KEY=key;}
});
test('SDK request, bounded repair, errors and no secret leakage',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only-secret';
 try{
  let calls=0;
  const fn=fake(async request=>{calls++;assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.ok(request.input.includes('Show the product'));assert.ok(request.instructions.includes('Branding'));return calls===1?{status:'completed',output_text:'invalid'}:good;});
  const res=await run(fn);assert.equal(res.code,200);assert.equal(res.data.source,'openai');assert.equal(calls,2);
  calls=0;assert.equal((await run(fake(async()=>{calls++;return {status:'incomplete'};}))).code,422);assert.equal(calls,3);
  assert.equal((await run(fake(async()=>({output:[{content:[{type:'refusal'}]}]})))).data.code,'AI_REFUSAL');
  for(const [status,expected,code] of [[401,502,'OPENAI_AUTH'],[403,502,'OPENAI_MODEL_ACCESS'],[404,502,'OPENAI_MODEL_ACCESS'],[429,429,'OPENAI_RATE_LIMIT'],[500,502,'OPENAI_UNAVAILABLE'],[0,502,'OPENAI_UNAVAILABLE']]){
   const result=await run(fake(async()=>{throw Object.assign(Error('test-only-secret'),{status});}));
   assert.equal(result.code,expected);assert.equal(result.data.code,code);assert.ok(!JSON.stringify(result).includes('test-only-secret'));
  }
  assert.equal((await run(fake(async()=>{throw Object.assign(Error(),{name:'APIConnectionTimeoutError'});}))).code,504);
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('real official SDK serializes the Responses API request and parses its response',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let calls=0;
 try{
  const fn=createHandler(()=>new OpenAI({apiKey:'test-only',maxRetries:0,fetch:async(url,options)=>{
   calls++;assert.equal(String(url),'https://api.openai.com/v1/responses');const payload=JSON.parse(options.body);assert.equal(payload.model,'gpt-6-luna');
   return new Response(JSON.stringify({id:'resp_test',object:'response',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:good.output_text,annotations:[]}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }}));
  const res=await run(fn);assert.equal(res.code,200);assert.equal(res.data.ideas[0].dialogues[0],line);assert.equal(calls,1);
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});

const makeLine=(n,id=1)=>Array.from({length:n},(_,i)=>i===0?'idea'+id:'kata'+i).join(' ');
test('accept 17–20 words and reject 16/21, nonstrings and exact duplicates',()=>{
 const input=validate(body);
 for(const n of [16,17,18,19,20,21])assert.equal(checkOutput({ideas:[{id:1,dialogues:[makeLine(n)]}]},input)===null,n>=17&&n<=20);
 for(const value of [null,{},17])assert.ok(checkOutput({ideas:[{id:1,dialogues:[value]}]},input));
 const two=validate({...body,ideas:[{...body.ideas[0],duration:16,parts:[...body.ideas[0].parts,...body.ideas[0].parts]}]});
 assert.ok(checkOutput({ideas:[{id:1,dialogues:[makeLine(17),makeLine(17).toUpperCase()+'!']}]},two));
 assert.equal(checkOutput({ideas:[{id:1,dialogues:[makeLine(17,1),makeLine(17,2)]}]},two),null);
});
test('1 and 10 ideas at 8, 32 and 56 seconds; repair only bad parts across three attempts',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 try{
  for(const size of [1,10])for(const duration of [8,32,56]){
   const payload={...body,ideas:Array.from({length:size},(_,i)=>({...body.ideas[0],id:i+1,duration,parts:Array.from({length:duration/8},()=>({scene:'Product scene'}))}))};
   let calls=0,first;
   const fn=fake(async request=>{
    calls++;const input=JSON.parse(request.input);
    if(calls>1){assert.equal(input.ideas.length,1);assert.equal(input.ideas[0].id,size);assert.equal(input.ideas[0].parts.length,1);assert.equal(input.ideas[0].parts[0].number,duration/8);}
    const ideas=input.ideas.map(idea=>({id:idea.id,dialogues:idea.parts.map(part=>calls<3&&idea.id===size&&part.number===duration/8?'too short':makeLine(17+(part.number%4),idea.id+'part'+part.number))}));
    if(calls===1)first=structuredClone(ideas);
    return {status:'completed',output_text:JSON.stringify({ideas})};
   });
   const result=await run(fn,{body:payload});assert.equal(result.code,200);assert.equal(calls,3);
   assert.equal(checkOutput(result.data,validate(payload)),null);
   for(let i=0;i<size;i++)for(let j=0;j<duration/8;j++)if(i!==size-1||j!==duration/8-1)assert.equal(result.data.ideas[i].dialogues[j],first[i].dialogues[j]);
  }
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('repair duplicates, wrong IDs and wrong part counts without replacing valid ideas',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 try{
  const payload={...body,ideas:[body.ideas[0],{...body.ideas[0],id:2}]};
  for(const bad of [{id:2,dialogues:[line]},{id:99,dialogues:[makeLine(17)]},{id:2,dialogues:[]}]){
   let calls=0;
   const result=await run(fake(async request=>{
    calls++;if(calls===1)return {status:'completed',output_text:JSON.stringify({ideas:[{id:1,dialogues:[line]},bad]})};
    const input=JSON.parse(request.input);assert.deepEqual(input.ideas.map(i=>i.id),[2]);assert.ok(input.avoid.includes(line));
    return {status:'completed',output_text:JSON.stringify({ideas:[{id:2,dialogues:[makeLine(20,2)]}]})};
   }),{body:payload});
   assert.equal(result.code,200);assert.equal(result.data.ideas[0].dialogues[0],line);assert.equal(calls,2);
  }
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('request timeouts shrink within the overall Vercel budget',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';const now=Date.now;let elapsed=0;Date.now=()=>elapsed;
 try{
  const timeouts=[];const fn=createHandler(()=>({responses:{create:async(_request,options)=>{timeouts.push(options.timeout);elapsed+=45000;return {status:'incomplete'};}}}));
  const result=await run(fn);assert.equal(result.code,504);assert.deepEqual(timeouts,[45000,45000]);
 }finally{Date.now=now;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
