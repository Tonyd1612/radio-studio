// Songwriter: offline template + rhyme-dictionary lyric generator (original lines, no APIs).
// Rhyme families of complete ending phrases, so every line ends grammatically.
const RHYMES=[
 ['tonight','in the light','hold me tight','burning bright','feels so right','out of sight','we ignite','one more night'],
 ['take me higher','set the fire','pure desire','on the wire','like a liar','never tire'],
 ['on the floor','give me more','out the door','like before','hear me roar','to the core'],
 ['in the dark','light the spark','leave a mark','off the chart','from the start','fall apart'],
 ['let it go','feel the glow','take it slow','steal the show','now you know','let it flow'],
 ['set me free','wait and see','meant to be','you and me','fantasy','energy'],
 ['wear the crown','hear the sound','spinning round','shut it down','lost and found','never down'],
 ['make it real','how I feel','nerves of steel','heart will heal','it’s the deal'],
 ['run away','here to stay','let it play','every day','come what may','I won’t stay'],
 ['breaking through','something new','all for you','feeling blue','dreams come true','nothing to lose'],
 ['take a chance','start the dance','in a trance','strange romance','second glance'],
 ['under my skin','let me in','watch me spin','born to win','let it begin'],
 ['blow my mind','leave it behind','one of a kind','hit rewind','what I find'],
 ['take control','lose my soul','heart of gold','never told','out of control'],
];
const MOODS={
 heartbreak:{img:['mascara rivers','your ghost in the strobe','empty taxi seats','a phone that never rings','glitter on the bathroom floor','cold neon rain'],verb:['cry it out','let you go','delete your name','dance it off','burn the pictures'],hook:'I dance until it stops hurting',preset:'darkclub',voice:'Feminine / Bright',bpm:122,bass:'reese',lead:'house'},
 confidence:{img:['red lipstick armor','a runway made of lasers','diamonds on my knuckles','the VIP in my veins','heels like thunderclaps'],verb:['own the room','turn it up','take the crown','break the mold','walk it out'],hook:'Watch me, I was born for this',preset:'electro',voice:'Pop Star',bpm:128,bass:'saw',lead:'supersaw'},
 party:{img:['bass in my bones','sweat and silver smoke','a thousand flashing hands','champagne sky','strobes like heartbeats'],verb:['lose control','jump jump','hit the lights','move your body','scream it loud'],hook:'Turn it up, we never stop',preset:'dance',voice:'Pop Star',bpm:126,bass:'saw',lead:'supersaw'},
 love:{img:['your hand in the strobe light','pink sunrise on the club roof','two hearts in a laser','your name on my lips','slow motion kisses'],verb:['hold me close','fall for you','keep me near','pull me in','say it twice'],hook:'Only you can light me up',preset:'synthwave',voice:'Angelic / Airy',bpm:112,bass:'saw',lead:'juno'},
 dark:{img:['black velvet shadows','red eyes in the fog','a bassline like a heartbeat','the basement after midnight','chrome and smoke'],verb:['turn off the light','come alive','pull me under','hide in the bass','follow the dark'],hook:'Turn the lights off, feel me now',preset:'darkclub',voice:'Dark (musical)',bpm:124,bass:'reese',lead:'dx7'},
 freedom:{img:['open highway lights','wings made of neon','a skyline on fire','windows rolled down','the edge of the world'],verb:['break away','run tonight','fly so high','let it out','leave it all'],hook:'Nothing’s gonna hold me down',preset:'hyperpop',voice:'Pop Star',bpm:150,bass:'808',lead:'glitch'},
};
const TPL={
 Verse:['Walking in with {img}, {W}','Can’t stop thinking ’bout {T}, {W}','Neon on my {body}, {W}','Told myself I’m {adj}, {W}','{img} on repeat, {W}','I don’t wanna {verb}, {W}','Every time I {verb}, {W}'],
 'Pre-Chorus':['And I feel it coming, {W}','Hold your breath, {W}','Heartbeat racing faster, {W}','Here it comes, here it comes, {W}','Count it down, {W}'],
 Chorus:['Oh, {verb}, {W}','Baby, we go {adj}, {W}','Oh-oh-oh, {W}','Turn me up, {W}','Hands up, {verb}, {W}'],
 Bridge:['Lights off, {W}','If the world stops, {W}','Slow it down, {W}','No more {T}, {W}','Close your eyes, {W}']
};
const BODY=['skin','lips','hands','heart','mind'],ADJ=['electric','untouchable','unstoppable','dangerous','golden','wild','alive'];
const STOP=new Set('i me my the a an and or but to of in on at is am are was were be been it its this that so just like feel feeling want really very im i\'m dont don\'t can can\'t with for about you your we our they them he she his her have has had do not no yes what when how all up out get got been'.split(' '));
const pick=a=>a[Math.random()*a.length|0];
function syl(w){w=w.toLowerCase().replace(/[^a-z]/g,'');if(!w)return 0;if(w.length<=3)return 1;w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,'');const m=w.match(/[aeiouy]{1,2}/g);return m?m.length:1}
const sylLine=l=>l.split(/\s+/).reduce((a,w)=>a+syl(w),0);
function themeWords(txt){const w=(txt||'').toLowerCase().match(/[a-z']+/g)||[];const k=w.filter(x=>!STOP.has(x)&&x.length>4&&!/(ing|ly|ed)$/.test(x));return k.length?k:['the music','the city']}
function moodData(){const ms=(S.lyrics.moods.length?S.lyrics.moods:['party']).map(m=>MOODS[m]);return {img:ms.flatMap(m=>m.img),verb:ms.flatMap(m=>m.verb),hook:ms[0].hook,m:ms[0]}}
function fill(t,W){const md=moodData(),T=pick(themeWords(S.lyrics.input));let s=t.replace('{hook}',S.lyrics.hookLine||md.hook).replace(/\{img\}/g,()=>pick(md.img)).replace(/\{verb\}/g,()=>pick(md.verb)).replace(/\{T\}/g,T).replace('{body}',pick(BODY)).replace('{adj}',pick(ADJ)).replace('{W}',W);
 return s.charAt(0).toUpperCase()+s.slice(1)}
function genLine(sec,i){const fam=sec.fams[i%2];const opts=fam.filter(w=>!sec.lines.some(l=>l.endsWith(w)));let t=pick(TPL[sec.name.replace(/ \d/,'')]);return fill(t,pick(opts.length?opts:fam))}
function genSection(name){const sec={name,fams:[pick(RHYMES),pick(RHYMES)],lines:['','','','']};for(let i=0;i<4;i++)sec.lines[i]=genLine({...sec,lines:sec.lines.slice(0,i)},i);return sec}
function generateSong(){S.lyrics.hookLine=null;const ch=genSection('Chorus');ch.lines[0]=fill('{hook}','');S.lyrics.hookLine=ch.lines[0];
 S.lyrics.sections=[genSection('Verse 1'),genSection('Pre-Chorus'),ch,genSection('Verse 2'),genSection('Pre-Chorus'),JSON.parse(JSON.stringify(ch)),genSection('Bridge'),JSON.parse(JSON.stringify(ch))];renderLyrics()}
function renderLyrics(){const L=S.lyrics,box=$('#lyrics');box.innerHTML='';$('#swInput').value=L.input||'';document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',L.moods.includes(c.dataset.mood)));
 L.sections.forEach((sec,si)=>{const d=document.createElement('div');d.className='sec';d.innerHTML=`<div class="sech"><b>${sec.name}</b> <button data-tip="Regenerate this whole section">↻ section</button></div>`;
  d.querySelector('button').onclick=()=>{const n=genSection(sec.name);if(sec.name==='Chorus')n.lines[0]=L.hookLine;L.sections[si]=n;renderLyrics()};
  sec.lines.forEach((ln,li)=>{const r=document.createElement('div');r.className='lline';r.innerHTML=`<span class="rs" data-tip="Rhyme pair: lines with the same letter rhyme">${'ABAB'[li]}</span><input value="${ln.replace(/"/g,'&quot;')}" data-tip="Edit freely"><span class="syl" data-tip="Syllable count (aim for 7-10 per line in dance-pop)">${sylLine(ln)}</span><button data-tip="Regenerate just this line (keeps the rhyme)">↻</button>`;
   const inp=r.querySelector('input');inp.oninput=()=>{sec.lines[li]=inp.value;r.querySelector('.syl').textContent=sylLine(inp.value)};
   r.querySelector('button').onclick=()=>{sec.lines[li]=genLine({...sec,lines:sec.lines.filter((_,k)=>k!==li)},li);renderLyrics()};d.append(r)});box.append(d)});
 const m=moodData().m;$('#swSuggest').innerHTML=L.sections.length?`Suggested sound: <b>${$('#preset').querySelector(`[value=${m.preset}]`).textContent}</b> · ${m.bpm} BPM · ${m.bass} bass · ${m.lead} lead · voice <b>${m.voice}</b>`:''}
function applySound(){const m=moodData().m;initAudio();loadPreset(m.preset);S.bpm=m.bpm;S.bassTone=m.bass;S.leadTone=m.lead;render();setVoice(m.voice);$('#swSuggest').innerHTML+=' ✅ applied'}
// teleprompter
let tpLine=0,tpTimer;function allLines(){return S.lyrics.sections.flatMap(s=>s.lines.map(l=>({s:s.name,l})))}
function showPrompter(on){const t=$('#prompter');if(!on){t.classList.remove('show');clearInterval(tpTimer);return}const ls=allLines();if(!ls.length)return;tpLine=0;t.classList.add('show');
 const draw=()=>{t.innerHTML=ls.slice(tpLine,tpLine+3).map((x,i)=>`<div class="${i?'nx':'cur'}"><small>${x.s}</small> ${x.l}</div>`).join('')};draw();clearInterval(tpTimer);tpTimer=setInterval(()=>{tpLine=(tpLine+1)%ls.length;draw()},60/S.bpm*4*1000)}
function initSongwriter(){if(!S.lyrics)S.lyrics={input:'',moods:[],sections:[]};
 const chips=$('#chips');Object.keys(MOODS).forEach(m=>{const c=document.createElement('button');c.className='chip';c.dataset.mood=m;c.textContent=m;c.dataset.tip='Mood: '+m;c.onclick=()=>{const a=S.lyrics.moods;a.includes(m)?a.splice(a.indexOf(m),1):a.push(m);renderLyrics()};chips.append(c)});
 $('#swInput').oninput=e=>S.lyrics.input=e.target.value;$('#swGen').onclick=generateSong;$('#swApply').onclick=applySound;$('#swPrompt').onclick=()=>showPrompter(!$('#prompter').classList.contains('show'));renderLyrics()}
