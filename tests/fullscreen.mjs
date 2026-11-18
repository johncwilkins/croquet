import assert from 'node:assert/strict';
import {initFullscreen} from '../dist/fullscreen.js';
function setup({unsupported=false,denied=false}={}){const handlers={},buttonHandlers={},attrs={},notices=[];let enters=0,exits=0,resizes=0;const doc={fullscreenElement:null,documentElement:{},addEventListener:(name,fn)=>handlers[name]=fn};if(!unsupported)doc.documentElement.requestFullscreen=async()=>{enters++;if(denied)throw Error('denied');doc.fullscreenElement=doc.documentElement};doc.exitFullscreen=async()=>{exits++;doc.fullscreenElement=null};globalThis.document=doc;const button={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(k,v)=>buttonHandlers[k]=v};initFullscreen(button,message=>notices.push(message),()=>resizes++);return {doc,handlers,buttonHandlers,attrs,notices,get enters(){return enters},get exits(){return exits},get resizes(){return resizes}}}
let state=setup();
assert.equal(state.enters,0,'initializing the game does not request fullscreen');
assert.equal(state.handlers.click,undefined,'ordinary clicks never request fullscreen');
assert.equal(state.handlers.keydown,undefined,'ordinary keypresses never request fullscreen');
await state.buttonHandlers.click();
assert.equal(state.enters,1);
state.handlers.fullscreenchange();
assert.equal(state.attrs['aria-label'],'Exit fullscreen');
state.doc.fullscreenElement=null;
state.handlers.fullscreenchange();
assert.equal(state.enters,1,'Escape is respected');
await state.buttonHandlers.click();
assert.equal(state.enters,2,'manual re-entry works');
await state.buttonHandlers.click();
assert.equal(state.exits,1);
assert(state.resizes>=3);

state=setup({denied:true});
await state.buttonHandlers.click();
assert.equal(state.notices.length,1,'manual rejection has helpful feedback');
state=setup({unsupported:true});
await state.buttonHandlers.click();
assert.equal(state.notices.length,1,'unsupported browsers get guidance');
console.log('PASS: manual fullscreen only, Escape, resizing, and unavailable API feedback');
