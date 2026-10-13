// RADIO STUDIO — original patterns & synthesized sounds only (no samples).
const $=s=>document.querySelector(s);
const SCALE=[0,2,3,5,7,8,10];// natural minor
const ROOT=45;// A2 midi
const mf=m=>440*Math.pow(2,(m-69)/12);
const degMidi=(d,oct=0)=>ROOT+12*(oct+Math.floor(d/7))+SCALE[((d%7)+7)%7];
const DRUMS=['kick','snare','clap','chat','ohat','tomL','tomH','gated','cowbell'];
const DLAB={kick:'Kick',snare:'Snare',clap:'Clap',chat:'Closed hat',ohat:'Open hat',tomL:'Low tom',tomH:'High tom',gated:'80s gated snare',cowbell:'Cowbell'};
const ROWS=8;const TRACKS=['drums','bass','lead','arp','vocals','fx'];
const blankPat=()=>({drums:Object.fromEntries(DRUMS.map(d=>[d,Array(16).fill(0)])),bass:Array(16).fill(-1),lead:Array.from({length:ROWS},()=>Array(16).fill(0)),arp:{on:false,prog:[0,5,3,4],mode:'up'}});
let S={bpm:125,swing:0,banks:{A:blankPat(),B:blankPat()},bassTone:'saw',leadTone:'juno',xfade:0,sc:0.6,mixer:Object.fromEntries(TRACKS.map(t=>[t,{v:0.8,m:false,s:false}]))};
let edit='A';
// ---------- audio graph
let gate,sc={},ctx,master,filt,hp,comp,dest,busses={},bankGain={},noiseBuf,revIR,vox={};
function initAudio(){if(ctx)return;ctx=new (window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=20000;hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=10;
 comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;
 master.connect(filt);filt.connect(hp);hp.connect(comp);gate=ctx.createGain();hp.disconnect();hp.connect(gate);gate.connect(comp);comp.connect(ctx.destination);dest=ctx.createMediaStreamDestination();comp.connect(dest);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 revIR=makeIR(2.5);
 const rev=ctx.createConvolver();rev.buffer=revIR;const revRet=ctx.createGain();revRet.gain.value=0.25;rev.connect(revRet);revRet.connect(master);busses.reverbSend=rev;
 TRACKS.forEach(t=>{busses[t]=ctx.createGain();if(['bass','lead','arp'].includes(t)){sc[t]=ctx.createGain();busses[t].connect(sc[t]);sc[t].connect(master)}else busses[t].connect(master)});
 ['A','B'].forEach(b=>{bankGain[b]={};TRACKS.slice(0,4).forEach(t=>{const g=ctx.createGain();g.connect(busses[t]);bankGain[b][t]=g})});
 buildVox();applyMix();applyXfade();applyFilter();}
function makeIR(sec){const len=ctx.sampleRate*sec,b=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}return b}
function noise(t,dur,out,{type='highpass',f=1000,q=1,g=0.5}={}){const s=ctx.createBufferSource();s.buffer=noiseBuf;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const e=ctx.createGain();e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(fl);fl.connect(e);e.connect(out);s.start(t);s.stop(t+dur+0.05);return {fl,e}}
function osc(t,dur,out,{type='sine',f=440,f2,g=0.5,a=0.005,det=0}={}){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.detune.value=det;if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);const e=ctx.createGain();e.gain.setValueAtTime(0.0001,t);e.gain.linearRampToValueAtTime(g,t+a);e.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(e);e.connect(out);o.start(t);o.stop(t+dur+0.05);return o}
// ---------- drums
const DR={
 kick:(t,o)=>{osc(t,0.5,o,{f:180,f2:45,g:1.1});osc(t,0.08,o,{f:320,f2:60,g:0.5});noise(t,0.015,o,{f:3000,g:0.4});duck(t)},
 snare:(t,o)=>{noise(t,0.2,o,{f:1500,g:0.6});osc(t,0.12,o,{type:'triangle',f:220,f2:160,g:0.4})},
 clap:(t,o)=>{for(let i=0;i<3;i++)noise(t+i*0.012,0.03,o,{type:'bandpass',f:1200,q:1,g:0.6});noise(t+0.036,0.25,o,{type:'bandpass',f:1200,q:1,g:0.5})},
 chat:(t,o)=>noise(t,0.05,o,{f:8000,g:0.3}),
 ohat:(t,o)=>noise(t,0.35,o,{f:7000,g:0.25}),
 tomL:(t,o)=>osc(t,0.35,o,{f:140,f2:80,g:0.7}),
 tomH:(t,o)=>osc(t,0.3,o,{f:220,f2:130,g:0.6}),
 gated:(t,o)=>{// big 80s snare: noise into reverb, hard gate
  const g=ctx.createGain();g.gain.setValueAtTime(1,t);g.gain.setValueAtTime(1,t+0.22);g.gain.linearRampToValueAtTime(0,t+0.25);g.connect(o);
  const cv=ctx.createConvolver();cv.buffer=revIR;cv.connect(g);noise(t,0.15,cv,{f:900,g:0.9});noise(t,0.12,o,{f:1200,g:0.5});osc(t,0.1,o,{type:'triangle',f:200,f2:150,g:0.4})},
 cowbell:(t,o)=>{const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=800;bp.connect(o);osc(t,0.3,bp,{type:'square',f:540,g:0.4});osc(t,0.3,bp,{type:'square',f:800,g:0.4})}
};
function duck(t){if(!S.sc)return;const d=60/S.bpm*0.9;Object.values(sc).forEach(g=>{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(1-S.sc*0.9,t);g.gain.setTargetAtTime(1,t+0.02,d/4)})}
// ---------- synths
function bassNote(t,m,dur,o){const f=mf(m);if(S.bassTone==='sub'){osc(t,dur,o,{f,g:0.8});return}
 if(S.bassTone==='808'){const ws=ctx.createWaveShaper();ws.curve=makeDist(4);ws.connect(o);const x=osc(t,Math.max(dur,0.6),ws,{f:f*2.2,g:0.6});x.frequency.exponentialRampToValueAtTime(f,t+0.06);return}
 if(S.bassTone==='reese'){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.Q.value=3;lp.connect(o);[-18,18].forEach(d=>osc(t,dur,lp,{type:'sawtooth',f,g:0.35,a:0.01,det:d}));osc(t,dur,o,{f:f/2,g:0.4});return}
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=S.bassTone==='acid'?14:2;lp.frequency.setValueAtTime(S.bassTone==='acid'?2500:1200,t);lp.frequency.exponentialRampToValueAtTime(200,t+dur);lp.connect(o);
 osc(t,dur,lp,{type:'sawtooth',f,g:0.5});if(S.bassTone==='saw')osc(t,dur,lp,{type:'square',f:f/2,g:0.3})}
function leadNote(t,m,dur,o,tone=S.leadTone){const f=mf(m);
 if(tone==='juno'){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;lp.connect(o);[-8,0,8].forEach(d=>osc(t,dur*1.6,lp,{type:'sawtooth',f,g:0.15,a:0.06,det:d}));sendRev(lp,0.5)}
 else if(tone==='dx7'){// 2-op FM bell
  const car=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain(),e=ctx.createGain();car.frequency.value=f;mod.frequency.value=f*3.5;mg.gain.setValueAtTime(f*4,t);mg.gain.exponentialRampToValueAtTime(1,t+1.2);
  mod.connect(mg);mg.connect(car.frequency);car.connect(e);e.connect(o);e.gain.setValueAtTime(0.35,t);e.gain.exponentialRampToValueAtTime(0.001,t+1.5);car.start(t);mod.start(t);car.stop(t+1.6);mod.stop(t+1.6);sendRev(e,0.4)}
 else if(tone==='supersaw'){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5000;lp.connect(o);[-25,-15,-7,0,7,15,25].forEach(d=>osc(t,dur,lp,{type:'sawtooth',f,g:0.06,a:0.01,det:d}));sendRev(lp,0.4)}
 else if(tone==='house'){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=4;lp.frequency.setValueAtTime(5000,t);lp.frequency.exponentialRampToValueAtTime(500,t+0.18);lp.connect(o);[-10,10].forEach(d=>osc(t,0.3,lp,{type:'sawtooth',f,g:0.15,det:d}));osc(t,0.3,lp,{type:'square',f:f/2,g:0.08});sendRev(lp,0.25)}
 else if(tone==='glitch'){const o1=osc(t,dur,o,{type:'square',f,g:0.18});const sd=stepDur()/4;for(let i=1;i<4;i++)o1.frequency.setValueAtTime(f*[2,1,4][i-1],t+i*sd);osc(t,dur,o,{type:'sawtooth',f:f*1.005,g:0.1,det:1200})}
 else {const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=6;lp.frequency.setValueAtTime(4000,t);lp.frequency.exponentialRampToValueAtTime(300,t+0.2);lp.connect(o);osc(t,0.25,lp,{type:'square',f,g:0.25})}}
function sendRev(n,a){const g=ctx.createGain();g.gain.value=a;n.connect(g);g.connect(busses.reverbSend)}
// ---------- sequencer
let playing=false,step=0,nextT=0,timer,barStart=0,curStep=-1,recArm=false;
function stepDur(){return 60/S.bpm/4}
function schedule(){while(nextT<ctx.currentTime+0.12){playStep(step,nextT+(step%2?S.swing*stepDur():0));if(step===0){barStart=nextT;onBar(nextT)}
  const s=step;setTimeout(()=>showStep(s),Math.max(0,(nextT-ctx.currentTime)*1000));nextT+=stepDur();step=(step+1)%16}}
function playStep(s,t){const sd=stepDur();['A','B'].forEach(b=>{const p=S.banks[b],G=bankGain[b];if(G.drums.gain.value<0.001)return;
 DRUMS.forEach(d=>{if(p.drums[d][s])DR[d](t,G.drums)});
 if(p.bass[s]>=0)bassNote(t,degMidi(p.bass[s],0),sd*1.8,G.bass);
 for(let r=0;r<ROWS;r++)if(p.lead[r][s])leadNote(t,degMidi(r,2),sd*2,G.lead);
 if(p.arp.on){const root=p.arp.prog[Math.floor(s/4)];const ch=[0,2,4,7].map(x=>degMidi(root+x,2));let i=s%4;const m=p.arp.mode;
  const n=m==='down'?ch[3-i]:m==='updown'?ch[[0,1,2,1][i]]:m==='random'?ch[Math.random()*4|0]:ch[i];leadNote(t,n+12,sd,G.arp,'pluck')}})}
function play(){initAudio();ctx.resume();if(playing){playing=false;clearInterval(timer);$('#play').textContent='▶ PLAY';document.body.classList.remove('playing');stopTakes();showStep(-1);return}
 playing=true;step=0;nextT=ctx.currentTime+0.1;timer=setInterval(schedule,25);$('#play').textContent='■ STOP';document.body.classList.add('playing');document.body.style.setProperty('--beat',60/S.bpm+'s')}
// ---------- UI grids
function cell(on,cb,q){const c=document.createElement('div');c.className='cell'+(on?' on':'')+(q?' q':'');c.onclick=cb;return c}
function row(lab,cells){const r=document.createElement('div');r.className='r';const l=document.createElement('div');l.className='lab';l.textContent=lab;r.append(l,...cells);return r}
const NOTE=['A','B','C','D','E','F','G'];
function render(){const p=S.banks[edit];const dg=$('#drumgrid');dg.innerHTML='';
 DRUMS.forEach(d=>dg.append(row(DLAB[d],p.drums[d].map((v,i)=>cell(v,()=>{p.drums[d][i]^=1;render();if(!v&&ctx)DR[d](ctx.currentTime,busses.drums)},i%4==0&&i)))));
 const bg=$('#bassgrid');bg.innerHTML='';for(let r=ROWS-1;r>=0;r--)bg.append(row(NOTE[r%7]+(r>=7?'↑':''),p.bass.map((v,i)=>cell(v===r,()=>{p.bass[i]=v===r?-1:r;render();if(ctx&&v!==r)bassNote(ctx.currentTime,degMidi(r),0.3,busses.bass)},i%4==0&&i))));
 const lg=$('#leadgrid');lg.innerHTML='';for(let r=ROWS-1;r>=0;r--)lg.append(row(NOTE[r%7]+(r>=7?'↑':''),p.lead[r].map((v,i)=>cell(v,()=>{p.lead[r][i]^=1;render();if(ctx&&!v)leadNote(ctx.currentTime,degMidi(r,2),0.4,busses.lead)},i%4==0&&i))));
 $('#arpOn').checked=p.arp.on;$('#arpMode').value=p.arp.mode;const ap=$('#arpProg');ap.innerHTML='';
 p.arp.prog.forEach((d,i)=>{const s=document.createElement('select');s.innerHTML=['i (Am)','ii°','III (C)','iv (Dm)','v (Em)','VI (F)','VII (G)'].map((n,k)=>`<option value=${k}>${n}</option>`).join('');s.value=d;s.onchange=()=>p.arp.prog[i]=+s.value;ap.append(s)});
 document.querySelectorAll('.bank').forEach(b=>b.classList.toggle('on',b.dataset.bank===edit));
 $('#bpm').value=S.bpm;$('#swing').value=S.swing;$('#bassTone').value=S.bassTone;$('#leadTone').value=S.leadTone;$('#xfade').value=S.xfade;renderMixer()}
function showStep(s){curStep=s;document.querySelectorAll('.grid .r').forEach(r=>{r.querySelectorAll('.cell').forEach((c,i)=>c.classList.toggle('now',i===s))})}
function renderMixer(){const m=$('#mixer');m.innerHTML='';TRACKS.forEach(t=>{const x=S.mixer[t];const d=document.createElement('div');d.className='mx';
 d.innerHTML=`<span>${t}</span><input type=range min=0 max=1 step=0.01 value=${x.v} data-tip="${t} volume"><button class="${x.m?'on':''}" data-tip="Mute ${t}">M</button><button class="${x.s?'on':''}" data-tip="Solo: only hear soloed tracks">S</button>`;
 const [v,mb,sb]=[d.querySelector('input'),...d.querySelectorAll('button')];v.oninput=()=>{x.v=+v.value;applyMix()};mb.onclick=()=>{x.m=!x.m;applyMix();renderMixer()};sb.onclick=()=>{x.s=!x.s;applyMix();renderMixer()};m.append(d)})}
function applyMix(){if(!ctx)return;const anySolo=TRACKS.some(t=>S.mixer[t].s);TRACKS.forEach(t=>{const x=S.mixer[t];busses[t].gain.setTargetAtTime((x.m||(anySolo&&!x.s))?0:x.v,ctx.currentTime,0.02)})}
function applyXfade(){if(!ctx)return;const x=S.xfade;TRACKS.slice(0,4).forEach(t=>{bankGain.A[t].gain.value=Math.cos(x*Math.PI/2);bankGain.B[t].gain.value=Math.sin(x*Math.PI/2)})}
function applyFilter(){if(!ctx)return;const v=+$('#filter').value;filt.frequency.setTargetAtTime(v<0?20000*Math.pow(0.01,-v):20000,ctx.currentTime,0.03);hp.frequency.setTargetAtTime(v>0?10*Math.pow(300,v):10,ctx.currentTime,0.03)}
// ---------- FX pads
const PADS={
 'Riser':t=>{const n=noise(t,4,busses.fx,{type:'bandpass',f:200,q:3,g:0.4});n.e.gain.cancelScheduledValues(t);n.e.gain.setValueAtTime(0.05,t);n.e.gain.linearRampToValueAtTime(0.6,t+3.9);n.e.gain.linearRampToValueAtTime(0,t+4);n.fl.frequency.exponentialRampToValueAtTime(9000,t+4);osc(t,4,busses.fx,{type:'sawtooth',f:110,f2:880,g:0.08,a:3})},
 'Downlifter':t=>{const n=noise(t,2.5,busses.fx,{type:'bandpass',f:8000,q:2,g:0.5});n.fl.frequency.exponentialRampToValueAtTime(100,t+2.5);osc(t,2,busses.fx,{f:400,f2:40,g:0.5})},
 'Noise sweep':t=>{const L=60/S.bpm*8,n=noise(t,L,busses.fx,{type:'highpass',f:300,q:2,g:0.3});n.e.gain.cancelScheduledValues(t);n.e.gain.setValueAtTime(0.02,t);n.e.gain.linearRampToValueAtTime(0.45,t+L*0.98);n.e.gain.linearRampToValueAtTime(0,t+L);n.fl.frequency.exponentialRampToValueAtTime(12000,t+L)},
 'Impact':t=>{osc(t,1.8,busses.fx,{f:90,f2:28,g:1});noise(t,1.2,busses.fx,{type:'lowpass',f:1500,g:0.6});const ws=ctx.createWaveShaper();ws.curve=makeDist(8);ws.connect(busses.fx);osc(t,0.15,ws,{f:200,f2:50,g:0.5})},
 'Reverse cymbal':t=>{const L=60/S.bpm*4,n=noise(t,L,busses.fx,{type:'highpass',f:5000,g:0.4});n.e.gain.cancelScheduledValues(t);n.e.gain.setValueAtTime(0.001,t);n.e.gain.exponentialRampToValueAtTime(0.5,t+L);n.e.gain.linearRampToValueAtTime(0,t+L+0.02)},
 'Snare roll':t=>{const sd=stepDur();let tt=t;for(let i=0;i<32;i++){const div=i<8?2:i<16?1:i<24?0.5:0.25;const o=ctx.createGain();o.gain.value=0.2+0.8*i/32;o.connect(busses.fx);DR.snare(tt,o);tt+=sd*div}},
 'Sidechain pump':t=>{S.sc=S.sc>0?0:0.8;$('#sc').value=S.sc;padState()},
 'Stutter':t=>{const sd=stepDur()/2,g=gate.gain;g.cancelScheduledValues(t);for(let i=0;i<32;i++)g.setValueAtTime(i%2?0:1,t+i*sd);g.setValueAtTime(1,t+32*sd)},
 'Filter drop':t=>{const L=60/S.bpm*4;filt.frequency.cancelScheduledValues(t);filt.frequency.setValueAtTime(20000,t);filt.frequency.exponentialRampToValueAtTime(250,t+L);filt.frequency.setValueAtTime(20000,t+L+0.01);PADS.Impact(t+L)},
 "'Hey' chop":t=>{noise(t,0.06,busses.fx,{type:'bandpass',f:1800,q:1,g:0.4});const mix=ctx.createGain();mix.gain.value=0.5;mix.connect(busses.fx);sendRev(mix,0.3);
  [[600,1],[1900,0.6],[2600,0.3]].forEach(([fr,a])=>{const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=8;bp.frequency.setValueAtTime(fr,t+0.04);bp.frequency.linearRampToValueAtTime(fr*(fr>1000?1.2:0.75),t+0.25);const g=ctx.createGain();g.gain.value=a*3;bp.connect(g);g.connect(mix);osc(t+0.04,0.28,bp,{type:'sawtooth',f:260,f2:200,g:0.8,a:0.02})})},
 'Vocal chop':t=>{const tk=takes.find(k=>k.on)||takes[0];if(!tk){PADS["'Hey' chop"](t);return}[0,1,2,3].forEach(i=>{const s=ctx.createBufferSource();s.buffer=tk.buf;s.playbackRate.value=Math.pow(2,[0,3,7,12][i]/12);s.connect(vox.in);s.start(t+i*stepDur()*2,0.2+i*0.1,stepDur()*1.5)})},
 'Riser':t=>{const n=noise(t,4,busses.fx,{type:'bandpass',f:200,q:3,g:0.4});n.e.gain.cancelScheduledValues(t);n.e.gain.setValueAtTime(0.05,t);n.e.gain.linearRampToValueAtTime(0.6,t+3.9);n.e.gain.linearRampToValueAtTime(0,t+4);n.fl.frequency.exponentialRampToValueAtTime(9000,t+4);osc(t,4,busses.fx,{type:'sawtooth',f:110,f2:880,g:0.08,a:3})},
 'Downlifter':t=>{const n=noise(t,2.5,busses.fx,{type:'bandpass',f:8000,q:2,g:0.5});n.fl.frequency.exponentialRampToValueAtTime(100,t+2.5);osc(t,2,busses.fx,{f:400,f2:40,g:0.5})},
 'Laser zap':t=>osc(t,0.3,busses.fx,{type:'square',f:3000,f2:100,g:0.2})
};
function sendRevNode(){}
function buildPads(){const p=$('#pads');Object.keys(PADS).forEach((k,i)=>{const b=document.createElement('button');b.textContent=k;b.dataset.tip='FX: '+k+(i<9?' (key '+(i+1)+')':'')+(k==='Sidechain pump'?' — toggles ducking pump on bass/synths':'');b.dataset.pad=k;b.onclick=()=>{initAudio();ctx.resume();PADS[k](ctx.currentTime)};p.append(b)})}
function padState(){const b=document.querySelector('[data-pad="Sidechain pump"]');if(b)b.classList.toggle('on',S.sc>0)}
// ---------- vocals
let micStream,micSrc,takes=[],takeSrcs=[];
function makeDist(k){const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(1+k)*x/(1+k*Math.abs(x))}return c}
function buildVox(){vox.in=ctx.createGain();vox.pre=ctx.createGain();vox.in.connect(vox.pre);
 const pk=(type,f,q)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q||1;return b};
 vox.hpf=pk('highpass',90,0.7);vox.f1=pk('peaking',500,2);vox.f2=pk('peaking',1500,2);vox.f3=pk('peaking',2800,2);vox.body=pk('lowshelf',250);vox.air=pk('highshelf',9000);vox.deess=pk('peaking',6800,3);
 vox.comp=ctx.createDynamicsCompressor();vox.comp.attack.value=0.005;vox.comp.release.value=0.12;vox.makeup=ctx.createGain();
 [vox.pre,vox.hpf,vox.body,vox.f1,vox.f2,vox.f3,vox.deess,vox.air,vox.comp,vox.makeup].reduce((a,b)=>{a.connect(b);return b});
 ctx.audioWorklet.addModule('pitch-worklet.js').then(()=>{vox.shift=new AudioWorkletNode(ctx,'shifter');vox.in.disconnect();vox.in.connect(vox.shift);vox.shift.connect(vox.pre);applyVox();window._shifterReady=true}).catch(e=>console.warn('worklet',e));vox.dist=ctx.createWaveShaper();vox.ringG=ctx.createGain();vox.ringG.gain.value=1;vox.ringO=ctx.createOscillator();vox.ringO.frequency.value=60;vox.ringDepth=ctx.createGain();vox.ringDepth.gain.value=0;vox.ringO.connect(vox.ringDepth);vox.ringDepth.connect(vox.ringG.gain);vox.ringO.start();
 vox.out=ctx.createGain();vox.del=ctx.createDelay(2);vox.delFb=ctx.createGain();vox.delMix=ctx.createGain();vox.rev=ctx.createConvolver();vox.rev.buffer=makeIR(3);vox.revMix=ctx.createGain();
 vox.makeup.connect(vox.dist);vox.dist.connect(vox.ringG);vox.ringG.connect(vox.out);vox.out.connect(busses.vocals);
 vox.out.connect(vox.del);vox.del.connect(vox.delFb);vox.delFb.connect(vox.del);vox.del.connect(vox.delMix);vox.delMix.connect(busses.vocals);
 vox.out.connect(vox.rev);vox.rev.connect(vox.revMix);vox.revMix.connect(busses.vocals);vox.mon=ctx.createGain();vox.mon.gain.value=0;vox.mon.connect(vox.in);applyVox()}
function applyVox(){if(!ctx)return;const v=id=>+$(id).value;vox.revMix.gain.value=v('#vReverb')*1.2;vox.delMix.gain.value=v('#vDelay');vox.delFb.gain.value=v('#vDelay')*0.6;vox.del.delayTime.value=stepDur()*3;
 const d=v('#vDist');vox.dist.curve=d>0?makeDist(d*50):null;const r=v('#vRobot');vox.ringG.gain.value=1-r;vox.ringDepth.gain.value=r;vox.ringO.frequency.value=40+r*60;
 const fm=Math.pow(2,v('#vcFormant')/12);vox.f1.frequency.value=500*fm;vox.f2.frequency.value=1500*fm;vox.f3.frequency.value=2800*fm;[vox.f1,vox.f2,vox.f3].forEach(f=>f.gain.value=Math.abs(v('#vcFormant'))*0.8+1);
 vox.body.gain.value=v('#vcBody');vox.air.gain.value=v('#vcAir');vox.deess.gain.value=-v('#vcDeess')*12;
 const c=v('#vcComp');vox.comp.threshold.value=-10-c*30;vox.comp.ratio.value=1+c*7;vox.makeup.gain.value=1+c*1.5;
 if(vox.shift){vox.shift.parameters.get('pitch').value=v('#vPitch');vox.shift.parameters.get('correct').value=v('#vcTune')}
 $('#vPitchVal').textContent=(v('#vPitch')>0?'+':'')+v('#vPitch')+' st'}
const VOICES={// pitch, formant, body, air, comp, deess, tune, reverb, delay, dist, robot
 'Masculine / Deep':[-5,-3,5,-2,0.5,0.3,0,0.2,0.1,0,0],'Feminine / Bright':[4,3,-3,5,0.5,0.5,0,0.25,0.15,0,0],
 'Dark (musical)':[-7,-4,6,1,0.6,0.4,0.6,0.6,0.3,0.15,0.1],'Angelic / Airy':[5,2,-4,9,0.4,0.6,0.5,0.9,0.4,0,0],
 'Robot':[0,0,0,2,0.7,0.4,1,0.2,0.2,0.1,0.8],'Pop Star':[0,0.5,1,6,0.75,0.6,0.7,0.35,0.25,0,0],'Natural':[0,0,0,0,0.2,0.2,0,0.2,0,0,0]};
function setVoice(n){const ids=['#vPitch','#vcFormant','#vcBody','#vcAir','#vcComp','#vcDeess','#vcTune','#vReverb','#vDelay','#vDist','#vRobot'];VOICES[n].forEach((x,i)=>$(ids[i]).value=x);applyVox();document.querySelectorAll('.voices button').forEach(b=>b.classList.toggle('on',b.textContent===n))}
function buildVoices(){const d=$('#voices');Object.keys(VOICES).forEach(n=>{const b=document.createElement('button');b.textContent=n;b.dataset.tip='Voice changer preset: '+n;b.onclick=()=>{initAudio();setVoice(n)};d.append(b)})}
async function enableMic(){initAudio();await ctx.resume();try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false}});micSrc=ctx.createMediaStreamSource(micStream);micSrc.connect(vox.mon);$('#mic').textContent='🎤 Mic ready';return true}catch(e){alert('Mic not available: '+e.message);return false}}
async function armRec(){if(!micStream&&!(await enableMic()))return;if(!playing)play();recArm=true;showPrompter(true);$('#rec').classList.add('armed');$('#rec').textContent='… waiting for next bar'}
function onBar(t){if(recArm){recArm=false;const delay=Math.max(0,(t-ctx.currentTime)*1000);setTimeout(()=>startRec(),delay)}playTakes(t)}
function startRec(){const mr=new MediaRecorder(micStream),ch=[];mr.ondataavailable=e=>ch.push(e.data);$('#rec').textContent='● RECORDING';
 mr.onstop=async()=>{const ab=await new Blob(ch).arrayBuffer();try{const buf=await ctx.decodeAudioData(ab);takes.push({buf,on:true,name:'Take '+(takes.length+1),vol:1});renderTakes()}catch(e){console.warn('decode fail',e)}$('#rec').classList.remove('armed');showPrompter(false);$('#rec').textContent='● Record take (4 bars)'};
 mr.start();setTimeout(()=>mr.stop(),stepDur()*64*1000)}
let barCount=0;
function playTakes(t){if(barCount++%4)return;takes.forEach(k=>{if(!k.on)return;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=k.buf;g.gain.value=k.vol;s.connect(g);g.connect(vox.in);s.start(t,0,stepDur()*64);takeSrcs.push(s)})}
function stopTakes(){takeSrcs.forEach(s=>{try{s.stop()}catch(e){}});takeSrcs=[];barCount=0}
function renderTakes(){const d=$('#takes');d.innerHTML='<h3>Takes (loop every 4 bars)</h3>';takes.forEach((k,i)=>{const r=document.createElement('div');r.className='take';
 r.innerHTML=`<input type=checkbox ${k.on?'checked':''} data-tip="Include this take in the loop"> ${k.name} (${k.buf.duration.toFixed(1)}s) <input type=range min=0 max=1.5 step=0.01 value=${k.vol} data-tip="Take volume"><button data-tip="Delete take">✕</button>`;
 const [c,v]=r.querySelectorAll('input');c.onchange=()=>k.on=c.checked;v.oninput=()=>k.vol=+v.value;r.querySelector('button').onclick=()=>{takes.splice(i,1);renderTakes()};d.append(r)})}
// ---------- export
function encodeWAV(ab){const ch=ab.numberOfChannels,len=ab.length,sr=ab.sampleRate,buf=new ArrayBuffer(44+len*ch*2),v=new DataView(buf);const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 w(0,'RIFF');v.setUint32(4,36+len*ch*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,len*ch*2,true);
 let o=44;const data=[...Array(ch)].map((_,c)=>ab.getChannelData(c));for(let i=0;i<len;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(o,s*32767,true);o+=2}return new Blob([buf],{type:'audio/wav'})}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove()}
function doExport(){initAudio();ctx.resume();if(playing)play();const bars=+$('#expBars').value||8;const mr=new MediaRecorder(dest.stream),ch=[];mr.ondataavailable=e=>ch.push(e.data);
 const st=$('#expStatus');st.textContent=`Recording ${bars} bars…`;
 mr.onstop=async()=>{const webm=new Blob(ch,{type:'audio/webm'});window._lastExport={webm:webm.size};dl(webm,'radio-studio-mix.webm');st.textContent='Encoding WAV…';
  try{const ab=await ctx.decodeAudioData(await webm.arrayBuffer());const wav=encodeWAV(ab);window._lastExport.wav=wav.size;dl(wav,'radio-studio-mix.wav');st.textContent='✅ Exported WAV + WebM'}catch(e){st.textContent='✅ WebM exported (WAV encode failed: '+e.message+')'}};
 mr.start();play();setTimeout(()=>{play();setTimeout(()=>mr.stop(),1500)},bars*16*stepDur()*1000+100)}
// ---------- presets (original patterns)
const P=(s)=>s.split('').map(c=>c==='x'?1:0);
const PRESETS={
 dance:()=>{const a=blankPat(),b=blankPat();Object.assign(a.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x...'),chat:P('..x...x...x...x.'),ohat:P('......x.......x.'),cowbell:P('...x......x.....')});
  a.bass=[0,-1,0,7,-1,0,-1,4,5,-1,5,7,-1,5,3,4];a.lead[4][0]=a.lead[2][0]=a.lead[0][0]=1;a.lead[5][8]=a.lead[3][8]=a.lead[0][8]=1;a.lead[4][14]=1;a.arp={on:true,prog:[0,0,5,4],mode:'up'};
  Object.assign(b.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x..x'),chat:P('xxxxxxxxxxxxxxxx'),ohat:P('..x...x...x...x.'),snare:P('............x.xx')});b.bass=[0,0,7,0,0,7,0,7,5,5,7,5,3,3,4,4];b.arp={on:true,prog:[0,5,2,6],mode:'updown'};for(const s of[0,3,6,10])b.lead[[4,5,6,4][[0,3,6,10].indexOf(s)]][s]=1;
  return {bpm:126,swing:0,bassTone:'saw',leadTone:'supersaw',sc:0.6,A:a,B:b}},
 darkclub:()=>{const a=blankPat(),b=blankPat();Object.assign(a.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x...'),chat:P('..x...x...x...x.'),ohat:P('......x.......x.'),snare:P('...............x')});
  a.bass=[0,-1,0,0,-1,0,0,-1,5,-1,5,5,-1,4,4,-1];for(const st of[0,3,10])for(const r of(st==10?[5,0,2]:[0,2,4]))a.lead[r][st]=1;a.arp={on:true,prog:[0,0,5,4],mode:'down'};
  Object.assign(b.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x...'),chat:P('xxxxxxxxxxxxxxxx'),ohat:P('..x...x...x...x.')});b.bass=[0,0,7,0,0,7,0,0,5,5,7,5,4,4,6,4];b.lead=JSON.parse(JSON.stringify(a.lead));b.arp={on:true,prog:[0,5,2,4],mode:'updown'};
  return {bpm:124,swing:0,bassTone:'reese',leadTone:'house',sc:0.7,A:a,B:b}},
 hyperpop:()=>{const a=blankPat(),b=blankPat();Object.assign(a.drums,{kick:P('x..x..x...x..x..'),snare:P('....x.......x...'),chat:P('xxxxxxxxxxxxxxxx'),clap:P('............x.x.'),cowbell:P('.x.......x......')});
  a.bass=[0,-1,-1,0,-1,-1,5,-1,-1,-1,3,-1,4,-1,-1,-1];[7,6,4,7,6,4,2,4,7,6,4,2,4,2,1,0].forEach((r,i)=>{if(i%2==0||i>11)a.lead[r][i]=1});a.arp={on:true,prog:[0,5,2,6],mode:'random'};
  Object.assign(b.drums,{kick:P('x.x.x.x.x.x.x.xx'),snare:P('....x.......xxxx'),chat:P('x.x.x.x.x.x.x.x.'),ohat:P('.x.x.x.x.x.x.x.x')});b.bass=[0,0,0,0,5,5,5,5,3,3,3,3,4,4,6,6];b.lead=JSON.parse(JSON.stringify(a.lead));b.arp={on:true,prog:[0,2,4,6],mode:'up'};
  return {bpm:150,swing:0,bassTone:'808',leadTone:'glitch',sc:0.5,A:a,B:b}},
 electro:()=>{const a=blankPat(),b=blankPat();Object.assign(a.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x...'),chat:P('x.x.x.x.x.x.x.x.'),ohat:P('..x...x...x...x.'),tomH:P('..............x.')});
  a.bass=[0,0,7,0,0,7,0,0,3,3,7,3,4,4,7,4];[[0,[4,2,0]],[6,[4,2]],[8,[5,3,1]],[12,[6,4,2]]].forEach(([st,rs])=>rs.forEach(r=>a.lead[r][st]=1));a.arp={on:false,prog:[0,0,3,4],mode:'up'};
  Object.assign(b.drums,{kick:P('x...x...x...x...'),clap:P('....x.......x...'),snare:P('....x.......x...'),chat:P('xxxxxxxxxxxxxxxx'),ohat:P('..x...x...x...x.')});b.bass=a.bass.slice();[4,4,5,4,7,6,5,4].forEach((r,i)=>b.lead[r][i*2]=1);b.arp={on:true,prog:[0,0,3,4],mode:'updown'};
  return {bpm:128,swing:0,bassTone:'saw',leadTone:'supersaw',sc:0.8,A:a,B:b}},
 synthwave:()=>{const a=blankPat(),b=blankPat();Object.assign(a.drums,{kick:P('x.......x.......'),gated:P('....x.......x...'),chat:P('x.x.x.x.x.x.x.x.'),tomL:P('..............xx')});
  a.bass=[0,0,0,0,0,0,0,0,5,5,5,5,6,6,6,6].map(x=>x);a.lead[4][0]=a.lead[2][0]=a.lead[0][0]=1;a.lead[5][8]=a.lead[3][8]=1;a.lead[6][12]=a.lead[4][12]=1;a.arp={on:true,prog:[0,0,5,6],mode:'up'};
  Object.assign(b.drums,{kick:P('x...x...x...x...'),gated:P('....x.......x...'),chat:P('xxxxxxxxxxxxxxxx'),tomH:P('............x.x.'),tomL:P('.............x.x')});b.bass=[0,7,0,7,0,7,0,7,5,12,5,12,6,13,6,13].map(x=>Math.min(x,7));b.arp={on:true,prog:[0,2,5,6],mode:'updown'};b.lead[4][0]=b.lead[6][4]=b.lead[7][8]=b.lead[6][12]=1;
  return {bpm:110,swing:0,bassTone:'saw',leadTone:'juno',sc:0.3,A:a,B:b}},
 clear:()=>({bpm:125,swing:0,sc:0,bassTone:'saw',leadTone:'juno',A:blankPat(),B:blankPat()})
};
function loadPreset(k){$('#preset').value=k;const p=PRESETS[k]();S.bpm=p.bpm;S.swing=p.swing;S.bassTone=p.bassTone;S.leadTone=p.leadTone;S.sc=p.sc;$('#sc').value=S.sc;padState();S.banks={A:p.A,B:p.B};render();applyVox()}
// ---------- wiring
function init(){buildPads();buildVoices();initSongwriter();render();
 $('#play').onclick=play;$('#bpm').onchange=e=>{S.bpm=+e.target.value;applyVox();document.body.style.setProperty('--beat',60/S.bpm+'s')};$('#swing').oninput=e=>S.swing=+e.target.value;
 $('#preset').onchange=e=>{if(e.target.value)loadPreset(e.target.value)};
 $('#save').onclick=()=>{localStorage.setItem('radioStudio',JSON.stringify(S));alert('Saved! (patterns, sounds and lyrics — vocal takes are not saved)')};
 $('#load').onclick=()=>{const j=localStorage.getItem('radioStudio');if(!j)return alert('Nothing saved yet');S=JSON.parse(j);if(!S.lyrics)S.lyrics={input:'',moods:[],sections:[]};renderLyrics();if(S.sc==null)S.sc=0.6;$('#sc').value=S.sc;padState();render();applyMix();applyXfade()};
 document.querySelectorAll('.bank').forEach(b=>b.onclick=()=>{edit=b.dataset.bank;render()});
 $('#copyAB').onclick=()=>{S.banks[edit==='A'?'B':'A']=JSON.parse(JSON.stringify(S.banks[edit]))};
 $('#bassTone').onchange=e=>S.bassTone=e.target.value;$('#leadTone').onchange=e=>S.leadTone=e.target.value;
 $('#arpOn').onchange=e=>S.banks[edit].arp.on=e.target.checked;$('#arpMode').onchange=e=>S.banks[edit].arp.mode=e.target.value;
 $('#sc').oninput=e=>{S.sc=+e.target.value;padState()};$('#xfade').oninput=e=>{S.xfade=+e.target.value;applyXfade()};$('#filter').oninput=applyFilter;$('#master').oninput=e=>{initAudio();master.gain.value=+e.target.value};
 ['#vReverb','#vDelay','#vDist','#vRobot','#vPitch','#vcFormant','#vcBody','#vcAir','#vcComp','#vcDeess','#vcTune'].forEach(i=>$(i).oninput=applyVox);
 $('#mic').onclick=enableMic;$('#monitor').onchange=e=>{initAudio();vox.mon.gain.value=e.target.checked?1:0};$('#rec').onclick=armRec;$('#export').onclick=doExport;
 document.addEventListener('keydown',e=>{if((e.target.tagName==='INPUT'&&e.target.type!=='range')||e.target.tagName==='TEXTAREA')return;if(e.code==='Space'){e.preventDefault();play()}const n=+e.key;if(n>=1&&n<=9){initAudio();PADS[Object.keys(PADS)[n-1]](ctx.currentTime)}});
 const tip=$('#tip');document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(t){tip.textContent=t.dataset.tip;tip.style.display='block'}else tip.style.display='none'});
 document.addEventListener('mousemove',e=>{tip.style.left=e.clientX+14+'px';tip.style.top=e.clientY+14+'px'});
 loadPreset('dance');}
init();

// iOS/mobile audio unlock on first gesture
(function(){function u(){try{initAudio();ctx.resume();const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}if(ctx&&ctx.state==='running'){['touchstart','touchend','pointerdown','click','keydown'].forEach(t=>document.removeEventListener(t,u,true))}}['touchstart','touchend','pointerdown','click','keydown'].forEach(t=>document.addEventListener(t,u,true))})();
