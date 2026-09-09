// Profiles and copy adapted from standarddeck template 62.
// Notion destination verified through the connected workspace on 8 September 2026.
export const EIR_URL='https://app.notion.com/p/f066780a83984adda4f90244932b1e6c';
export const EIR_PROFILES=[
  ['magnus-gran-jansen','Magnus Gran-Jansen','reMarkable product leader during growth to $430m revenue.'],
  ['hege-nikolaisen','Hege Nikolaisen','1X: communications through growth from 30 to 450 people.'],
  ['katherine-barrios','Katherine Barrios','Xeneta: 20 to 250 people and $108m in funding.'],
  ['kristian-solheim','Kristian Solheim','Built Cutters to 140 salons in five countries.'],
  ['richard-stratford','Richard Stratford','Co-founded OncoImmunity; sold to NEC as CEO.'],
  ['murshid-hugberg-ali','Murshid Hugberg-Ali','Raised €100m+; two Oslo Børs listings.'],
  ['kimberly-larsen','Kimberly Larsen','Former INDY RIOT CEO; experience raising and investing.'],
  ['christian-saeterhaug','Christian Sæterhaug','Gelato VP. Launched its first US office in Boston.']
].map(([id,name,bio])=>({name,bio,image:`assets/eir/${id}.jpg`}));
export const EIR_NETWORK={type:'eir-network',eyebrow:'EXECUTIVES AND ENTREPRENEURS IN RESIDENCE',title:'Operators who have\ndone it.',body:'40+ executives and serial founders who have built, scaled and exited companies, on hand to challenge your thinking.',expertise:'Scaling and growth\nSales and go-to-market\nFundraising and commercialisation\nDigital product and technology\nMarketing and brand\nInternationalisation',detail:'',location:'',cta:'Explore the EIR network',url:EIR_URL,profiles:EIR_PROFILES};
