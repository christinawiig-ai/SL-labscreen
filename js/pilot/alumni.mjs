// Standard deck slide 6a / template 25. Original logo assets, original order.
export const ALUMNI_LOGOS=[
  ['kahoot','Kahoot!'],['remarkable','reMarkable'],['huddly','Huddly'],['otovo','Otovo'],['ardoq','Ardoq'],
  ['no-isolation','No Isolation'],['zivid','Zivid'],['heimdall-power','Heimdall Power'],['photoncycle','Photoncycle'],['kosli','Kosli'],
  ['spoor','Spoor'],['akigai','Akigai'],['auk','Auk'],['dune','Dune']
].map(([id,name])=>({id,name,image:`assets/alumni/${id}.${id==='auk'?'png':'svg'}`}));
