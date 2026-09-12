import {catalogItem} from './catalog.mjs';
// Separate RGBA assets contain only artwork; codes and labels stay in the UI.
export function ItemIcon({id}:{id:string}){
 const item=catalogItem(id);if(!item)return <span className="catalog-icon empty-equipment">—</span>;
 return <span className="catalog-icon" aria-hidden="true"><img src={`./item-icons/${item.assetCode}.png`} alt="" style={{width:'100%',height:'100%',objectFit:'contain',filter:item.id==='C01'?'grayscale(1) brightness(1.08)':undefined}}/></span>;
}
