import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { quests } from './quests';

export function World({ color, completed, active, onTalk }: { color:string; completed:number[]; active:boolean; onTalk:(i:number)=>void }) {
 const root=useRef<HTMLDivElement>(null);
 const live=useRef({completed,active,onTalk}); live.current={completed,active,onTalk};
 useEffect(()=>{
  if(!root.current)return;
  class Lab extends Phaser.Scene {
   player!:Phaser.GameObjects.Container; keys!:Record<string,Phaser.Input.Keyboard.Key>; target:{x:number;y:number}|null=null;
   labels:Phaser.GameObjects.Text[]=[]; hint!:Phaser.GameObjects.Text; pendingTalk:number|null=null;
   create(){
    const g=this.add.graphics(); g.fillStyle(0x142338);g.fillRect(0,0,880,560);
    g.lineStyle(1,0x24415a,.7);
    for(let x=0;x<880;x+=40)g.lineBetween(x,0,x,560);
    for(let y=0;y<560;y+=40)g.lineBetween(0,y,880,y);
    // A functional top-down laboratory floor plan, with walkable aisles.
    for(const r of [{x:65,y:75,w:300,h:175,c:0x53d5ff},{x:505,y:75,w:300,h:175,c:0x8bef99},{x:505,y:335,w:300,h:170,c:0xffb377}]){
     g.fillStyle(r.c,.065);g.fillRoundedRect(r.x,r.y,r.w,r.h,14);g.lineStyle(2,r.c,.45);g.strokeRoundedRect(r.x,r.y,r.w,r.h,14);
    }
    this.add.text(35,24,'Si / RESEARCH CAMPUS',{fontSize:'17px',fontFamily:'monospace',color:'#91abc4'});
    this.add.text(85,99,'01  기초 연구실',{fontSize:'18px',color:'#91e5ff'});
    this.add.text(525,99,'02  도너 실험실',{fontSize:'18px',color:'#abefb6'});
    this.add.text(525,355,'03  억셉터 실험실',{fontSize:'18px',color:'#ffd2b0'});
    this.add.text(86,425,'이동 → 대화 → 실험',{fontSize:'19px',color:'#bed1e7'});
    this.add.text(86,459,'탐색하며 세 개의 시료를 완성하세요.',{fontSize:'15px',color:'#91abc4'});
    quests.forEach((q,i)=>{
     this.add.circle(q.x,q.y,27,q.color,.13).setStrokeStyle(2,q.color);
     this.add.text(q.x,q.y,q.symbol,{fontSize:'20px',fontFamily:'monospace',color:'#ffffff'}).setOrigin(.5);
     const marker=this.add.zone(q.x,q.y,120,120).setInteractive({useHandCursor:true});
     marker.on('pointerdown',()=>{if(live.current.active){this.target={x:q.x,y:q.y+57};this.pendingTalk=i;}});
     this.labels.push(this.add.text(q.x+35,q.y-25,'!',{fontSize:'25px',color:'#ffe184'}));
     this.add.text(q.x,q.y+35,q.name,{fontSize:'15px',color:'#e1eaf7'}).setOrigin(.5);
    });
    const ring=this.add.circle(0,0,17,Phaser.Display.Color.HexStringToColor(color).color).setStrokeStyle(3,0xffffff);
    const you=this.add.text(0,0,'◆',{fontSize:'18px',color:'#142338'}).setOrigin(.5);
    this.player=this.add.container(220,310,[ring,you]);
    this.hint=this.add.text(440,536,'',{fontSize:'17px',color:'#ffffff',backgroundColor:'#101827'}).setOrigin(.5);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(live.current.active&&!objects.length){this.pendingTalk=null;this.target={x:Phaser.Math.Clamp(p.x,30,850),y:Phaser.Math.Clamp(p.y,55,510)};}});
    this.game.events.on('talk',()=>this.talk());
   }
   nearest(){return quests.findIndex(q=>Phaser.Math.Distance.Between(this.player.x,this.player.y,q.x,q.y)<90);}
   talk(){if(!live.current.active)return;const i=this.nearest();if(i>=0){this.target=null;live.current.onTalk(i);}}
   update(_time:number,delta:number){
    if(!this.player)return;
    this.labels.forEach((l,i)=>l.setText(live.current.completed.includes(i)?'✓':i===live.current.completed.length?'!':'·'));
    this.input.keyboard!.enabled=live.current.active;
    if(!live.current.active){this.target=null;this.pendingTalk=null;return;}
    const k=this.keys;let dx=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown),dy=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown);
    if(dx||dy){this.target=null;this.pendingTalk=null;}
    else if(this.target){dx=this.target.x-this.player.x;dy=this.target.y-this.player.y;if(Math.hypot(dx,dy)<5){this.target=null;dx=dy=0;}}
    const len=Math.hypot(dx,dy),step=Math.min(delta,35)*.21;
    if(len){this.player.x=Phaser.Math.Clamp(this.player.x+dx/len*step,30,850);this.player.y=Phaser.Math.Clamp(this.player.y+dy/len*step,55,510);}
    const i=this.nearest();this.hint.setText(i>=0?`${quests[i].name} · 아래 대화 버튼으로 대화`:'맵 터치로 이동 · NPC 터치로 대화');
    if(this.pendingTalk!==null&&!this.target){const next=this.pendingTalk;this.pendingTalk=null;live.current.onTalk(next);return;}
    if(Phaser.Input.Keyboard.JustDown(k.E)||Phaser.Input.Keyboard.JustDown(k.SPACE))this.talk();
   }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,parent:root.current,width:880,height:560,backgroundColor:'#142338',scene:Lab,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},input:{keyboard:true}});
  const talk=()=>game.events.emit('talk'); window.addEventListener('lab-talk',talk);
  return()=>{window.removeEventListener('lab-talk',talk);game.destroy(true);};
 },[color]);
 return <div className="world" ref={root} role="application" aria-label="실리콘 연구소 맵. 방향키 또는 WASD 이동, E 대화. 터치로 이동할 수도 있습니다."/>;
}
