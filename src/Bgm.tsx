import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {BGM_URL,createBgm} from './bgm.mjs';
import './bgm.css';
const Context=createContext({enabled:true,playing:false,error:false,toggle:()=>{}});
export function BgmProvider({children}:{children:ReactNode}){
 const [state,setState]=useState({enabled:true,playing:false,error:false});
 const controller=useRef<ReturnType<typeof createBgm>|null>(null);
 useEffect(()=>{
  const audio=new Audio(BGM_URL);
  const storage={getItem:(key:string)=>window.localStorage.getItem(key),setItem:(key:string,value:string)=>window.localStorage.setItem(key,value)};
  const music=createBgm({audio,storage,onChange:setState,isHidden:()=>document.hidden});controller.current=music;
  const gesture=(event:Event)=>{if(event.target instanceof Element&&event.target.closest('[data-bgm-toggle]'))return;void music.start();};
  const visibility=()=>music.visibility();
  document.addEventListener('pointerdown',gesture,{passive:true});document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',visibility);music.destroy();controller.current=null;};
 },[]);
 return <Context.Provider value={{...state,toggle:()=>controller.current?.toggle()}}>{children}</Context.Provider>;
}
export function BgmButton(){
 const {enabled,playing,error,toggle}=useContext(Context);
 const status=!enabled?'OFF':error?'재시도':playing?'ON':'대기';
 return <div className="bgm-controls"><button type="button" data-bgm-toggle className="bgm-toggle" aria-label={error?'배경음 재생 다시 시도':enabled?'배경음 끄기':'배경음 켜기'} aria-pressed={enabled} onClick={toggle} title={enabled&&!playing&&!error?'화면을 터치하면 작은 항해 BGM이 재생됩니다.':'작은 항해 · 배경음 '+status}><span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M8 14V4l8-2v10M8 7l8-2"/><ellipse cx="5" cy="15" rx="3" ry="2"/><ellipse cx="13" cy="13" rx="3" ry="2"/>{!enabled&&<path d="M2 2l16 16"/>}</svg>BGM {status}</span></button></div>;
}
