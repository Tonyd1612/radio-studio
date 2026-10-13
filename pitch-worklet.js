// Granular pitch shifter (timing preserved) + A-minor pitch-correct snap. Original code.
const AMIN=[9,11,0,2,4,5,7];
class Shifter extends AudioWorkletProcessor{
 static get parameterDescriptors(){return[{name:'pitch',defaultValue:0,minValue:-24,maxValue:24},{name:'correct',defaultValue:0,minValue:0,maxValue:1}]}
 constructor(){super();this.N=2048;this.L=8192;this.buf=new Float32Array(this.L);this.w=0;this.p=0;this.hist=new Float32Array(2048);this.h=0;this.cnt=0;this.corr=1;this.target=1;this.port.onmessage=()=>{}}
 detect(){const n=1024,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=this.hist[(this.h+i*2)%2048];// downsampled x2
  const sr=sampleRate/2;let best=0,bl=0;const minL=Math.floor(sr/900),maxL=Math.floor(sr/70);let e0=0;for(let i=0;i<n;i++)e0+=x[i]*x[i];if(e0<0.02)return 0;
  for(let l=minL;l<maxL;l++){let s=0,e=0;for(let i=0;i<n-l;i++){s+=x[i]*x[i+l];e+=x[i]*x[i]+x[i+l]*x[i+l]}const v=2*s/(e||1);if(v>best){best=v;bl=l}}
  return best>0.75?sr/bl:0}
 read(d){let r=this.w-d;while(r<0)r+=this.L;const i=Math.floor(r),f=r-i;return this.buf[i%this.L]*(1-f)+this.buf[(i+1)%this.L]*f}
 process(ins,outs,P){const inp=ins[0][0],out=outs[0][0];if(!out)return true;const n=out.length;
  for(let k=0;k<n;k++){const x=inp?inp[k]:0;this.buf[this.w]=x;this.hist[this.h]=x;this.h=(this.h+1)%2048;
   if(++this.cnt>=1024){this.cnt=0;const c=P.correct[0];if(c>0){const f=this.detect();if(f){const m=69+12*Math.log2(f*Math.pow(2,P.pitch[0]/12)/440);let bt=m,bd=99;for(let o=-1;o<=1;o++){const base=Math.round(m/12)*12+o*12;for(const s of AMIN){const t=base+s;if(Math.abs(t-m)<bd){bd=Math.abs(t-m);bt=t}}}this.target=Math.pow(2,(bt-m)*c/12)}}else this.target=1}
   this.corr+=(this.target-this.corr)*0.002;
   const ratio=Math.pow(2,(P.pitch.length>1?P.pitch[k]:P.pitch[0])/12)*this.corr;
   this.p+=(1-ratio)/this.N;this.p-=Math.floor(this.p);const p2=(this.p+0.5)%1;
   const a=Math.sin(Math.PI*this.p),b=Math.sin(Math.PI*p2);
   out[k]=Math.abs(ratio-1)<0.001?x:this.read(this.p*this.N+2)*a*a+this.read(p2*this.N+2)*b*b;
   this.w=(this.w+1)%this.L}
  for(let c=1;c<outs[0].length;c++)outs[0][c].set(out);return true}}
registerProcessor('shifter',Shifter);
