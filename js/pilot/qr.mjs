import {qrcodegen} from './vendor/qrcodegen.mjs?v=20260909-transit3';
export function qrMatrix(url,{highCorrection=false}={}){
  const qr=qrcodegen.QrCode.encodeText(url,highCorrection?qrcodegen.QrCode.Ecc.HIGH:qrcodegen.QrCode.Ecc.MEDIUM);
  return Array.from({length:qr.size},(_,y)=>Array.from({length:qr.size},(_,x)=>qr.getModule(x,y)));
}
// Whole pixel modules and a four-module quiet zone, preserved in PNG export.
export function drawQr(ctx,url,x,y,available=300,{symbol=null}={}){
  const matrix=qrMatrix(url,{highCorrection:!!symbol}),modules=matrix.length+8,scale=Math.floor(available/modules),size=modules*scale;
  if(scale<3)throw new Error('Lenken gir en for tett QR-kode. Bruk en kortere lenke.');
  ctx.fillStyle='#FFFFFF';ctx.fillRect(x,y,size,size);ctx.fillStyle='#000000';
  matrix.forEach((row,ry)=>row.forEach((dark,rx)=>{if(dark)ctx.fillRect(x+(rx+4)*scale,y+(ry+4)*scale,scale,scale);}));
  if(symbol){
    // Small central mark, high error correction and untouched quiet zone.
    const clear=9*scale,mark=7*scale,cx=x+size/2,cy=y+size/2;
    ctx.fillStyle='#FFFFFF';ctx.fillRect(cx-clear/2,cy-clear/2,clear,clear);
    const fit=Math.min(mark/symbol.naturalWidth,mark/symbol.naturalHeight);
    const w=symbol.naturalWidth*fit,h=symbol.naturalHeight*fit;
    ctx.drawImage(symbol,cx-w/2,cy-h/2,w,h);
  }
  return size;
}
