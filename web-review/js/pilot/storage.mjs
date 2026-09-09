import {statusOf} from './model.mjs?v=20260909-transit3';
export const STORAGE_KEY='startuplab-labscreen-pilot-v1';
export function decodeStore(raw) {
  if(raw===null)return null;
  const data=JSON.parse(raw);
  if(data?.version!==1 || !Array.isArray(data.items) || data.items.length>100)throw new Error('Ukjent format på lokal lagring.');
  const ids=new Set();
  for(const item of data.items){statusOf(item);if(ids.has(item.id))throw new Error('To innlegg har samme ID.');ids.add(item.id);}
  return data.items;
}
export function encodeStore(items){return JSON.stringify({version:1,items});}
