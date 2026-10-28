/** Return authenticated photo links instead of embedding base64 in list responses. */
export function mediaLinks(path:string,value:any){
 if(!value)return value;const result={...value};
 const url=(field:string,index:number)=>`/api/gateway?action=media&path=${encodeURIComponent(path)}&field=${field}&index=${index}`;
 for(const field of ['photos','gallery'])if(Array.isArray(value[field]))result[field]=value[field].map((_:unknown,index:number)=>url(field,index));
 if(value.imageUrl)result.imageUrl=url('imageUrl',0);
 return result;
}
export function linkedRecords(records:Record<string,any>){return Object.fromEntries(Object.entries(records).map(([path,value])=>[path,mediaLinks(path,value)]));}
