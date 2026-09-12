import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBgm,BGM_KEY} from '../src/bgm.mjs';
function fixture(initial){
 const values=new Map(initial?[[BGM_KEY,initial]]:[]),events=new Map();let hidden=false;
 const audio={plays:0,pauses:0,play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;},load(){},removeAttribute(){},addEventListener(k,fn){events.set(k,fn);},removeEventListener(k){events.delete(k);}};
 const c=createBgm({audio,storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},isHidden:()=>hidden});
 return {c,audio,values,events,hide:v=>hidden=v};
}
test('default enabled waits for gesture; looping quiet playback is a singleton',async()=>{
 const {c,audio}=fixture();assert.equal(audio.plays,0);assert.equal(audio.loop,true);assert.ok(audio.volume<1);
 await c.start();await c.start();assert.equal(audio.plays,1);assert.equal(c.snapshot().playing,true);c.destroy();
});
test('off persists and remains off through gestures and tab return',async()=>{
 const {c,audio,values,hide}=fixture('off');await c.start();assert.equal(audio.plays,0);
 c.toggle();await Promise.resolve();assert.equal(values.get(BGM_KEY),'on');c.toggle();assert.equal(values.get(BGM_KEY),'off');
 hide(true);c.visibility();hide(false);c.visibility();assert.equal(c.snapshot().playing,false);assert.equal(audio.plays,1);c.destroy();
});
test('hidden tab pauses; return resumes without changing preference',async()=>{
 const {c,hide,audio}=fixture();await c.start();hide(true);c.visibility();assert.equal(c.snapshot().playing,false);
 hide(false);c.visibility();await Promise.resolve();assert.equal(audio.plays,2);c.destroy();
});
test('mute during pending playback cannot leak audio',async()=>{
 const {c,audio}=fixture();let resolve;audio.play=()=>new Promise(r=>{resolve=r;});const pending=c.start();c.toggle();resolve();await pending;
 assert.equal(c.snapshot().playing,false);assert.equal(c.snapshot().enabled,false);assert.ok(audio.pauses>0);c.destroy();
});
test('autoplay rejection is caught and next gesture retries',async()=>{
 const {c,audio}=fixture();audio.play=()=>Promise.reject({name:'NotAllowedError'});await c.start();assert.equal(c.snapshot().error,false);
 audio.play=()=>Promise.resolve();await c.start();assert.equal(c.snapshot().playing,true);c.destroy();
});
