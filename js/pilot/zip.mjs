// ZIP method 0 (stored), UTF-8 names. PKWARE APPNOTE 6.3.10, sections 4.3.7–4.3.16.
const encoder=new TextEncoder();
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function zipFiles(files){
  if(!files.length||files.length>65535)throw new Error('Velg minst én fil.');
  const chunks=[],directory=[],names=new Set();let offset=0;
  for(const file of files){
    if(!file.name||/[\\/]/.test(file.name)||names.has(file.name))throw new Error('Ugyldig eller duplisert filnavn.');names.add(file.name);
    const name=encoder.encode(file.name),bytes=typeof file.data==='string'?encoder.encode(file.data):file.data;
    if(!(bytes instanceof Uint8Array)||name.length>65535||bytes.length>0xffffffff)throw new Error('Filen er for stor.');
    const crc=crc32(bytes),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(12,33,true);
    lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(14,33,true);
    cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
    chunks.push(local,bytes);directory.push(central);offset+=local.length+bytes.length;
  }
  const size=directory.reduce((sum,part)=>sum+part.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
  if(offset+size>0xffffffff)throw new Error('Eksporten er for stor.');
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
