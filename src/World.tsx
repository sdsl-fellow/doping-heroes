import {FET_GAME_POINT} from './fet-process.mjs';
import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {Character,characterSheet,defaultCharacter} from './character';
import {weeklyQuests} from './adventure';
import {mapInfo,stageIndex,stageDefinitions,gatewayLocations,arrivalPoint,stageUnlocked} from './maps.mjs';
import type {Save} from './save';
import {npcLocations,adventureLocations,route,walkable,routeToGateway,stageBookPoint} from './navigation.mjs';
export function World({character,name,completed,area,arrival,destination,active,onTalk,onBook,onMiniGame,onBusy,onTravel,onEnterStage,onPosition,onError}:{character:Character;name:string;completed:number[];area:Save['area'];arrival:number|null;destination:number|null;active:boolean;onBook:()=>void;onMiniGame:()=>void;onBusy:(busy:boolean)=>void;onTravel:()=>void;onEnterStage:(index:number)=>void;onTalk:(i:number)=>void;onPosition:(x:number,y:number)=>void;onError:(text:string)=>void}){
 const root=useRef<HTMLDivElement>(null),live=useRef({character,name,completed,area,arrival,destination,active,onTalk,onBook,onMiniGame,onBusy,onTravel,onEnterStage,onPosition,onError});live.current={character,name,completed,area,arrival,destination,active,onTalk,onBook,onMiniGame,onBusy,onTravel,onEnterStage,onPosition,onError};
 useEffect(()=>{
 if(!root.current)return;let disposed=false;const info=mapInfo(area),index=stageIndex(area),stage=index>=0?stageDefinitions[index]:null;const places=area==='adventure'?gatewayLocations:stage?[info.npc!]:npcLocations;const names=stage?[weeklyQuests.find(q=>q.id===stage.questId)!.name]:['길잡이 Dr. 실리콘','상인 엔','결정 동굴 안내자'];const passable=(x:number,y:number)=>walkable(x,y,area)&&(area!=='village'||y<825);const spawn=arrivalPoint(area,arrival);
 const interact=(i:number)=>area==='adventure'?live.current.onEnterStage(i):live.current.onTalk(stage?stage.questId:i);

 class Campus extends Phaser.Scene{
  player?:Phaser.GameObjects.Sprite;label?:Phaser.GameObjects.Text;markers:Phaser.GameObjects.Text[]=[];keys!:Record<string,Phaser.Input.Keyboard.Key>;path:{x:number;y:number}[]=[];pending:number|null=null;dir=2;skinKey='';generation=0;lastUpdate=0;touch={x:0,y:0};destination?:Phaser.GameObjects.Ellipse;busy=false;gate?:Phaser.GameObjects.Image;boat?:Phaser.GameObjects.Image;book?:Phaser.GameObjects.Image;speech?:Phaser.GameObjects.Container;
  preload(){this.load.image('campus',info.image);this.load.spritesheet('journey-props','./journey-props.png',{frameWidth:512,frameHeight:512});if(area==='adventure'){this.load.spritesheet('gateways','./gateways.png',{frameWidth:128,frameHeight:128});this.load.image('silicon-crystal','./silicon-crystal.png');}this.load.on('loaderror',()=>live.current.onError('맵을 불러오지 못했습니다. 새로고침해 주세요.'));}
  async sprite(c:Character,key:string,x:number,y:number){const sheet=await characterSheet(c);if(disposed)return;const texture=this.textures.addCanvas(key,sheet)!;for(let row=0;row<4;row++)for(let col=0;col<9;col++)texture.add(row*9+col,0,col*64,row*64,64,64);return this.add.sprite(x,y,key,18).setOrigin(.5,.95).setScale(1.7).setDepth(y);}
  create(){
   this.add.image(0,0,'campus').setOrigin(0).setDisplaySize(info.width,info.height);this.cameras.main.setBounds(0,0,info.width,info.height);this.cameras.main.setScroll(0,150);this.cameras.main.roundPixels=true;
   const resize=()=>{const w=this.scale.width,h=this.scale.height;this.cameras.main.setZoom(w<700?1.15:Math.max(w/info.width,h/info.height));};resize();this.scale.on('resize',resize);
   this.destination=this.add.ellipse(768,550,24,12,0xffedb0,.35).setStrokeStyle(2,0xffedb0).setVisible(false).setDepth(900);
   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE',false) as Record<string,Phaser.Input.Keyboard.Key>;
   places.forEach((p,i)=>{if(area==='adventure'){this.add.image(p.x,p.y+8,'gateways',i).setOrigin(.5,1).setDisplaySize(112,112).setDepth(p.y);this.markers.push(this.add.text(p.x,p.y-113,stageDefinitions[i].title,{fontSize:'16px',color:'#fff3c3',backgroundColor:'#163e49dd',align:'center',wordWrap:{width:190},padding:{x:7,y:6}}).setOrigin(.5,1).setDepth(1500));if(i===0){this.add.image(p.x,p.y-67,'silicon-crystal').setDisplaySize(30,30).setDepth(p.y+1);}this.add.zone(p.x,p.y-45,190,225).setInteractive().setDepth(1600).on('pointerdown',()=>{if(live.current.active&&!this.busy){if(this.player&&Math.hypot(this.player.x-p.x,this.player.y-p.y)<85)interact(i);else this.go(p.x,p.y,i);}});return;}const c={...defaultCharacter,gender:i===2?'female':'male',body:i===1?'sturdy':'agile',hair:i===0?'bangs':i===1?'bedhead':'bob',hairColor:i===0?'#dae0e5':i===1?'#77452f':'#b298d1',outfitColor:i===0?'#e6e9e5':i===1?'#438674':'#695c98'} as Character;this.sprite(c,'npc-'+i,p.x,p.y).catch(e=>live.current.onError(e.message));this.markers.push(this.add.text(p.x,p.y-109,'!',{fontFamily:'sans-serif',fontStyle:'bold',fontSize:'32px',color:'#ffe895',stroke:'#263145',strokeThickness:6}).setOrigin(.5).setDepth(1500));this.add.text(p.x,p.y+5,names[i],{fontSize:'16px',color:'#fff8dd',backgroundColor:'#152c36cc',padding:{x:8,y:4}}).setOrigin(.5,0).setDepth(1500);this.add.zone(p.x,p.y-40,100,120).setInteractive({useHandCursor:true}).setDepth(1600).on('pointerdown',()=>{if(live.current.active)this.go(p.x,p.y+20,i);});});
   if(area==='village')for(const t of [{x:230,y:420,text:'도너 상점'},{x:1330,y:485,text:'실리콘 결정 동굴'}])this.add.text(t.x,t.y,t.text,{fontSize:'20px',color:'#fff4d4',stroke:'#1a3547',strokeThickness:6}).setOrigin(.5).setDepth(1500);
   this.add.text(info.exit.x,area==='village'?725:135,area==='village'?'↓ 나무 관문 · 터치해서 열기':stage?'↑ 모험 대륙으로 돌아가기':'↑ 세미 마을로 돌아가기',{fontSize:'18px',color:'#fff4d4',backgroundColor:'#193d43dd',padding:{x:12,y:10}}).setOrigin(.5).setDepth(1500).setInteractive().on('pointerdown',()=>{if(live.current.active)this.go(info.exit.x,area==='village'?795:info.exit.y,null);});
   if(area==='village'){
    const bubble=this.add.graphics().fillStyle(0xfff3cf,.98).lineStyle(2,0x795b37).fillRoundedRect(-125,-54,250,70,14).strokeRoundedRect(-125,-54,250,70,14).fillTriangle(-8,16,8,16,0,27);const words=this.add.text(0,-19,'무엇이 궁금하니?\n무엇이든 물어보렴',{fontSize:'17px',color:'#443421',align:'center',lineSpacing:5}).setOrigin(.5);this.speech=this.add.container(800,300,[bubble,words]).setDepth(1600).setVisible(false);
    this.gate=this.add.image(768,843,'journey-props',0).setDisplaySize(200,200).setDepth(850);
    this.boat=this.add.image(768,955,'journey-props',2).setDisplaySize(185,185).setDepth(950);
    this.add.zone(768,812,165,160).setInteractive({useHandCursor:true}).setDepth(1601).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(768,795,-1);});
   }
   if(stage){const point=stageBookPoint(area);
    this.book=this.add.image(point.x,point.y-36,'journey-props',3).setDisplaySize(150,150).setDepth(point.y-1);
    this.add.text(point.x,point.y-115,'낡은 책 · 읽기',{fontSize:'16px',color:'#ffe6a3',backgroundColor:'#263c36dd',padding:{x:8,y:6}}).setOrigin(.5).setDepth(1500);
    this.add.zone(point.x,point.y-35,125,145).setInteractive({useHandCursor:true}).setDepth(1601).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(point.x,point.y,-2);});
   }
   if(area==='stage-11'){const p=FET_GAME_POINT;
    this.add.ellipse(p.x,p.y+8,110,35,0x63dbc0,.25).setStrokeStyle(2,0xa3efd0).setDepth(p.y-1);
    this.add.text(p.x,p.y-18,'MOSFET 공정 퍼즐\n미니게임 · 터치해서 시작',{fontSize:'18px',color:'#fff3ba',backgroundColor:'#153e35ee',align:'center',padding:{x:16,y:14}}).setOrigin(.5).setDepth(1500).setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(p.x,p.y,-3);});
   }
   this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length&&live.current.active){const point=this.cameras.main.getWorldPoint(p.x,p.y);this.go(point.x,point.y,null);}});
   this.game.events.on('talk',()=>{if(!this.player||!live.current.active)return;if(area==='adventure'){live.current.onError('입장하려면 관문을 직접 터치하세요.');return;}if(area==='stage-11'&&Math.hypot(this.player.x-FET_GAME_POINT.x,this.player.y-FET_GAME_POINT.y)<90){live.current.onMiniGame();return;}if(stage){const b=stageBookPoint(area);if(Math.hypot(this.player.x-b.x,this.player.y-b.y)<90){this.readBook();return;}}if(area==='village'&&this.player.y>745){this.openGate();return;}const i=places.findIndex(p=>Math.hypot(this.player!.x-p.x,this.player!.y-p.y)<110);if(i>=0)interact(i);else live.current.onError('NPC를 터치하면 길을 따라 다가갑니다.');});
   this.game.events.on('navigate',(id:number)=>{const local=area==='adventure'?stageDefinitions.findIndex(s=>s.questId===id):stage?0:id;const p=places[local];if(p&&live.current.active)this.go(p.x,p.y+(area==='adventure'?0:20),area==='adventure'?null:local);});this.game.events.on('direction',(v:{x:number;y:number})=>{this.touch=v;});this.game.events.on('map-target',(p:{x:number;y:number})=>{if(live.current.active)this.go(p.x,p.y,null);});
  }
  go(x:number,y:number,npc:number|null){if(!this.player||this.busy)return;if(area==='village')y=Math.min(y,795);this.path=area==='adventure'&&npc!==null?routeToGateway(this.player.x,this.player.y,npc):route(this.player.x,this.player.y,x,y,area);this.pending=npc;const end=this.path.at(-1);if(end)this.destination?.setPosition(end.x,end.y).setVisible(true);}
  readBook(){
   if(this.busy||!this.book)return;this.busy=true;this.path=[];this.player?.setFrame(this.dir*9);live.current.onBusy(true);
   const texture=this.textures.get('journey-props');if(!texture.has('book-cover'))texture.add('book-cover',0,706,626,127,138);const lifted=this.add.image(this.book.x+4,this.book.y-6,'journey-props','book-cover').setDisplaySize(36,39).setDepth(1800);this.tweens.add({targets:lifted,y:lifted.y-55,scaleX:.65,scaleY:.65,duration:this.motion(450),ease:'Sine.easeOut',onComplete:()=>{lifted.destroy();this.busy=false;live.current.onBusy(false);live.current.onBook();}});
  }
  motion(duration:number){return window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:duration;}
  openGate(){
   if(this.busy||!this.player||!this.gate||!this.boat)return;
   if(![0,1,2].every(id=>live.current.completed.includes(id))){live.current.onError('나무 관문이 잠겨 있어요. Dr. 실리콘의 첫걸음 3개를 완료해 열쇠를 받으세요.');return;}
   this.busy=true;this.path=[];this.pending=null;this.touch={x:0,y:0};live.current.onBusy(true);this.player.setFrame(18);
   const key=this.add.text(this.player.x+28,this.player.y-65,'🗝',{fontSize:'38px',color:'#ffe099'}).setOrigin(.5).setDepth(1800);
   this.tweens.add({targets:key,x:768,y:823,duration:this.motion(600),onComplete:()=>{
    this.tweens.add({targets:key,angle:90,duration:this.motion(450),onComplete:()=>{
     key.destroy();const closed=this.add.image(768,843,'journey-props',0).setDisplaySize(200,200).setDepth(851);this.gate!.setFrame(1);this.tweens.add({targets:closed,alpha:0,duration:this.motion(500),onComplete:()=>closed.destroy()});live.current.onError('찰칵! 나무 관문이 열렸어요. 배에 탑승합니다.');
     this.tweens.add({targets:this.player,y:985,delay:this.motion(500),duration:this.motion(1100),onUpdate:()=>{this.player!.setDepth(this.player!.y);this.label?.setPosition(this.player!.x,this.player!.y-108);},onComplete:()=>{
      this.player!.setScale(.95).setDepth(980);this.boat!.setDepth(979);this.gate!.setDepth(850);
      const wake=this.add.ellipse(768,966,90,18,0xc7f4ff,.4).setDepth(978);
      live.current.onError('모험 대륙으로 출항합니다!');
      this.tweens.add({targets:[this.boat,this.player,this.label,wake].filter(Boolean),y:'+=450',duration:this.motion(4500),ease:'Sine.easeInOut',onComplete:()=>{live.current.onBusy(false);live.current.onTravel();}});
     }});
    }});
   }});
  }
  update(time:number,delta:number){
   const props=live.current,next=JSON.stringify(props.character);
   if(next!==this.skinKey){this.skinKey=next;const token=++this.generation;this.sprite(props.character,'player-'+token,this.player?.x??spawn.x,this.player?.y??spawn.y).then(sprite=>{if(!sprite)return;if(token!==this.generation){sprite.destroy();return;}const entering=!this.player;this.player?.destroy();this.player=sprite;if(entering&&area==='adventure'){if(destination!==null){this.path=routeToGateway(sprite.x,sprite.y,destination);this.pending=null;}else if(arrival===null)this.go(768,330,null);}this.cameras.main.startFollow(sprite,true,.12,.12);if(!this.label)this.label=this.add.text(0,0,'',{fontSize:'17px',color:'#fff9e4',backgroundColor:'#223644bb',padding:{x:7,y:3}}).setOrigin(.5);}).catch(e=>props.onError(e.message));}
   if(!this.player)return;const tutorialDone=[0,1,2].every(id=>props.completed.includes(id));this.speech?.setVisible(tutorialDone);if(area==='village')this.markers[0]?.setVisible(!tutorialDone);this.markers.forEach((m,i)=>m.setText(area==='adventure'?(props.completed.includes(stageDefinitions[i].questId)?'✓ ':stageUnlocked(props.completed,i)?'':'🔒 ')+stageDefinitions[i].title:stage?(props.completed.includes(stage.questId)?'✓':'!'):i===0?([0,1,2].every(q=>props.completed.includes(q))?'✓':'!'):i===1?'$':'◈'));
   this.label?.setPosition(this.player.x,this.player.y-108).setText(props.name).setDepth(1600);
   if(this.busy)return;
   if(!props.active){this.path=[];this.pending=null;this.touch={x:0,y:0};this.keys&&Object.values(this.keys).forEach(k=>k.reset());this.player.setFrame(this.dir*9);this.destination?.setVisible(false);return;}
   const k=this.keys;if(!k)return;let dx=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown)+this.touch.x,dy=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown)+this.touch.y;
   const manual=!!(dx||dy);if(manual){this.path=[];this.pending=null;}else if(this.path.length){dx=this.path[0].x-this.player.x;dy=this.path[0].y-this.player.y;}
   const len=Math.hypot(dx,dy),step=manual?Math.min(delta,40)*.19:Math.min(len,Math.min(delta,40)*.19);let moving=false;
   if(len>.1){this.dir=Math.abs(dx)>Math.abs(dy)?dx>0?3:1:dy>0?2:0;const nx=this.player.x+dx/len*step,ny=this.player.y+dy/len*step;if(passable(nx,ny)){this.player.setPosition(nx,ny);moving=true;}else if(manual){if(passable(nx,this.player.y))this.player.x=nx;if(passable(this.player.x,ny))this.player.y=ny;}else this.path=[];if(!manual&&len<=step+1)this.path.shift();}
   if(!this.path.length){this.destination?.setVisible(false);if(this.pending!==null){const i=this.pending;this.pending=null;if(i===-1){if(this.player.y>750)this.openGate();}else if(i===-2){const b=stageBookPoint(area);if(Math.hypot(this.player.x-b.x,this.player.y-b.y)<90)this.readBook();}else if(i===-3){if(area==='stage-11'&&Math.hypot(this.player.x-FET_GAME_POINT.x,this.player.y-FET_GAME_POINT.y)<90)props.onMiniGame();}else if(Math.hypot(this.player.x-places[i].x,this.player.y-places[i].y)<100)interact(i);}}
   const exiting=area==='village'?false:this.player.y<info.exit.y+30&&Math.abs(this.player.x-info.exit.x)<60;
   if(exiting){this.player.y=area==='village'?890:info.exit.y+100;this.path=[];props.onTravel();}

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
