export const BGM_KEY='doping-heroes:bgm-enabled:v1';
export const BGM_URL='./audio/little-voyage-v2.mp3';
export function createBgm({audio,storage,onChange=(_state)=>{},isHidden=()=>false}){
 let enabled=true,playing=false,error=false,disposed=false,pending=null;
 try{enabled=storage.getItem(BGM_KEY)!=='off';}catch{}
 audio.loop=true;audio.preload='none';audio.volume=.7;
 const snapshot=()=>({enabled,playing,error});
 const emit=()=>{if(!disposed)onChange(snapshot());};
 const pause=()=>{audio.pause();playing=false;emit();};
 async function start(){
  if(disposed||!enabled||isHidden()||pending||playing)return;
  error=false;
  // play() is called synchronously within the user's gesture.
  try{
   pending=Promise.resolve(audio.play());
   await pending;
   if(disposed||!enabled||isHidden()){audio.pause();playing=false;}
   else playing=true;
  }catch(problem){playing=false;error=problem?.name!=='NotAllowedError'&&problem?.name!=='AbortError';}
  finally{pending=null;emit();}
 }
 const onPause=()=>{playing=false;emit();};
 const onPlaying=()=>{if(disposed||!enabled||isHidden()){pause();return;}playing=true;error=false;emit();};
 const onError=()=>{playing=false;error=true;emit();};
 audio.addEventListener('pause',onPause);audio.addEventListener('playing',onPlaying);audio.addEventListener('error',onError);
 emit();
 return {
  snapshot,start,
  toggle(){
   if(error&&enabled){audio.load();void start();return;}
   enabled=!enabled;error=false;
   try{storage.setItem(BGM_KEY,enabled?'on':'off');}catch{}
   if(enabled)void start();else pause();emit();
  },
  visibility(){if(isHidden())pause();else void start();},
  destroy(){disposed=true;audio.pause();audio.removeEventListener('pause',onPause);audio.removeEventListener('playing',onPlaying);audio.removeEventListener('error',onError);audio.removeAttribute('src');audio.load();},
 };
}
