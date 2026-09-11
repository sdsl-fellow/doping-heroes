import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {Character,characterSheet,defaultCharacter} from './character';
import {weeklyQuests} from './adventure';
import {npcLocations,adventureLocations,route,walkable} from './navigation.mjs';
export function World({character,name,completed,area,arrival,active,onTalk,onTravel,onPosition,onError}:{character:Character;name:string;completed:number[];area:'village'|'adventure';arrival:number|null;active:boolean;onTravel:()=>void;onTalk:(i:number)=>void;onPosition:(x:number,y:number)=>void;onError:(text:string)=>void}){
 const root=useRef<HTMLDivElement>(null),live=useRef({character,name,completed,area,arrival,active,onTalk,onTravel,onPosition,onError});live.current={character,name,completed,area,arrival,active,onTalk,onTravel,onPosition,onError};
 useEffect(()=>{
 if(!root.current)return;let disposed=false;const places=area==='adventure'?adventureLocations:npcLocations;const names=area==='adventure'?weeklyQuests.map(q=>q.name):['길잡이 Dr. 실리콘','상인 엔','결정 동굴 안내자'];const passable=(x:number,y:number)=>walkable(x,y,area);
 class Campus extends Phaser.Scene{
  player?:Phaser.GameObjects.Sprite;label?:Phaser.GameObjects.Text;markers:Phaser.GameObjects.Text[]=[];keys!:Record<string,Phaser.Input.Keyboard.Key>;path:{x:number;y:number}[]=[];pending:number|null=null;dir=2;skinKey='';generation=0;lastUpdate=0;touch={x:0,y:0};destination?:Phaser.GameObjects.Ellipse;
  preload(){this.load.image('campus',area==='adventure'?'./adventure.webp':'./campus.webp');this.load.on('loaderror',()=>live.current.onError('맵을 불러오지 못했습니다. 새로고침해 주세요.'));}
  async sprite(c:Character,key:string,x:number,y:number){const sheet=await characterSheet(c);if(disposed)return;const texture=this.textures.addCanvas(key,sheet)!;for(let row=0;row<4;row++)for(let col=0;col<9;col++)texture.add(row*9+col,0,col*64,row*64,64,64);return this.add.sprite(x,y,key,18).setOrigin(.5,.95).setScale(1.7).setDepth(y);}
  create(){
   this.add.image(0,0,'campus').setOrigin(0);this.cameras.main.setBounds(0,0,1536,1024);this.cameras.main.setScroll(0,150);
   const resize=()=>{const w=this.scale.width,h=this.scale.height;this.cameras.main.setZoom(w<700?1.15:Math.max(w/1536,h/1024));};resize();this.scale.on('resize',resize);
   this.destination=this.add.ellipse(768,550,24,12,0xffedb0,.35).setStrokeStyle(2,0xffedb0).setVisible(false).setDepth(900);
   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE',false) as Record<string,Phaser.Input.Keyboard.Key>;
   places.forEach((p,i)=>{const c={...defaultCharacter,gender:i===2?'female':'male',body:i===1?'sturdy':'agile',hair:i===0?'bangs':i===1?'bedhead':'bob',hairColor:i===0?'#dae0e5':i===1?'#77452f':'#b298d1',outfitColor:i===0?'#e6e9e5':i===1?'#438674':'#695c98'} as Character;this.sprite(c,'npc-'+i,p.x,p.y).catch(e=>live.current.onError(e.message));this.markers.push(this.add.text(p.x,p.y-109,'!',{fontFamily:'sans-serif',fontStyle:'bold',fontSize:'32px',color:'#ffe895',stroke:'#263145',strokeThickness:6}).setOrigin(.5).setDepth(1500));this.add.text(p.x,p.y+5,names[i],{fontSize:'16px',color:'#fff8dd',backgroundColor:'#152c36cc',padding:{x:8,y:4}}).setOrigin(.5,0).setDepth(1500);this.add.zone(p.x,p.y-40,100,120).setInteractive({useHandCursor:true}).setDepth(1600).on('pointerdown',()=>{if(live.current.active)this.go(p.x,p.y+20,i);});});
   for(const t of (area==='village'?[{x:768,y:325,text:'세미 어드벤처'},{x:230,y:420,text:'도너 상점'},{x:1330,y:485,text:'실리콘 결정 동굴'}]:weeklyQuests.map((q,i)=>({x:places[i].x,y:places[i].y-145,text:q.week+'주차 · '+q.region}))))this.add.text(t.x,t.y,t.text,{fontSize:'20px',color:'#fff4d4',stroke:'#1a3547',strokeThickness:6,fontStyle:'bold'}).setOrigin(.5).setDepth(1500);
   this.add.text(768,865,area==='village'?'↓ 남쪽 다리 · 모험 대륙':'↓ 세미 마을로 돌아가기',{fontSize:'19px',color:'#fff4d4',backgroundColor:'#193d43dd',padding:{x:12,y:10}}).setOrigin(.5).setDepth(1500).setInteractive().on('pointerdown',()=>{if(live.current.active)this.go(768,955,null);});
   this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length&&live.current.active){const point=this.cameras.main.getWorldPoint(p.x,p.y);this.go(point.x,point.y,null);}});
   this.game.events.on('talk',()=>{if(!this.player||!live.current.active)return;const i=places.findIndex(p=>Math.hypot(this.player!.x-p.x,this.player!.y-p.y)<110);if(i>=0)live.current.onTalk(area==='adventure'?i+3:i);else live.current.onError('NPC를 터치하면 길을 따라 다가갑니다.');});
   this.game.events.on('navigate',(i:number)=>{const local=area==='adventure'?i-3:i;const p=places[local];if(p&&live.current.active)this.go(p.x,p.y+20,local);});this.game.events.on('direction',(v:{x:number;y:number})=>{this.touch=v;});this.game.events.on('map-target',(p:{x:number;y:number})=>{if(live.current.active)this.go(p.x,p.y,null);});
  }
  go(x:number,y:number,npc:number|null){if(!this.player)return;this.path=route(this.player.x,this.player.y,x,y,area);this.pending=npc;const end=this.path.at(-1);if(end)this.destination?.setPosition(end.x,end.y).setVisible(true);}
  update(time:number,delta:number){
   const props=live.current,next=JSON.stringify(props.character);
   if(next!==this.skinKey){this.skinKey=next;const token=++this.generation;this.sprite(props.character,'player-'+token,this.player?.x??(area==='adventure'&&arrival!==null?places[arrival]?.x??768:768),this.player?.y??(area==='adventure'?(arrival!==null?(places[arrival]?.y??800)+20:820):590)).then(sprite=>{if(!sprite)return;if(token!==this.generation){sprite.destroy();return;}this.player?.destroy();this.player=sprite;this.cameras.main.startFollow(sprite,true,.12,.12);if(!this.label)this.label=this.add.text(0,0,'',{fontSize:'17px',color:'#fff9e4',backgroundColor:'#223644bb',padding:{x:7,y:3}}).setOrigin(.5);}).catch(e=>props.onError(e.message));}
   if(!this.player)return;this.markers.forEach((m,i)=>m.setText(area==='adventure'?(props.completed.includes(i+3)?'✓':'!'):i===0?([0,1,2].every(q=>props.completed.includes(q))?'✓':'!'):i===1?'$':'◈'));
   this.label?.setPosition(this.player.x,this.player.y-108).setText(props.name).setDepth(1600);
   if(!props.active){this.path=[];this.pending=null;this.touch={x:0,y:0};this.keys&&Object.values(this.keys).forEach(k=>k.reset());this.player.setFrame(this.dir*9);this.destination?.setVisible(false);return;}
   const k=this.keys;if(!k)return;let dx=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown)+this.touch.x,dy=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown)+this.touch.y;
   const manual=!!(dx||dy);if(manual){this.path=[];this.pending=null;}else if(this.path.length){dx=this.path[0].x-this.player.x;dy=this.path[0].y-this.player.y;}
   const len=Math.hypot(dx,dy),step=manual?Math.min(delta,40)*.19:Math.min(len,Math.min(delta,40)*.19);let moving=false;
   if(len>.1){this.dir=Math.abs(dx)>Math.abs(dy)?dx>0?3:1:dy>0?2:0;const nx=this.player.x+dx/len*step,ny=this.player.y+dy/len*step;if(passable(nx,ny)){this.player.setPosition(nx,ny);moving=true;}else if(manual){if(passable(nx,this.player.y))this.player.x=nx;if(passable(this.player.x,ny))this.player.y=ny;}else this.path=[];if(!manual&&len<=step+1)this.path.shift();}
   if(!this.path.length){this.destination?.setVisible(false);if(this.pending!==null){const i=this.pending;this.pending=null;if(Math.hypot(this.player.x-places[i].x,this.player.y-places[i].y)<100)props.onTalk(area==='adventure'?i+3:i);}}
   if(this.player.y>925&&Math.abs(this.player.x-768)<55){this.player.y=890;this.path=[];props.onTravel();}
   this.player.setDepth(this.player.y).setFrame(this.dir*9+(moving?1+Math.floor(time/110)%8:0));
   if(time-this.lastUpdate>160){props.onPosition(this.player.x,this.player.y);this.lastUpdate=time;}
   if(Phaser.Input.Keyboard.JustDown(k.E)||Phaser.Input.Keyboard.JustDown(k.SPACE))this.game.events.emit('talk');
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent:root.current,backgroundColor:'#284d42',scene:Campus,pixelArt:true,scale:{mode:Phaser.Scale.RESIZE,width:root.current.clientWidth,height:root.current.clientHeight},input:{activePointers:3}});
 const listeners=[['lab-talk','talk'],['lab-navigate','navigate'],['lab-direction','direction'],['lab-map-target','map-target']].map(([dom,event])=>{const fn=(e:Event)=>game.events.emit(event,(e as CustomEvent).detail);window.addEventListener(dom,fn);return {dom,fn};});
 return()=>{disposed=true;listeners.forEach(({dom,fn})=>window.removeEventListener(dom,fn));game.destroy(true);};
 },[area]);
 return <div ref={root} className="world" role="application" aria-label="세미 월드. 맵 터치로 이동하고 NPC 터치로 대화합니다."/>;
}
