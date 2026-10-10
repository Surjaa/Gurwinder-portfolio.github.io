/* =========================================================
   LARDER — catalog + pricing rules
   Loaded by the browser (index.html) AND by server.js, so
   the server can re-check prices instead of trusting the browser.
   Edit products, categories and coupons here.
   ========================================================= */
const FREE_AT = 499;          // free standard delivery above this subtotal (Rs)
const STEP_MS = 40000;        // demo order tracking advances one stage every 40s

// Pack sizes. m = price multiplier against the base price (m:1 = the base size).
const SIZES = {
  snack:[{l:'50 g',m:.5},{l:'100 g',m:1},{l:'250 g',m:2.3}],
  kg:   [{l:'500 g',m:1},{l:'1 kg',m:1.9},{l:'2 kg',m:3.7}],
  flour:[{l:'2 kg',m:.45},{l:'5 kg',m:1},{l:'10 kg',m:1.9}],
  nut:  [{l:'250 g',m:1},{l:'500 g',m:1.9},{l:'1 kg',m:3.6}],
  jar:  [{l:'340 g',m:1},{l:'750 g',m:2.1}]
};
const CATS = [
  {id:'grains',   name:'Grains & Flours',     subs:['Flours','Rice & Poha','Millets'], blurb:'Chakki-fresh and stone-ground', pid:'atta'},
  {id:'pulses',   name:'Pulses & Soya',       subs:['Dals','Soya'],                    blurb:'Protein for every plate',       pid:'soya-chunks'},
  {id:'snacks',   name:'Snacks & Makhana',    subs:['Makhana'],                        blurb:'Roasted, not fried',            pid:'makhana-pp'},
  {id:'nuts',     name:'Dry Fruits & Seeds',  subs:['Nuts','Seeds'],                   blurb:'Whole, graded and sealed',      pid:'almonds'},
  {id:'breakfast',name:'Breakfast & Spreads', subs:['Cereals','Spreads'],              blurb:'Quick, filling starts',         pid:'muesli'}
];
const COUPONS = {
  WELCOME10:{t:'pct', v:10, cap:150, min:299, d:'10% off up to ₹150 above ₹299'},
  FLAT50:   {t:'flat',v:50,           min:399, d:'₹50 off above ₹399'},
  FREESHIP: {t:'ship',               min:199, d:'Free delivery above ₹199'}
};
const NEEDS = [['High protein','/search?q=protein'],['Under ₹150','/products?max=150'],['Millets','/category/grains?sub=Millets'],['Top rated','/products?sort=rating']];
const ORDER_STATUSES = ['New','Packed','Shipped','Delivered','Cancelled'];

const mk = o => Object.assign({stock:12,types:[],tags:'',tl:'Variant'},o);
const PRODUCTS = [
  mk({id:'makhana-pp',name:'Roasted Makhana – Peri Peri',lab:'Makhana|Peri Peri',brand:'Kora',cat:'snacks',sub:'Makhana',price:149,mrp:199,rating:4.5,reviews:2310,sz:'snack',types:['Peri Peri','Himalayan Salt','Cream & Onion'],tl:'Flavour',pouch:'#C2412D',fill:'#F7EBD4',dot:6,tint:'#F9DDD3',badge:'Bestseller',protein:9,shelf:'6 months',origin:'Mithila, Bihar',tags:'snack healthy light protein',desc:'Fox nuts popped and dry-roasted in small batches, then dusted with real spices. Light, crunchy and easy to carry.'}),
  mk({id:'makhana-raw',name:'Premium Raw Makhana',lab:'Raw|Makhana',brand:'Harvest Hill',cat:'snacks',sub:'Makhana',price:299,mrp:380,rating:4.3,reviews:980,sz:'snack',pouch:'#2F5D8A',fill:'#FFFBF0',dot:7,tint:'#DCE8F4',protein:9.7,shelf:'9 months',origin:'Darbhanga, Bihar',tags:'snack fasting vrat',desc:'Large, bright fox nuts, graded by size. Roast them yourself, add to kheer or cook in ghee for a quick vrat snack.'}),
  mk({id:'soya-chunks',name:'High-Protein Soya Chunks',lab:'Soya|Chunks',brand:'Sunmill',cat:'pulses',sub:'Soya',price:119,mrp:150,rating:4.4,reviews:5120,sz:'kg',pouch:'#9A6A12',fill:'#D9B26A',dot:5,tint:'#F3E6C7',badge:'Bestseller',protein:52,shelf:'12 months',origin:'Madhya Pradesh',tags:'protein high-protein vegan meal maker',desc:'De-fatted soya chunks that soak up gravies and hold their bite. Boil for five minutes, squeeze, and cook as usual.'}),
  mk({id:'soya-granules',name:'Soya Granules',lab:'Soya|Granules',brand:'Sunmill',cat:'pulses',sub:'Soya',price:99,mrp:125,rating:4.1,reviews:1432,sz:'kg',pouch:'#7A5A1E',fill:'#CDA668',dot:3,tint:'#EFE0C2',protein:50,shelf:'12 months',origin:'Madhya Pradesh',tags:'protein vegan keema',desc:'Fine granules for keema, cutlets, parathas and wraps. Rehydrates in minutes.'}),
  mk({id:'besan',name:'Stone-Ground Besan',lab:'Besan|Gram Flour',brand:'Sunmill',cat:'grains',sub:'Flours',price:89,mrp:110,rating:4.6,reviews:3890,sz:'kg',pouch:'#D4A017',fill:'#F0D066',dot:2.2,tint:'#FAEFC4',badge:'Top rated',protein:22,shelf:'6 months',origin:'Rajasthan',tags:'flour chickpea pakora kadhi protein',desc:'Slow stone-ground chana flour with a nutty smell. Makes smooth batter for pakoras, kadhi and laddoos.'}),
  mk({id:'atta',name:'Chakki Whole Wheat Atta',lab:'Chakki|Atta',brand:'Harvest Hill',cat:'grains',sub:'Flours',price:279,mrp:320,rating:4.5,reviews:6210,sz:'flour',types:['Regular','Multigrain'],tl:'Blend',pouch:'#8C5A2B',fill:'#E7D2B0',dot:2.5,tint:'#F0E2CC',protein:12,shelf:'3 months',origin:'Sehore, Madhya Pradesh',tags:'wheat roti flour',desc:'Whole wheat milled the chakki way, so the bran stays in. Soft rotis that stay soft.'}),
  mk({id:'poha-thick',name:'Thick Poha',lab:'Thick|Poha',brand:'Terra Pantry',cat:'grains',sub:'Rice & Poha',price:69,mrp:85,rating:4.2,reviews:1760,sz:'kg',pouch:'#3E8E7E',fill:'#F2EBCF',dot:5,tint:'#D6EEE8',protein:6.6,shelf:'8 months',origin:'Indore, Madhya Pradesh',tags:'breakfast rice flakes',desc:'Sturdy flakes that stay separate when cooked. Rinse, rest for two minutes, then temper with mustard and curry leaves.'}),
  mk({id:'poha-thin',name:'Thin Poha',lab:'Thin|Poha',brand:'Terra Pantry',cat:'grains',sub:'Rice & Poha',price:65,mrp:80,rating:4,reviews:640,sz:'kg',stock:0,pouch:'#4C7FA3',fill:'#F4EFD8',dot:4,tint:'#DCE9F2',protein:6.6,shelf:'8 months',origin:'Indore, Madhya Pradesh',tags:'breakfast rice flakes chivda',desc:'Delicate flakes for chivda and quick snacks. Fries up crisp in seconds.'}),
  mk({id:'foxtail',name:'Foxtail Millet',lab:'Foxtail|Millet',brand:'Terra Pantry',cat:'grains',sub:'Millets',price:129,mrp:160,rating:4.3,reviews:740,sz:'kg',pouch:'#B5651D',fill:'#E3B23C',dot:2.8,tint:'#F6E3BD',protein:12.3,shelf:'8 months',origin:'Karnataka',tags:'millet gluten-free diabetic',desc:'A mild, quick-cooking millet. Use it like rice, in upma, or as a khichdi base.'}),
  mk({id:'ragi',name:'Ragi Flour',lab:'Ragi|Flour',brand:'Terra Pantry',cat:'grains',sub:'Millets',price:99,mrp:130,rating:4.4,reviews:1120,sz:'kg',badge:'New',pouch:'#6B3E2E',fill:'#9B6B4F',dot:2,tint:'#E9D5C8',protein:7.3,shelf:'5 months',origin:'Karnataka',tags:'millet flour calcium dosa',desc:'Finger millet milled fine for rotis, dosas, porridge and baking.'}),
  mk({id:'toor',name:'Unpolished Toor Dal',lab:'Toor|Dal',brand:'Harvest Hill',cat:'pulses',sub:'Dals',price:189,mrp:230,rating:4.5,reviews:2890,sz:'kg',pouch:'#C2840A',fill:'#E8B93C',dot:4.5,tint:'#F7E7B8',protein:22,shelf:'12 months',origin:'Maharashtra',tags:'dal protein lentil sambar',desc:'Unpolished, so the natural flavour stays. Cooks creamy for dal tadka and sambar.'}),
  mk({id:'moong',name:'Washed Moong Dal',lab:'Moong|Dal',brand:'Harvest Hill',cat:'pulses',sub:'Dals',price:159,mrp:190,rating:4.2,reviews:1530,sz:'kg',pouch:'#5E8C3A',fill:'#EED861',dot:4,tint:'#E3EFCF',protein:24,shelf:'12 months',origin:'Rajasthan',tags:'dal protein lentil khichdi',desc:'Split and washed for a quick cook with no soaking. Easy on the stomach and great for khichdi.'}),
  mk({id:'almonds',name:'California Almonds',lab:'Almonds|Premium',brand:'Nutri Nest',cat:'nuts',sub:'Nuts',price:549,mrp:699,rating:4.6,reviews:4010,sz:'nut',badge:'Top rated',pouch:'#7A3B24',fill:'#C98A5A',dot:6.5,tint:'#F1DDCF',protein:21,shelf:'6 months',origin:'California, USA',tags:'nuts badam dry fruit protein',desc:'Large, evenly graded almonds with a clean crunch. Sealed in a resealable pouch.'}),
  mk({id:'pumpkin',name:'Pumpkin Seeds',lab:'Pumpkin|Seeds',brand:'Nutri Nest',cat:'nuts',sub:'Seeds',price:249,mrp:320,rating:4.3,reviews:860,sz:'nut',pouch:'#2E6B3F',fill:'#7FA85A',dot:5,tint:'#D8EAD2',protein:30,shelf:'6 months',origin:'China',tags:'seeds protein magnesium topping',desc:'Green, hulled pumpkin seeds. Toss over salads, oats and soups, or eat a handful as they are.'}),
  mk({id:'muesli',name:'Fruit & Nut Muesli',lab:'Fruit & Nut|Muesli',brand:'Kora',cat:'breakfast',sub:'Cereals',price:229,mrp:299,rating:4.1,reviews:1210,sz:'kg',pouch:'#B14A6B',fill:'#D9A86B',dot:4.2,tint:'#F5D9E2',protein:10,shelf:'8 months',origin:'Made in India',tags:'breakfast oats cereal',desc:'Rolled oats, raisins, almonds and seeds with no added refined sugar. Add milk or curd.'}),
  mk({id:'peanut-butter',name:'Crunchy Peanut Butter',lab:'Peanut|Butter',brand:'Kora',cat:'breakfast',sub:'Spreads',price:199,mrp:260,rating:4.4,reviews:3300,sz:'jar',types:['Crunchy','Creamy'],tl:'Texture',pouch:'#A5651A',fill:'#D39A4A',dot:3,tint:'#F4E0C0',protein:25,shelf:'9 months',origin:'Gujarat',tags:'spread protein toast',desc:'Roasted peanuts, a little salt and nothing else. Stir, spread, repeat.'})
];
const BRANDS = [...new Set(PRODUCTS.map(p => p.brand))].sort();
const MAXP = Math.ceil(Math.max(...PRODUCTS.map(p => p.price)) / 50) * 50;

/* ----- pure pricing helpers ----- */
const P = id => PRODUCTS.find(p => p.id === id);
const catOf = id => CATS.find(c => c.id === id);
const sizesOf = p => SIZES[p.sz];
const baseSize = p => sizesOf(p).find(s => s.m === 1);
const mult = (p, l) => (sizesOf(p).find(s => s.l === l) || baseSize(p)).m;
const priceOf = (p, l) => Math.round(p.price * mult(p, l));
const mrpOf = (p, l) => Math.round(p.mrp * mult(p, l));
const disc = p => Math.round((1 - p.price / p.mrp) * 100);

/* lines: [{price, mrp, qty}] → totals. The browser and the server both use this. */
function calcTotals(lines, coupon, shipOpt = 'std') {
  const sub = lines.reduce((t, l) => t + l.price * l.qty, 0), mrp = lines.reduce((t, l) => t + l.mrp * l.qty, 0), c = coupon && COUPONS[coupon];
  let d = 0, free = false, pending = 0;
  if (c) {
    if (sub >= c.min && sub > 0) { if (c.t === 'pct') d = Math.min(Math.round(sub * c.v / 100), c.cap); if (c.t === 'flat') d = c.v; if (c.t === 'ship') free = true; }
    else pending = c.min - sub;
  }
  const std = (sub >= FREE_AT || free || sub === 0) ? 0 : 49, ship = shipOpt === 'exp' ? 99 : std;
  return {sub, mrp, disc: d, ship, total: sub - d + ship, pending, free, applied: d > 0 || free ? coupon : null, saved: (mrp - sub) + d};
}

if (typeof module !== 'undefined') module.exports = {PRODUCTS, CATS, COUPONS, SIZES, FREE_AT, ORDER_STATUSES, P, priceOf, mrpOf, baseSize, sizesOf, calcTotals};
