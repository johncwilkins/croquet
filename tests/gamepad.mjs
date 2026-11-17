import assert from 'node:assert/strict';
import {PAD,stick,PadReader,createGamepadDriver} from '../dist/gamepad.js';
import {createMenuNavigator} from '../dist/gamepad-ui.js';
assert.equal(stick(.17),0);assert.equal(stick(-1),-1);assert.equal(stick(NaN),0);
function setup(){
 const pad={index:0,id:'Xbox controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
 let pads=[pad],time=0,suspended=false;const events=[],state={phase:'aim',human:true,placing:false,swingStage:'idle',modal:false};
 const record=name=>(...args)=>events.push([name,...args]);const actions=new Proxy({
  cancel(){events.push(['cancel']);state.swingStage='idle'},begin(){events.push(['begin']);state.swingStage='power'},release(){events.push(['release']);state.swingStage='accuracy'},center(){events.push(['center']);state.swingStage='idle';state.phase='swing'},
 },{get:(o,k)=>o[k]??record(k)});
 const driver=createGamepadDriver({getState:()=>state,actions,readPads:()=>pads,isSuspended:()=>suspended});
 const tick=(ms=16)=>{time+=ms;driver.update(time)};
 const button=(index,down)=>{pad.buttons[index]={pressed:down,value:down?1:0}};
 tick();events.length=0;
 return {pad,state,events,tick,button,disconnect(){pads=[];tick()},reconnect(){pads=[pad];tick()},suspend(value){suspended=value;tick()}};
}
let g=setup();g.button(PAD.A,true);g.tick();assert.equal(g.state.swingStage,'power');g.tick();g.button(PAD.A,false);g.tick();assert.equal(g.state.swingStage,'accuracy');assert(!g.events.some(e=>e[0]==='center'));
g.button(PAD.A,true);g.tick();assert.equal(g.events.filter(e=>e[0]==='center').length,1);g.tick();g.button(PAD.A,false);g.tick();assert.equal(g.events.filter(e=>e[0]==='center').length,1,'holding/releasing the strike button cannot double strike');
g=setup();g.button(PAD.RT,true);g.tick();g.button(PAD.LT,true);g.tick(40);assert.equal(g.events.at(-1)[0],'power');assert.equal(g.events.at(-1)[1],.01,'LT gives four-times finer power');g.button(PAD.RT,false);g.tick();assert.equal(g.state.swingStage,'accuracy');g.button(PAD.A,true);g.tick();assert.equal(g.events.at(-1)[0],'center','A can centre after RT power');
g=setup();g.button(PAD.A,true);g.tick();g.disconnect();assert.equal(g.state.swingStage,'idle');g.reconnect();g.tick();assert.equal(g.state.swingStage,'idle','reconnecting with A held must not charge');g.button(PAD.A,false);g.tick();g.button(PAD.A,true);g.tick();assert.equal(g.state.swingStage,'power');g.suspend(true);assert.equal(g.state.swingStage,'idle');g.suspend(false);g.tick();assert.equal(g.state.swingStage,'idle');
g=setup();g.button(PAD.B,true);g.tick();assert.equal(g.events.at(-1)[0],'cancel');
g=setup();g.state.modal=true;g.button(PAD.A,true);g.tick();assert.equal(g.events.at(-1)[0],'menuAccept');assert(!g.events.some(e=>e[0]==='begin'));
g.button(PAD.A,false);g.tick();g.button(PAD.DOWN,true);g.tick();assert.equal(g.events.at(-1)[0],'menuMove');assert.equal(g.events.at(-1)[1],1);const initial=g.events.length;g.tick(200);assert.equal(g.events.length,initial);g.tick(200);assert.equal(g.events.at(-1)[0],'menuMove');
g=setup();g.state.placing=true;g.pad.axes=[.8,0,.6,-.7];g.tick();assert(g.events.some(e=>e[0]==='place'));assert(g.events.some(e=>e[0]==='camera'));g.button(PAD.A,true);g.tick();assert.equal(g.events.at(-1)[0],'confirmPlacement');assert(!g.events.some(e=>e[0]==='begin'));
g=setup();g.pad.axes[0]=.8;g.tick();assert(g.events.some(e=>e[0]==='aim'));g.button(PAD.X,true);g.tick();assert(g.events.some(e=>e[0]==='jump'));g.button(PAD.MENU,true);g.tick();assert.equal(g.events.at(-1)[0],'settings');
g=setup();g.state.chooseBall=true;g.button(PAD.RB,true);g.tick();assert(g.events.some(e=>e[0]==='chooseBall'&&e[1]===1));
const reader=new PadReader();let heldPad={axes:[0,0,0,0],buttons:Array(16).fill({pressed:true})};assert.deepEqual(reader.sample(heldPad,0).pressed,[],'waking button is ignored until released');
assert.doesNotThrow(()=>createGamepadDriver({getState:()=>({}),actions:{cancel(){},connected(){}},readPads:()=>{throw Error('denied')}}).update(1));
// Controller-only menu navigation changes native select/range controls directly.
const doc={activeElement:null};function item(tag,extra={}){return {tagName:tag,hidden:false,disabled:false,getClientRects:()=>[{}],classList:{add(){},remove(){}},focus(){doc.activeElement=this},scrollIntoView(){},dispatchEvent(e){this.event=e.type},click(){this.clicked=true},...extra}}
const select=item('SELECT',{value:'pro',options:[{value:'amateur'},{value:'pro'},{value:'master'}]}),range=item('INPUT',{type:'range',value:4.5,min:3,max:32,step:.5}),button=item('BUTTON');
const dialog={scrollTop:0,querySelectorAll:()=>[select,range,button]};doc.querySelectorAll=s=>s==='dialog[open]'?[dialog]:[];
const menu=createMenuNavigator(doc);menu.adjust(1);assert.equal(select.value,'master');assert.equal(select.event,'change');menu.move(1);menu.adjust(-1);assert.equal(range.value,4);assert.equal(range.event,'input');menu.move(1);menu.accept();assert(button.clicked);menu.scroll(60);assert.equal(dialog.scrollTop,60);
console.log('PASS: Xbox power/release/centering, fine control, deadzones, menus, placement, views, ball choice, disconnect/blur protection, API failure and DOM menu navigation');
