import {gatewayInteriorPoints} from './gateway-interior.mjs';
import {FET_GAME_POINT} from './fet-process.mjs';
import {canEnterStage,nextGatewayKnock} from './stage-release.mjs';
import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {Character,characterSheet,defaultCharacter} from './character';
import {weeklyQuests} from './adventure';
import {mapInfo,stageIndex,stageDefinitions,gatewayLocations,arrivalPoint,stageUnlocked} from './maps.mjs';
import type {Save} from './save';
import {npcLocations,adventureLocations,route,walkable,routeToGateway,stageBookPoint} from './navigation.mjs';
export function World({rootAccount,releasedStages,character,name,completed,area,arrival,destination,active,onTalk,onBook,onTranslation,onMiniGame,onBusy,onTravel,onReleaseStage,onRequestRelock,onEnterStage,onPosition,onError}:{rootAccount:boolean;releasedStages:boolean[];character:Character;name:string;completed:number[];area:Save['area'];arrival:number|null;destination:number|null;active:boolean;onBook:()=>void;onTranslation:()=>void;onMiniGame:()=>void;onBusy:(busy:boolean)=>void;onTravel:()=>void;onReleaseStage:(index:number)=>void;onRequestRelock:(index:number)=>void;onEnterStage:(index:number)=>void;onTalk:(i:number)=>void;onPosition:(x:number,y:number)=>void;onError:(text:string)=>void}){
 const root=useRef<HTMLDivElement>(null),live=useRef({rootAccount,releasedStages,character,name,completed,area,arrival,destination,active,onTalk,onBook,onTranslation,onMiniGame,onBusy,onTravel,onReleaseStage,onRequestRelock,onEnterStage,onPosition,onError});live.current={rootAccount,releasedStages,character,name,completed,area,arrival,destination,active,onTalk,onBook,onTranslation,onMiniGame,onBusy,onTravel,onReleaseStage,onRequestRelock,onEnterStage,onPosition,onError};
 useEffect(()=>{
 if(!root.current)return;let disposed=false;const info=mapInfo(area),index=stageIndex(area),stage=index>=0?stageDefinitions[index]:null;const places=area==='adventure'?gatewayLocations:stage?[info.npc!]:npcLocations;const names=stage?[weeklyQuests.find(q=>q.id===stage.questId)!.name]:['길잡이 Dr. 실리콘','상인 엔','결정 동굴 안내자'];const passable=(x:number,y:number)=>walkable(x,y,area)&&(area!=='village'||y<825);const spawn=arrivalPoint(area,arrival);
 const interact=(i:number)=>area==='adventure'?live.current.onEnterStage(i):live.current.onTalk(stage?stage.questId:i);

 class Campus extends Phaser.Scene{
  player?:Phaser.GameObjects.Sprite;label?:Phaser.GameObjects.Text;markers:Phaser.GameObjects.Text[]=[];keys!:Record<string,Phaser.Input.Keyboard.Key>;path:{x:number;y:number}[]=[];pending:number|null=null;dir=2;skinKey='';generation=0;lastUpdate=0;touch={x:0,y:0};destination?:Phaser.GameObjects.Ellipse;busy=false;gate?:Phaser.GameObjects.Image;boat?:Phaser.GameObjects.Image;book?:Phaser.GameObjects.Image;speech?:Phaser.GameObjects.Container;knockIndex=-1;knockCount=0;knockDeadline=0;relockIndex=-1;relockTimer?:Phaser.Time.TimerEvent;relockRing?:Phaser.GameObjects.Graphics;
  preload(){this.load.image('campus',info.image);this.load.spritesheet('journey-props','./journey-props.png',{frameWidth:512,frameHeight:512});if(area==='stage-1')this.load.image('translation-pc','./translation-pc-v1.webp');if(area==='adventure'){for(const stage of stageDefinitions)this.load.image('gateway-'+stage.index,stage.gatewayImage);}this.load.on('loaderror',()=>live.current.onError('맵을 불러오지 못했습니다. 새로고침해 주세요.'));}
  async sprite(c:Character,key:string,x:number,y:number){const sheet=await characterSheet(c);if(disposed)return;const texture=this.textures.addCanvas(key,sheet)!;for(let row=0;row<4;row++)for(let col=0;col<9;col++)texture.add(row*9+col,0,col*64,row*64,64,64);return this.add.sprite(x,y,key,18).setOrigin(.5,.95).setScale(1.7).setDepth(y);}
  create(){
   this.add.image(0,0,'campus').setOrigin(0).setDisplaySize(info.width,info.height);this.cameras.main.setBounds(0,0,info.width,info.height);this.cameras.main.setScroll(0,150);this.cameras.main.roundPixels=true;
   const resize=()=>{const w=this.scale.width,h=this.scale.height;this.cameras.main.setZoom(w<700?1.15:Math.max(w/info.width,h/info.height));};resize();this.scale.on('resize',resize);
   this.destination=this.add.ellipse(768,550,24,12,0xffedb0,.35).setStrokeStyle(2,0xffedb0).setVisible(false).setDepth(900);
   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE',false) as Record<string,Phaser.Input.Keyboard.Key>;
   places.forEach((p,i)=>{if(area==='adventure'){
    const interior=gatewayInteriorPoints(i,p.x,p.y);
    if(interior.length)this.add.graphics().fillStyle(0x090d17,1).fillPoints(interior,true).setDepth(p.y-.1);
    this.add.image(p.x,p.y+8,'gateway-'+i).setOrigin(.5,1).setDisplaySize(112,112).setDepth(p.y);
    this.markers.push(this.add.text(p.x,p.y-113,stageDefinitions[i].title,{fontSize:'16px',color:'#fff3c3',backgroundColor:'#163e49dd',align:'center',wordWrap:{width:190},padding:{x:7,y:6}}).setOrigin(.5,1).setDepth(1500));
    this.markers[i].setInteractive({useHandCursor:true}).on('pointerdown',()=>{
     if(!live.current.active||this.busy||!live.current.rootAccount)return;
     if(!this.player||Math.hypot(this.player.x-p.x,this.player.y-p.y)>=85){this.go(p.x,p.y,null);return;}
     if(!live.current.releasedStages[i])this.knock(i);else this.startRelockHold(i);
    });
    this.add.zone(p.x,p.y-48,100,108).setInteractive({useHandCursor:true}).setDepth(1600).on('pointerdown',()=>{
     if(!live.current.active||this.busy)return;const near=this.player&&Math.hypot(this.player.x-p.x,this.player.y-p.y)<85;
     if(!near){this.go(p.x,p.y,null);return;}
     if(live.current.rootAccount&&live.current.releasedStages[i]){this.startRelockHold(i);return;}
     this.tryGateway(i);
    });return;
   }
   const c={...defaultCharacter,gender:i===2?'female':'male',body:i===1?'sturdy':'agile',hair:i===0?'bangs':i===1?'bedhead':'bob',hairColor:i===0?'#dae0e5':i===1?'#77452f':'#b298d1',outfitColor:i===0?'#e6e9e5':i===1?'#438674':'#695c98'} as Character;this.sprite(c,'npc-'+i,p.x,p.y).catch(e=>live.current.onError(e.message));this.markers.push(this.add.text(p.x,p.y-109,'!',{fontFamily:'sans-serif',fontStyle:'bold',fontSize:'32px',color:'#ffe895',stroke:'#263145',strokeThickness:6}).setOrigin(.5).setDepth(1500));this.add.text(p.x,p.y+5,names[i],{fontSize:'16px',color:'#fff8dd',backgroundColor:'#152c36cc',padding:{x:8,y:4}}).setOrigin(.5,0).setDepth(1500);this.add.zone(p.x,p.y-40,100,120).setInteractive({useHandCursor:true}).setDepth(1600).on('pointerdown',()=>{if(live.current.active)this.go(p.x,p.y+20,i);});});
   if(area==='village')for(const t of [{x:230,y:420,text:'도너 상점'},{x:1330,y:485,text:'실리콘 결정 동굴'}])this.add.text(t.x,t.y,t.text,{fontSize:'20px',color:'#fff4d4',stroke:'#1a3547',strokeThickness:6}).setOrigin(.5).setDepth(1500);
   this.add.text(info.exit.x,area==='village'?725:135,area==='village'?'↓ 나무 관문 · 터치해서 열기':stage?'↑ 모험 대륙으로 돌아가기':'↑ 세미 마을로 돌아가기',{fontSize:'18px',color:'#fff4d4',backgroundColor:'#193d43dd',padding:{x:12,y:10}}).setOrigin(.5).setDepth(1500).setInteractive().on('pointerdown',()=>{if(live.current.active)this.go(info.exit.x,area==='village'?795:info.exit.y,null);});
   if(area==='village'){
    const bubble=this.add.graphics().fillStyle(0xfff3cf,.98).lineStyle(2,0x795b37).fillRoundedRect(-125,-54,250,70,14).strokeRoundedRect(-125,-54,250,70,14).fillTriangle(-8,16,8,16,0,27);const words=this.add.text(0,-19,'무엇이 궁금하니?\n무엇이든 물어보렴',{fontSize:'17px',color:'#443421',align:'center',lineSpacing:5}).setOrigin(.5);this.speech=this.add.container(800,300,[bubble,words]).setDepth(1600).setVisible(false);
    this.gate=this.add.image(768,843,'journey-props',0).setDisplaySize(200,200).setDepth(850);
    this.boat=this.add.image(768,955,'journey-props',2).setDisplaySize(185,185).setDepth(950);
    this.add.zone(768,812,165,160).setInteractive({useHandCursor:true}).setDepth(1601).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(768,795,-1);});
   }
   if(stage){const point=stageBookPoint(area);
    // World-space signposts stay on the actual paths as the camera moves.
    const sign=(x:number,y:number,text:string)=>this.add.text(x,y,text,{fontSize:'17px',color:'#f4e9c5',stroke:'#203543',strokeThickness:3,align:'center'}).setOrigin(.5).setAlpha(.78).setDepth(100);
    sign(645,point.y-24,'← 책 읽기');
    sign(825,info.npc!.y+25,'퀴즈 ↑');
    if(area==='stage-7')sign(825,735,'미니게임 ↓');
    this.book=this.add.image(point.x,point.y-36,'journey-props',3).setDisplaySize(150,150).setDepth(point.y-1);
    this.add.text(point.x,point.y-115,'낡은 책 · 읽기',{fontSize:'16px',color:'#ffe6a3',backgroundColor:'#263c36dd',padding:{x:8,y:6}}).setOrigin(.5).setDepth(1500);
    this.add.zone(point.x,point.y-35,125,145).setInteractive({useHandCursor:true}).setDepth(1601).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(point.x,point.y,-2);});
   }
   if(area==='stage-1'){
    // Place the terminal on the right-hand floor; approach from the existing walkable path.
    const p={x:1140,y:480};
    this.add.ellipse(p.x,p.y+4,70,20,0x8cdee4,.22).setDepth(p.y-1);
    this.add.image(p.x,p.y+8,'translation-pc').setOrigin(.5,1).setDisplaySize(104,104).setDepth(p.y);
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Fixed, interleaved anchors: each glyph only bobs gently in place.
    const letters=[
     {text:'A',x:-43,y:-128},{text:'가',x:-25,y:-106},
     {text:'B',x:-8,y:-130},{text:'나',x:11,y:-108},
     {text:'C',x:29,y:-129},{text:'다',x:47,y:-106}
    ];
    letters.forEach((letter,i)=>{
     const glyph=this.add.text(p.x+letter.x,p.y+letter.y,letter.text,{fontSize:'18px',fontStyle:'bold',color:i%2===0?'#aaf7ff':'#ffe6a3',stroke:'#183247',strokeThickness:3}).setOrigin(.5).setDepth(p.y+1);
     if(!reducedMotion){
      this.tweens.add({targets:glyph,y:glyph.y-(i%3+4),duration:1600+i*170,delay:i*230,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
     }
    });
    this.add.text(p.x,p.y-160,'원서 번역 퀴즈',{fontSize:'16px',color:'#f8edbb',backgroundColor:'#183e49ee',align:'center',padding:{x:10,y:7}}).setOrigin(.5).setDepth(1500);
    this.add.text(895,430,'번역 퀴즈 →',{fontSize:'16px',color:'#f4e9c5',stroke:'#203543',strokeThickness:3}).setOrigin(.5).setAlpha(.78).setDepth(100);
    this.add.zone(p.x,p.y-42,120,112).setInteractive({useHandCursor:true}).setDepth(1601).on('pointerdown',()=>{if(live.current.active&&!this.busy){
     if(!this.player)return;
     if(Math.hypot(this.player.x-1080,this.player.y-485)<42){this.path=[];this.pending=null;this.destination?.setVisible(false);live.current.onTranslation();}
     else{this.go(1080,485,null);live.current.onError('PC 앞에 도착한 뒤 PC를 다시 터치해 주세요.');}
    }});
   }
   if(area==='stage-7'){const p=FET_GAME_POINT;
    this.add.ellipse(p.x,p.y+8,110,35,0x63dbc0,.25).setStrokeStyle(2,0xa3efd0).setDepth(p.y-1);
    this.add.text(p.x,p.y-18,'MOSFET 공정 퍼즐\n미니게임 · 터치해서 시작',{fontSize:'18px',color:'#fff3ba',backgroundColor:'#153e35ee',align:'center',padding:{x:16,y:14}}).setOrigin(.5).setDepth(1500).setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(live.current.active&&!this.busy)this.go(p.x,p.y,-3);});
   }
   this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(!objects.length&&live.current.active){const point=this.cameras.main.getWorldPoint(p.x,p.y);this.go(point.x,point.y,null);}});
   this.input.on('pointerup',()=>this.finishRelockHold());
   this.game.events.on('talk',()=>{if(!this.player||!live.current.active)return;if(area==='adventure'){live.current.onError('입장하려면 관문을 직접 터치하세요.');return;}if(area==='stage-1'&&Math.hypot(this.player.x-1080,this.player.y-485)<42){live.current.onError('번역 퀴즈는 PC를 직접 터치해 시작하세요.');return;}if(area==='stage-7'&&Math.hypot(this.player.x-FET_GAME_POINT.x,this.player.y-FET_GAME_POINT.y)<90){live.current.onMiniGame();return;}if(stage){const b=stageBookPoint(area);if(Math.hypot(this.player.x-b.x,this.player.y-b.y)<90){this.readBook();return;}}if(area==='village'&&this.player.y>745){this.openGate();return;}const i=places.findIndex(p=>Math.hypot(this.player!.x-p.x,this.player!.y-p.y)<110);if(i>=0)interact(i);else live.current.onError('NPC를 터치하면 길을 따라 다가갑니다.');});
   this.game.events.on('navigate',(id:number)=>{const local=area==='adventure'?stageDefinitions.findIndex(s=>s.questId===id):stage?0:id;const p=places[local];if(p&&live.current.active)this.go(p.x,p.y+(area==='adventure'?0:20),area==='adventure'?null:local);});this.game.events.on('direction',(v:{x:number;y:number})=>{this.touch=v;});this.game.events.on('map-target',(p:{x:number;y:number})=>{if(live.current.active)this.go(p.x,p.y,null);});
  }
  go(x:number,y:number,npc:number|null){if(!this.player||this.busy)return;if(area==='village')y=Math.min(y,795);this.path=area==='adventure'&&npc!==null?routeToGateway(this.player.x,this.player.y,npc):route(this.player.x,this.player.y,x,y,area);this.pending=npc;const end=this.path.at(-1);if(end)this.destination?.setPosition(end.x,end.y).setVisible(true);}
  readBook(){
   if(this.busy||!this.book)return;this.busy=true;this.path=[];this.player?.setFrame(this.dir*9);live.current.onBusy(true);
   const texture=this.textures.get('journey-props');if(!texture.has('book-cover'))texture.add('book-cover',0,706,626,127,138);const lifted=this.add.image(this.book.x+4,this.book.y-6,'journey-props','book-cover').setDisplaySize(36,39).setDepth(1800);this.tweens.add({targets:lifted,y:lifted.y-55,scaleX:.65,scaleY:.65,duration:this.motion(450),ease:'Sine.easeOut',onComplete:()=>{lifted.destroy();this.busy=false;live.current.onBusy(false);live.current.onBook();}});
  }
  motion(duration:number){return window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:duration;}
  knock(index:number){
   const next=nextGatewayKnock({index:this.knockIndex,count:this.knockCount,deadline:this.knockDeadline},index,performance.now());this.knockIndex=next.index;this.knockCount=next.count;this.knockDeadline=next.deadline;
   const p=gatewayLocations[index],ring=this.add.circle(p.x,p.y-50,20,0xffdc78,.28).setStrokeStyle(3,0xffdc78).setDepth(1700);this.tweens.add({targets:ring,scale:2.2,alpha:0,duration:this.motion(360),onComplete:()=>ring.destroy()});
   if(!next.released){live.current.onError(`관리자 관문 두드리기 ${this.knockCount}/7`);return;}
   this.knockCount=0;this.knockIndex=-1;live.current.onReleaseStage(index);
  }
  tryGateway(index:number){
   if(!canEnterStage(live.current.completed,index,live.current.rootAccount,live.current.releasedStages[index])){interact(index);return;}
   this.enterGateway(index);
  }
  startRelockHold(index:number){
   this.clearRelockHold();this.relockIndex=index;const p=gatewayLocations[index];this.relockRing=this.add.graphics().setDepth(1750);live.current.onError('관문을 5초 동안 누르면 다시 잠글 수 있습니다. 짧게 누르면 입장합니다.');
   this.relockTimer=this.time.delayedCall(5000,()=>{const selected=this.relockIndex;this.clearRelockHold();if(selected>=0)live.current.onRequestRelock(selected);});
   this.relockRing.lineStyle(5,0xffd87a,.9).strokeCircle(p.x,p.y-50,47);
  }
  finishRelockHold(){const selected=this.relockIndex;if(selected<0)return;this.clearRelockHold();this.tryGateway(selected);}
  clearRelockHold(){this.relockTimer?.remove(false);this.relockTimer=undefined;this.relockRing?.destroy();this.relockRing=undefined;this.relockIndex=-1;}
  enterGateway(index:number){
   if(this.busy||!this.player)return;this.busy=true;this.path=[];this.pending=null;this.touch={x:0,y:0};this.destination?.setVisible(false);live.current.onBusy(true);
   const p=gatewayLocations[index],glow=this.add.circle(p.x,p.y-48,36,0xa7f4ff,.22).setStrokeStyle(3,0xffdf8a,.85).setDepth(p.y+1);this.cameras.main.shake(this.motion(180),.002);
   const startScale=this.player.scaleX;this.dir=0;this.tweens.add({targets:glow,scale:2.1,alpha:0,duration:this.motion(1150),ease:'Sine.easeOut'});
   this.tweens.add({targets:this.label,alpha:0,y:p.y-125,duration:this.motion(850)});
   this.tweens.add({targets:this.player,x:p.x,y:p.y-43,scaleX:.16,scaleY:.16,alpha:0,duration:this.motion(1200),ease:'Sine.easeIn',onUpdate:tween=>{if(this.player)this.player.setFrame(1+Math.floor(tween.progress*10)%8);},onComplete:()=>{glow.destroy();const stillOpen=canEnterStage(live.current.completed,index,live.current.rootAccount,live.current.releasedStages[index]);if(!stillOpen){this.player?.setScale(startScale).setAlpha(1);this.label?.setAlpha(1);this.busy=false;live.current.onBusy(false);interact(index);return;}this.busy=false;live.current.onBusy(false);live.current.onEnterStage(index);}});
  }
  openGate(){
   if(this.busy||!this.player||!this.gate||!this.boat)return;
   if(!live.current.rootAccount&&![0,1,2].every(id=>live.current.completed.includes(id))){live.current.onError('나무 관문이 잠겨 있어요. Dr. 실리콘의 첫걸음 3개를 완료해 열쇠를 받으세요.');return;}
   this.busy=true;this.path=[];this.pending=null;this.touch={x:0,y:0};live.current.onBusy(true);this.player.setFrame(18);
   const key=this.add.text(this.player.x+28,this.player.y-65,'🗝',{fontSize:'38px',color:'#ffe099'}).setOrigin(.5).setDepth(1800);
   this.tweens.add({targets:key,x:768,y:823,duration:this.motion(600),onComplete:()=>{
    this.tweens.add({targets:key,angle:90,duration:this.motion(450),onComplete:()=>{
     key.destroy();const closed=this.add.image(768,843,'journey-props',0).setDisplaySize(200,200).setDepth(851);this.gate!.setFrame(1);this.tweens.add({targets:closed,alpha:0,duration:this.motion(500),onComplete:()=>closed.destroy()});live.current.onError('찰칵! 나무 관문이 열렸어요. 배에 탑승합니다.');
     this.tweens.add({targets:this.player,x:768,y:965,scaleX:1.05,scaleY:1.05,delay:this.motion(450),duration:this.motion(1250),ease:'Sine.easeInOut',onUpdate:tween=>{this.player!.setDepth(this.player!.y).setFrame(19+Math.floor(tween.progress*8)%8);this.label?.setPosition(this.player!.x,this.player!.y-108);},onComplete:()=>{
      this.player!.setScale(.92).setDepth(980).setFrame(18);this.label?.setAlpha(.75).setDepth(981);this.boat!.setDepth(979);this.gate!.setDepth(850);
      const wakes=[0,1,2].map(i=>this.add.ellipse(768,974+i*9,80+i*34,14+i*4,0xc7f4ff,.42-i*.08).setStrokeStyle(2,0xe5fbff,.55).setDepth(978));
      const foam=[this.add.circle(704,970,8,0xe5fbff,.65),this.add.circle(832,970,8,0xe5fbff,.65)].map(v=>v.setDepth(978));
      this.tweens.add({targets:this.boat,angle:{from:-2,to:2},duration:this.motion(520),yoyo:true,repeat:6,ease:'Sine.easeInOut'});
      this.tweens.add({targets:wakes,scaleX:1.35,alpha:.12,duration:this.motion(850),yoyo:true,repeat:3,ease:'Sine.easeOut'});
      this.tweens.add({targets:foam,scale:1.8,alpha:.15,duration:this.motion(650),yoyo:true,repeat:4});
      live.current.onError('물살을 가르며 모험 대륙으로 출항합니다!');this.cameras.main.shake(this.motion(240),.0015);
      this.tweens.add({targets:[this.boat,this.player,this.label,...wakes,...foam].filter(Boolean),y:'+=450',duration:this.motion(4200),ease:'Sine.easeInOut',onComplete:()=>{live.current.onBusy(false);live.current.onTravel();}});
     }});
    }});
   }});
  }
  update(time:number,delta:number){
   const props=live.current,next=JSON.stringify(props.character);
   if(this.relockRing&&this.relockTimer&&this.relockIndex>=0){const p=gatewayLocations[this.relockIndex],progress=this.relockTimer.getProgress();this.relockRing.clear().lineStyle(7,0xffd87a,.95).beginPath().arc(p.x,p.y-50,48,-Math.PI/2,-Math.PI/2+Math.PI*2*progress,false).strokePath();}
   if(next!==this.skinKey){this.skinKey=next;const token=++this.generation;this.sprite(props.character,'player-'+token,this.player?.x??spawn.x,this.player?.y??spawn.y).then(sprite=>{if(!sprite)return;if(token!==this.generation){sprite.destroy();return;}const entering=!this.player;this.player?.destroy();this.player=sprite;if(entering&&area==='adventure'){if(destination!==null){this.path=routeToGateway(sprite.x,sprite.y,destination);this.pending=null;}else if(arrival===null)this.go(768,330,null);}this.cameras.main.startFollow(sprite,true,.12,.12);if(!this.label)this.label=this.add.text(0,0,'',{fontSize:'17px',color:'#fff9e4',backgroundColor:'#223644bb',padding:{x:7,y:3}}).setOrigin(.5);}).catch(e=>props.onError(e.message));}
   if(!this.player)return;const tutorialDone=[0,1,2].every(id=>props.completed.includes(id));this.speech?.setVisible(tutorialDone);if(area==='village')this.markers[0]?.setVisible(!tutorialDone);this.markers.forEach((m,i)=>m.setText(area==='adventure'?(!props.releasedStages[i]?'🔐 ':props.completed.includes(stageDefinitions[i].questId)?'✓ ':stageUnlocked(props.completed,i)?'':'🔒 ')+stageDefinitions[i].title:stage?(props.completed.includes(stage.questId)?'✓':'!'):i===0?([0,1,2].every(q=>props.completed.includes(q))?'✓':'!'):i===1?'$':'◈'));
   this.label?.setPosition(this.player.x,this.player.y-108).setText(props.name).setDepth(1600);
   if(this.busy)return;
   if(!props.active){this.path=[];this.pending=null;this.touch={x:0,y:0};this.keys&&Object.values(this.keys).forEach(k=>k.reset());this.player.setFrame(this.dir*9);this.destination?.setVisible(false);return;}
   const k=this.keys;if(!k)return;let dx=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown)+this.touch.x,dy=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown)+this.touch.y;
   const manual=!!(dx||dy);if(manual){this.path=[];this.pending=null;}else if(this.path.length){dx=this.path[0].x-this.player.x;dy=this.path[0].y-this.player.y;}
   const len=Math.hypot(dx,dy),step=manual?Math.min(delta,40)*.19:Math.min(len,Math.min(delta,40)*.19);let moving=false;
   if(len>.1){this.dir=Math.abs(dx)>Math.abs(dy)?dx>0?3:1:dy>0?2:0;const nx=this.player.x+dx/len*step,ny=this.player.y+dy/len*step;if(passable(nx,ny)){this.player.setPosition(nx,ny);moving=true;}else if(manual){if(passable(nx,this.player.y))this.player.x=nx;if(passable(this.player.x,ny))this.player.y=ny;}else this.path=[];if(!manual&&len<=step+1)this.path.shift();}
   if(!this.path.length){this.destination?.setVisible(false);if(this.pending!==null){const i=this.pending;this.pending=null;if(i===-1){if(this.player.y>750)this.openGate();}else if(i===-2){const b=stageBookPoint(area);if(Math.hypot(this.player.x-b.x,this.player.y-b.y)<90)this.readBook();}else if(i===-3){if(area==='stage-7'&&Math.hypot(this.player.x-FET_GAME_POINT.x,this.player.y-FET_GAME_POINT.y)<90)props.onMiniGame();}else if(Math.hypot(this.player.x-places[i].x,this.player.y-places[i].y)<100)interact(i);}}
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
