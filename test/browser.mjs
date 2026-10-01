import { createServer } from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHandler } from '../api/generate.js';
console.info=()=>{};console.warn=()=>{};
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
let calls=[],mode='success',failAfter=0;
const handler=createHandler(()=>({responses:{create:async request=>{
 const input=JSON.parse(request.input);calls.push(input);
 if(mode==='failure'||(mode==='partial'&&calls.length>failAfter))throw Object.assign(Error('mock outage'),{status:429});
 const ideas=input.ideas.map(idea=>({id:idea.id,dialogues:idea.parts.map((part,i)=>`Korang tengok idea ${idea.id} versi${calls.length} bahagian ${i+1} ni, semak ciri produk ikut keperluan sendiri sebelum pilih apa yang sesuai nanti untuk rutin harian korang.`.split(/\s+/).slice(0,17+(idea.id%4)).join(' '))}));
 return {status:'completed',output_text:JSON.stringify({ideas})};
}}}));
process.env.OPENAI_API_KEY='browser-test-only';
const server=createServer(async(req,res)=>{
 if(req.url==='/api/generate'){
  let body='';for await(const chunk of req)body+=chunk;
  res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));res.setHeader('Content-Type','application/json');req.body=body;await handler(req,res);
 }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const errors=[];
async function pageFor(options={}){
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 if(options.noStorage)await context.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw Error('blocked');}});Object.defineProperty(navigator,'locks',{value:undefined});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);return page;
}
async function setup(page,duration='8'){
 await page.locator('[data-key="product"]').first().fill('Botol Air');
 // Extra details can be collapsed; fill through the actual form control.
 await page.locator('[data-key="benefit"]').first().evaluate(el=>{el.value='Mudah dibawa';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#easyNext').click();await page.locator('#batchDuration').selectOption(duration);await page.locator('#easyNextTwo').click();
}
async function generate(page){await page.locator('#batchGenerate').click();await page.waitForFunction(()=>!document.getElementById('batchGenerate').disabled,{},{timeout:90000});await page.locator('#batchCards').waitFor();}
try {
 let page=await pageFor();await setup(page);calls=[];await generate(page);
 await page.waitForFunction(()=>document.querySelectorAll('[data-copy-dialogue]:disabled').length===0);
 assert.equal(calls.length,1);assert.equal(calls[0].ideas.length,4);
 assert.equal(await page.locator('.batch-result').count(),4);
 await page.locator('#batchDayPage').selectOption('29');
 await page.waitForFunction(()=>document.querySelectorAll('[data-copy-dialogue]:disabled').length===0);
 assert.equal(calls.length,2);assert.equal(calls[1].ideas[0].id,117);
 await page.locator('#batchDayPage').selectOption('0');await page.waitForTimeout(100);assert.equal(calls.length,2);
 await page.getByRole('button',{name:'Jana semula idea ini',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelector('#batchCards').textContent.includes('Dialog siap dan disimpan.'));
 await page.waitForTimeout(100);assert.equal(calls.length,3);assert.equal(calls[2].ideas.length,1);
 const downloadPromise=page.waitForEvent('download');await page.locator('#batchDownloadProduct').evaluate(el=>el.click());const download=await downloadPromise;const text=fs.readFileSync(await download.path(),'utf8');assert.match(text,/HARI 30/);assert.match(text,/dialog AI belum dijana/);assert.ok(!text.includes('__PLANNY_AI_DIALOGUE__'));
 await page.reload();await page.locator('#savedProductResults').click();await page.waitForTimeout(100);assert.equal(calls.length,3);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 console.log('PASS on-demand 4, day 30, cache reload, regenerate 1, export, mobile');
 await page.context().close();
 page=await pageFor();await setup(page,'56');calls=[];await generate(page);await page.waitForFunction(()=>document.querySelectorAll('[data-copy-dialogue]:disabled').length===0);assert.equal(calls.length,1);assert.equal(calls[0].ideas[0].parts.length,7);await page.context().close();
 page=await pageFor({noStorage:true});await setup(page);calls=[];await generate(page);await page.waitForFunction(()=>document.querySelectorAll('[data-copy-dialogue]:disabled').length===0);assert.equal(calls.length,1);await page.context().close();
 page=await pageFor();await setup(page);calls=[];await generate(page);await page.waitForFunction(()=>document.querySelectorAll('[data-copy-dialogue]:disabled').length===0);
 page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Pilihan tambahan: jana semua 120 dialog',exact:true}).click();await page.getByRole('button',{name:'Pilihan tambahan: jana semua 120 dialog',exact:true}).waitFor();assert.equal(calls.length,30);await page.context().close();
 console.log('PASS 56 seconds, blocked storage, optional 120');
 page=await pageFor();await page.locator('#simpleCreatorTab').click();await page.locator('#product').fill('Tip Menyimpan');await page.locator('#target').fill('Pekerja');await page.locator('#benefit').fill('Rancang');await page.locator('#problem').fill('Sukar');calls=[];await page.locator('#generateBtn').click();await page.waitForFunction(()=>document.querySelector('#cards').textContent.includes('Dialog OpenAI'));assert.equal(calls.length,1);assert.equal(calls[0].ideas.length,4);await page.context().close();
 
 page=await pageFor();await setup(page);mode='failure';calls=[];await generate(page);await page.waitForFunction(()=>document.querySelector('#batchCards').textContent.includes('OPENAI_RATE_LIMIT'));assert.equal(calls.length,1);assert.equal(await page.locator('[data-copy-dialogue]:disabled').count(),4);
 mode='success';await page.getByRole('button',{name:'Jana dialog idea ini',exact:true}).first().click();await page.getByRole('button',{name:'Jana semula idea ini',exact:true}).first().waitFor();assert.equal(calls.length,2);assert.equal(calls[1].ideas.length,1);await page.context().close();
 assert.deepEqual(errors,[]);console.log('PASS creator on-demand, error and explicit retry, no browser errors');
} finally {await browser.close();server.close();}
