import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=html.slice(html.indexOf('      // One shuffled, persistent set'),html.indexOf('      function makeIdea(index)'));
const random=html.match(/      function seededRandom[^\n]+/)[0];
const shuffle=html.match(/      function shuffled[^\n]+/)[0];
function app(storage){
 const context=vm.createContext({localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:webcrypto});
 vm.runInContext(random+'\n'+shuffle+'\n'+block,context);return context;
}
test('120 distinct angles persist across reload, cover every slot and follow product facts',()=>{
 const storage=new Map(),context=app(storage),product={product:'Botol air',target:'Pekerja pejabat',benefit:'Mudah dibawa'};
 context.product=product;
 const angles=vm.runInContext('marketingAnglesFor(product)',context);
 assert.equal(angles.length,120);assert.equal(new Set(angles.map(a=>a.title)).size,120);
 assert.equal(new Set(angles.map(a=>a.id)).size,120);
 assert.notDeepEqual(angles.map(a=>a.id),Array.from({length:120},(_,i)=>i+1));
 assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('marketingAnglesFor(product)',context))),JSON.parse(JSON.stringify(angles)));
 const reloaded=app(storage);reloaded.product=product;
 assert.equal(JSON.stringify(vm.runInContext('marketingAnglesFor(product)',reloaded)),JSON.stringify(angles));
 const other=vm.runInContext('marketingAnglesFor({...product,product:"Beg kerja"})',context);
 assert.notDeepEqual(other.map(a=>a.id),angles.map(a=>a.id));
 for(let index=0;index<120;index++){
  context.index=index;
  const result=vm.runInContext('aiMarketingContext(product,index,{angle:"Lama",flow:"Lama",parts:[{scene:"Scene",image:"Angle: Lama",video:"Angle: Lama"}]})',context);
  assert.equal(result.angle,angles[index].title);assert.ok(result.flow.includes(angles[index].title));
  for(const field of ['scene','image','video'])assert.ok(result.parts[0][field].includes(angles[index].title));
  assert.ok(result.flow.includes('tanpa mereka fakta'));
 }
});
test('blocked storage keeps assignment stable in session and invalid stored orders are replaced',()=>{
 const bad=new Map([['planny-marketing-angles-120-v1',JSON.stringify({x:Array(120).fill(0)})]]);
 const context=app(bad);assert.equal(vm.runInContext('marketingAngleAssignments.size',context),0);
 context.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const first=vm.runInContext('marketingAnglesFor({product:"Botol"})',context);
 assert.equal(JSON.stringify(first),JSON.stringify(vm.runInContext('marketingAnglesFor({product:"Botol"})',context)));
 const creator=vm.runInContext('aiMarketingContext({product:"Botol"},119,{angle:"old",parts:[{scene:"Scene"}]})',context);
 assert.equal(creator.parts[0].image,'');assert.equal(creator.parts[0].video,'');
});
