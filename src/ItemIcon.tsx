import {catalogItem} from './catalog.mjs';
// Display the approved catalogue's artwork region; IDs and labels are real UI text.
export function ItemIcon({id}:{id:string}){
 const item=catalogItem(id);if(!item)return <span className="catalog-icon empty-equipment">—</span>;
 const x=110+item.col*142.6,y=[105,265,426,575,737,878][item.row];
 return <span className="catalog-icon" aria-hidden="true"><img src="./item-catalog.png" alt="" style={{width:1536/3,height:1024/3,maxWidth:'none',transform:`translate(${-x/3}px,${-y/3}px)`}}/></span>;
}
