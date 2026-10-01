// GET only by default. Add --live explicitly to spend credits on one test idea.
const target=process.argv.find((arg,i)=>i>1&&!arg.startsWith('--'));
if(!target){console.error('Usage: pnpm smoke https://your-project.vercel.app [--live]');process.exit(1);}
const endpoint=new URL('/api/generate',target);
if(!['http:','https:'].includes(endpoint.protocol))throw Error('Use an HTTP(S) URL.');
const probe=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});
if(probe.status!==405){console.error('Route probe failed. HTTP',probe.status);process.exit(1);}
console.log('PASS: /api/generate exists and rejects GET (405). This does not verify the API key.');
if(process.argv.includes('--live')){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(115000),body:JSON.stringify({product:{product:'Botol air',benefit:'Mudah dibawa',target:'Pekerja pejabat',goal:'branding'},ideas:[{id:1,day:1,ideaNumber:1,duration:8,style:'UGC',storyline:'Introduce a bottle for an office routine',parts:[{stage:'Hook and close',scene:'One presenter shows a water bottle at a desk. Introduce the supplied benefit naturally. Branding only, no sales CTA.'}]}]})});
 let data;try{data=await response.json();}catch{console.error('FAIL: endpoint did not return JSON.');process.exit(1);}
 if(!response.ok||data.success!==true||data.source!=='openai'||!data.ideas?.[0]?.dialogues?.[0]){console.error('FAIL: live generation. HTTP',response.status,'Code:',data.code||'INVALID_RESPONSE');process.exit(1);}
 console.log('PASS: server credential accepted, OpenAI returned dialogue, HTTP client received JSON.');
 console.log('Finish UI verification: generate in Planny and look for the visible Dijana OpenAI label.');
}
