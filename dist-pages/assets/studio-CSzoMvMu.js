import{m as Vr}from"./BufferGeometryUtils-CA80n8nN.js";import{m as qr}from"./modulus-D9P98Cww.js";import{r as Gr}from"./reduce-Dr9sydM5.js";import{d as ne,w as V,e as Z,ag as F,L as me,S as hr,af as Y,ab as Ve,B as dr,o as pi,V as mr,_ as $r,q as Jt,ad as it,l as re,N as k,I as Nt,p as j,ac as ei,ae as Yr,g as Ai,a6 as jr,W as G,X as ti,Z as pr,a1 as Xr,Y as gr,a0 as It,f as be,M as Qr,ah as Ye,y as ii,x as Rt,Q as Zr,F as Mi,a5 as nt,J as st,aj as $e,R as vr,m as de,r as ce,u as fe,a2 as Re,C as Pe,a7 as Kr,U as xr,k as Jr,ai as es,i as yr,K as ts,O as br,v as is,E as rs,h as ss,a4 as Tr,a as ns,G as as,j as os,ak as cs,A as ls,P as us,a8 as fs,a3 as hs}from"./TorusView-BX3E9b9Q.js";import{G as ds}from"./stage-BND0SW_U.js";const wr=0,ms=1,Sr=2,Ii=2,Ot=1.25,Ri=1,U=32,L=U/4,gi=65535,ps=gi<<16,At=Math.pow(2,-24),vi=Symbol("SKIP_GENERATION"),_r={strategy:wr,maxDepth:40,maxLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[vi]:!1};function z(n,e,t){return t.min.x=e[n],t.min.y=e[n+1],t.min.z=e[n+2],t.max.x=e[n+3],t.max.y=e[n+4],t.max.z=e[n+5],t}function Pi(n){let e=-1,t=-1/0;for(let i=0;i<3;i++){const s=n[i+3]-n[i];s>t&&(t=s,e=i)}return e}function Ci(n,e){e.set(n)}function Fi(n,e,t){let i,s;for(let a=0;a<3;a++){const r=a+3;i=n[a],s=e[a],t[a]=i<s?i:s,i=n[r],s=e[r],t[r]=i>s?i:s}}function at(n,e,t){for(let i=0;i<3;i++){const s=e[n+2*i],a=e[n+2*i+1],r=s-a,c=s+a;r<t[i]&&(t[i]=r),c>t[i+3]&&(t[i+3]=c)}}function je(n){const e=n[3]-n[0],t=n[4]-n[1],i=n[5]-n[2];return 2*(e*t+t*i+i*e)}function N(n,e){return e[n+15]===gi}function q(n,e){return e[n+6]}function $(n,e){return e[n+14]}function H(n){return n+L}function W(n,e){const t=e[n+6];return n+t*L}function Ft(n,e){return e[n+7]}function Lt(n,e,t,i,s){let a=1/0,r=1/0,c=1/0,l=-1/0,h=-1/0,f=-1/0,u=1/0,o=1/0,m=1/0,g=-1/0,y=-1/0,d=-1/0;const b=n.offset||0;for(let p=(e-b)*6,v=(e+t-b)*6;p<v;p+=6){const x=n[p+0],T=n[p+1],w=x-T,S=x+T;w<a&&(a=w),S>l&&(l=S),x<u&&(u=x),x>g&&(g=x);const M=n[p+2],I=n[p+3],_=M-I,R=M+I;_<r&&(r=_),R>h&&(h=R),M<o&&(o=M),M>y&&(y=M);const A=n[p+4],P=n[p+5],C=A-P,D=A+P;C<c&&(c=C),D>f&&(f=D),A<m&&(m=A),A>d&&(d=A)}i[0]=a,i[1]=r,i[2]=c,i[3]=l,i[4]=h,i[5]=f,s[0]=u,s[1]=o,s[2]=m,s[3]=g,s[4]=y,s[5]=d}const ue=32,gs=(n,e)=>n.candidate-e.candidate,ve=new Array(ue).fill().map(()=>({count:0,bounds:new Float32Array(6),rightCacheBounds:new Float32Array(6),leftCacheBounds:new Float32Array(6),candidate:0})),ot=new Float32Array(6);function vs(n,e,t,i,s,a){let r=-1,c=0;if(a===wr)r=Pi(e),r!==-1&&(c=(e[r]+e[r+3])/2);else if(a===ms)r=Pi(n),r!==-1&&(c=xs(t,i,s,r));else if(a===Sr){const l=je(n);let h=Ot*s;const f=t.offset||0,u=(i-f)*6,o=(i+s-f)*6;for(let m=0;m<3;m++){const g=e[m],b=(e[m+3]-g)/ue;if(s<ue/4){const p=[...ve];p.length=s;let v=0;for(let T=u;T<o;T+=6,v++){const w=p[v];w.candidate=t[T+2*m],w.count=0;const{bounds:S,leftCacheBounds:M,rightCacheBounds:I}=w;for(let _=0;_<3;_++)I[_]=1/0,I[_+3]=-1/0,M[_]=1/0,M[_+3]=-1/0,S[_]=1/0,S[_+3]=-1/0;at(T,t,S)}p.sort(gs);let x=s;for(let T=0;T<x;T++){const w=p[T];for(;T+1<x&&p[T+1].candidate===w.candidate;)p.splice(T+1,1),x--}for(let T=u;T<o;T+=6){const w=t[T+2*m];for(let S=0;S<x;S++){const M=p[S];w>=M.candidate?at(T,t,M.rightCacheBounds):(at(T,t,M.leftCacheBounds),M.count++)}}for(let T=0;T<x;T++){const w=p[T],S=w.count,M=s-w.count,I=w.leftCacheBounds,_=w.rightCacheBounds;let R=0;S!==0&&(R=je(I)/l);let A=0;M!==0&&(A=je(_)/l);const P=Ri+Ot*(R*S+A*M);P<h&&(r=m,h=P,c=w.candidate)}}else{for(let x=0;x<ue;x++){const T=ve[x];T.count=0,T.candidate=g+b+x*b;const w=T.bounds;for(let S=0;S<3;S++)w[S]=1/0,w[S+3]=-1/0}for(let x=u;x<o;x+=6){let S=~~((t[x+2*m]-g)/b);S>=ue&&(S=ue-1);const M=ve[S];M.count++,at(x,t,M.bounds)}const p=ve[ue-1];Ci(p.bounds,p.rightCacheBounds);for(let x=ue-2;x>=0;x--){const T=ve[x],w=ve[x+1];Fi(T.bounds,w.rightCacheBounds,T.rightCacheBounds)}let v=0;for(let x=0;x<ue-1;x++){const T=ve[x],w=T.count,S=T.bounds,I=ve[x+1].rightCacheBounds;w!==0&&(v===0?Ci(S,ot):Fi(S,ot,ot)),v+=w;let _=0,R=0;v!==0&&(_=je(ot)/l);const A=s-v;A!==0&&(R=je(I)/l);const P=Ri+Ot*(_*v+R*A);P<h&&(r=m,h=P,c=T.candidate)}}}}else console.warn(`BVH: Invalid build strategy value ${a} used.`);return{axis:r,pos:c}}function xs(n,e,t,i){let s=0;const a=n.offset;for(let r=e,c=e+t;r<c;r++)s+=n[(r-a)*6+i*2];return s/t}class Ut{constructor(){this.boundingData=new Float32Array(6)}}function ys(n,e,t,i,s,a){let r=i,c=i+s-1;const l=a.pos,h=a.axis*2,f=t.offset||0;for(;;){for(;r<=c&&t[(r-f)*6+h]<l;)r++;for(;r<=c&&t[(c-f)*6+h]>=l;)c--;if(r<c){for(let u=0;u<e;u++){let o=n[r*e+u];n[r*e+u]=n[c*e+u],n[c*e+u]=o}for(let u=0;u<6;u++){const o=r-f,m=c-f,g=t[o*6+u];t[o*6+u]=t[m*6+u],t[m*6+u]=g}r++,c--}else return r}}let Ar,Mt,ri,Mr;const bs=Math.pow(2,32);function si(n){return"count"in n?1:1+si(n.left)+si(n.right)}function Ts(n,e,t){return Ar=new Float32Array(t),Mt=new Uint32Array(t),ri=new Uint16Array(t),Mr=new Uint8Array(t),ni(n,e)}function ni(n,e){const t=n/4,i=n/2,s="count"in e,a=e.boundingData;for(let r=0;r<6;r++)Ar[t+r]=a[r];if(s)return e.buffer?(Mr.set(new Uint8Array(e.buffer),n),n+e.buffer.byteLength):(Mt[t+6]=e.offset,ri[i+14]=e.count,ri[i+15]=gi,n+U);{const{left:r,right:c,splitAxis:l}=e,h=n+U;let f=ni(h,r);const u=n/U,m=f/U-u;if(m>bs)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");return Mt[t+6]=m,Mt[t+7]=l,ni(f,c)}}function ws(n,e,t,i,s,a){const{maxDepth:r,verbose:c,maxLeafSize:l,strategy:h,onProgress:f}=s,u=n.primitiveBuffer,o=n.primitiveBufferStride,m=new Float32Array(6);let g=!1;const y=new Ut;return Lt(e,t,i,y.boundingData,m),b(y,t,i,m),y;function d(p){f&&f((p-a.offset)/a.count)}function b(p,v,x,T=null,w=0){if(!g&&w>=r&&(g=!0,c&&console.warn(`BVH: Max depth of ${r} reached when generating BVH. Consider increasing maxDepth.`)),x<=l||w>=r)return d(v+x),p.offset=v,p.count=x,p;const S=vs(p.boundingData,T,e,v,x,h);if(S.axis===-1)return d(v+x),p.offset=v,p.count=x,p;const M=ys(u,o,e,v,x,S);if(M===v||M===v+x)d(v+x),p.offset=v,p.count=x;else{p.splitAxis=S.axis;const I=new Ut,_=v,R=M-v;p.left=I,Lt(e,_,R,I.boundingData,m),b(I,_,R,m,w+1);const A=new Ut,P=M,C=x-R;p.right=A,Lt(e,P,C,A.boundingData,m),b(A,P,C,m,w+1)}return p}}function Ss(n,e){const t=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,i=n.getRootRanges(e.range),s=i[0],a=i[i.length-1],r={offset:s.offset,count:a.offset+a.count-s.offset},c=new Float32Array(6*r.count);c.offset=r.offset,n.computePrimitiveBounds(r.offset,r.count,c),n._roots=i.map(l=>{const h=ws(n,c,l.offset,l.count,e,r),f=si(h),u=new t(U*f);return Ts(0,h,u),u})}class xi{constructor(e){this._getNewPrimitive=e,this._primitives=[]}getPrimitive(){const e=this._primitives;return e.length===0?this._getNewPrimitive():e.pop()}releasePrimitive(e){this._primitives.push(e)}}class _s{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;const e=[];let t=null;this.setBuffer=i=>{t&&e.push(t),t=i,this.float32Array=new Float32Array(i),this.uint16Array=new Uint16Array(i),this.uint32Array=new Uint32Array(i)},this.clearBuffer=()=>{t=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,e.length!==0&&this.setBuffer(e.pop())}}}const E=new _s;let ye,Ge;const De=[],ct=new xi(()=>new ne);function As(n,e,t,i,s,a){ye=ct.getPrimitive(),Ge=ct.getPrimitive(),De.push(ye,Ge),E.setBuffer(n._roots[e]);const r=ai(0,n.geometry,t,i,s,a);E.clearBuffer(),ct.releasePrimitive(ye),ct.releasePrimitive(Ge),De.pop(),De.pop();const c=De.length;return c>0&&(Ge=De[c-1],ye=De[c-2]),r}function ai(n,e,t,i,s=null,a=0,r=0){const{float32Array:c,uint16Array:l,uint32Array:h}=E;let f=n*2;if(N(f,l)){const o=q(n,h),m=$(f,l);return z(n,c,ye),i(o,m,!1,r,a+n/L,ye)}else{let _=function(A){const{uint16Array:P,uint32Array:C}=E;let D=A*2;for(;!N(D,P);)A=H(A),D=A*2;return q(A,C)},R=function(A){const{uint16Array:P,uint32Array:C}=E;let D=A*2;for(;!N(D,P);)A=W(A,C),D=A*2;return q(A,C)+$(D,P)};const o=H(n),m=W(n,h);let g=o,y=m,d,b,p,v;if(s&&(p=ye,v=Ge,z(g,c,p),z(y,c,v),d=s(p),b=s(v),b<d)){g=m,y=o;const A=d;d=b,b=A,p=v}p||(p=ye,z(g,c,p));const x=N(g*2,l),T=t(p,x,d,r+1,a+g/L);let w;if(T===Ii){const A=_(g),C=R(g)-A;w=i(A,C,!0,r+1,a+g/L,p)}else w=T&&ai(g,e,t,i,s,a,r+1);if(w)return!0;v=Ge,z(y,c,v);const S=N(y*2,l),M=t(v,S,b,r+1,a+y/L);let I;if(M===Ii){const A=_(y),C=R(y)-A;I=i(A,C,!0,r+1,a+y/L,v)}else I=M&&ai(y,e,t,i,s,a,r+1);return!!I}}const rt=new E.constructor,Pt=new E.constructor,xe=new xi(()=>new ne),Be=new ne,Ee=new ne,Ht=new ne,Wt=new ne;let Vt=!1;function Ms(n,e,t,i){if(Vt)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");Vt=!0;const s=n._roots,a=e._roots;let r,c=0,l=0;const h=new V().copy(t).invert();for(let f=0,u=s.length;f<u;f++){rt.setBuffer(s[f]),l=0;const o=xe.getPrimitive();z(0,rt.float32Array,o),o.applyMatrix4(h);for(let m=0,g=a.length;m<g&&(Pt.setBuffer(a[m]),r=ie(0,0,t,h,i,c,l,0,0,o),Pt.clearBuffer(),l+=a[m].byteLength/U,!r);m++);if(xe.releasePrimitive(o),rt.clearBuffer(),c+=s[f].byteLength/U,r)break}return Vt=!1,r}function ie(n,e,t,i,s,a=0,r=0,c=0,l=0,h=null,f=!1){let u,o;f?(u=Pt,o=rt):(u=rt,o=Pt);const m=u.float32Array,g=u.uint32Array,y=u.uint16Array,d=o.float32Array,b=o.uint32Array,p=o.uint16Array,v=n*2,x=e*2,T=N(v,y),w=N(x,p);let S=!1;if(w&&T)f?S=s(q(e,b),$(e*2,p),q(n,g),$(n*2,y),l,r+e/L,c,a+n/L):S=s(q(n,g),$(n*2,y),q(e,b),$(e*2,p),c,a+n/L,l,r+e/L);else if(w){const M=xe.getPrimitive();z(e,d,M),M.applyMatrix4(t);const I=H(n),_=W(n,g);z(I,m,Be),z(_,m,Ee);const R=M.intersectsBox(Be),A=M.intersectsBox(Ee);S=R&&ie(e,I,i,t,s,r,a,l,c+1,M,!f)||A&&ie(e,_,i,t,s,r,a,l,c+1,M,!f),xe.releasePrimitive(M)}else{const M=H(e),I=W(e,b);z(M,d,Ht),z(I,d,Wt);const _=h.intersectsBox(Ht),R=h.intersectsBox(Wt);if(_&&R)S=ie(n,M,t,i,s,a,r,c,l+1,h,f)||ie(n,I,t,i,s,a,r,c,l+1,h,f);else if(_)if(T)S=ie(n,M,t,i,s,a,r,c,l+1,h,f);else{const A=xe.getPrimitive();A.copy(Ht).applyMatrix4(t);const P=H(n),C=W(n,g);z(P,m,Be),z(C,m,Ee);const D=A.intersectsBox(Be),B=A.intersectsBox(Ee);S=D&&ie(M,P,i,t,s,r,a,l,c+1,A,!f)||B&&ie(M,C,i,t,s,r,a,l,c+1,A,!f),xe.releasePrimitive(A)}else if(R)if(T)S=ie(n,I,t,i,s,a,r,c,l+1,h,f);else{const A=xe.getPrimitive();A.copy(Wt).applyMatrix4(t);const P=H(n),C=W(n,g);z(P,m,Be),z(C,m,Ee);const D=A.intersectsBox(Be),B=A.intersectsBox(Ee);S=D&&ie(I,P,i,t,s,r,a,l,c+1,A,!f)||B&&ie(I,C,i,t,s,r,a,l,c+1,A,!f),xe.releasePrimitive(A)}}return S}const Di=new ne,ze=new Float32Array(6);class Is{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(e){e={..._r,...e},Ss(this,e)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(e,t,i,s){let a=1/0,r=1/0,c=1/0,l=-1/0,h=-1/0,f=-1/0;for(let u=e,o=e+t;u<o;u++){this.writePrimitiveBounds(u,ze,0);const[m,g,y,d,b,p]=ze;m<a&&(a=m),d>l&&(l=d),g<r&&(r=g),b>h&&(h=b),y<c&&(c=y),p>f&&(f=p)}return i[s+0]=a,i[s+1]=r,i[s+2]=c,i[s+3]=l,i[s+4]=h,i[s+5]=f,i}computePrimitiveBounds(e,t,i){const s=i.offset||0;for(let a=e,r=e+t;a<r;a++){this.writePrimitiveBounds(a,ze,0);const[c,l,h,f,u,o]=ze,m=(c+f)/2,g=(l+u)/2,y=(h+o)/2,d=(f-c)/2,b=(u-l)/2,p=(o-h)/2,v=(a-s)*6;i[v+0]=m,i[v+1]=d+(Math.abs(m)+d)*At,i[v+2]=g,i[v+3]=b+(Math.abs(g)+b)*At,i[v+4]=y,i[v+5]=p+(Math.abs(y)+p)*At}return i}shiftPrimitiveOffsets(e){const t=this._indirectBuffer;if(t)for(let i=0,s=t.length;i<s;i++)t[i]+=e;else{const i=this._roots;for(let s=0;s<i.length;s++){const a=i[s],r=new Uint32Array(a),c=new Uint16Array(a),l=a.byteLength/U;for(let h=0;h<l;h++){const f=L*h,u=2*f;N(u,c)&&(r[f+6]+=e)}}}}traverse(e,t=0){const i=this._roots[t],s=new Uint32Array(i),a=new Uint16Array(i);r(0);function r(c,l=0){const h=c*2,f=N(h,a);if(f){const u=s[c+6],o=a[h+14];e(l,f,new Float32Array(i,c*4,6),u,o)}else{const u=H(c),o=W(c,s),m=Ft(c,s);e(l,f,new Float32Array(i,c*4,6),m)||(r(u,l+1),r(o,l+1))}}}refit(){const e=this._roots;for(let t=0,i=e.length;t<i;t++){const s=e[t],a=new Uint32Array(s),r=new Uint16Array(s),c=new Float32Array(s),l=s.byteLength/U;for(let h=l-1;h>=0;h--){const f=h*L,u=f*2;if(N(u,r)){const m=q(f,a),g=$(u,r);this.writePrimitiveRangeBounds(m,g,ze,0),c.set(ze,f)}else{const m=H(f),g=W(f,a);for(let y=0;y<3;y++){const d=c[m+y],b=c[m+y+3],p=c[g+y],v=c[g+y+3];c[f+y]=d<p?d:p,c[f+y+3]=b>v?b:v}}}}}getBoundingBox(e){return e.makeEmpty(),this._roots.forEach(i=>{z(0,new Float32Array(i),Di),e.union(Di)}),e}shapecast(e){let{boundsTraverseOrder:t,intersectsBounds:i,intersectsRange:s,intersectsPrimitive:a,scratchPrimitive:r,iterate:c}=e;if(s&&a){const u=s;s=(o,m,g,y,d)=>u(o,m,g,y,d)?!0:c(o,m,this,a,g,y,r)}else s||(a?s=(u,o,m,g)=>c(u,o,this,a,m,g,r):s=(u,o,m)=>m);let l=!1,h=0;const f=this._roots;for(let u=0,o=f.length;u<o;u++){const m=f[u];if(l=As(this,u,i,s,t,h),l)break;h+=m.byteLength/U}return l}bvhcast(e,t,i){let{intersectsRanges:s}=i;return Ms(this,e,t,s)}}function Rs(){return typeof SharedArrayBuffer<"u"}function Dt(n){return n.index?n.index.count:n.attributes.position.count}function Bt(n){return Dt(n)/3}function Ir(n,e=ArrayBuffer){return n>65535?new Uint32Array(new e(4*n)):new Uint16Array(new e(2*n))}function Ps(n,e){if(!n.index){const t=n.attributes.position.count,i=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,s=Ir(t,i);n.setIndex(new Z(s,1));for(let a=0;a<t;a++)s[a]=a}}function Cs(n,e,t){const i=Dt(n)/t,s=e||n.drawRange,a=s.start/t,r=(s.start+s.count)/t,c=Math.max(0,a),l=Math.min(i,r)-c;return{offset:Math.floor(c),count:Math.floor(l)}}function Fs(n,e){return n.groups.map(t=>({offset:t.start/e,count:t.count/e}))}function Bi(n,e,t){const i=Cs(n,e,t),s=Fs(n,t);if(!s.length)return[i];const a=[],r=i.offset,c=i.offset+i.count,l=Dt(n)/t,h=[];for(const o of s){const{offset:m,count:g}=o,y=m,d=isFinite(g)?g:l-m,b=m+d;y<c&&b>r&&(h.push({pos:Math.max(r,y),isStart:!0}),h.push({pos:Math.min(c,b),isStart:!1}))}h.sort((o,m)=>o.pos!==m.pos?o.pos-m.pos:o.type==="end"?-1:1);let f=0,u=null;for(const o of h){const m=o.pos;f!==0&&m!==u&&a.push({offset:u,count:m-u}),f+=o.isStart?1:-1,u=m}return a}function Ds(n,e){const t=n[n.length-1],i=t.offset+t.count>2**16,s=n.reduce((h,f)=>h+f.count,0),a=i?4:2,r=e?new SharedArrayBuffer(s*a):new ArrayBuffer(s*a),c=i?new Uint32Array(r):new Uint16Array(r);let l=0;for(let h=0;h<n.length;h++){const{offset:f,count:u}=n[h];for(let o=0;o<u;o++)c[l+o]=f+o;l+=u}return c}class Bs extends Is{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(e){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(e){}constructor(e,t={}){if(e.isBufferGeometry){if(e.index&&e.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(t.useSharedArrayBuffer&&!Rs())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=e,this.resolvePrimitiveIndex=t.indirect?i=>this._indirectBuffer[i]:i=>i,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,t={..._r,...t},t[vi]||this.init(t)}init(e){const{geometry:t,primitiveStride:i}=this;if(e.indirect){const s=Bi(t,e.range,i),a=Ds(s,e.useSharedArrayBuffer);this._indirectBuffer=a}else Ps(t,e);super.init(e),!t.boundingBox&&e.setBoundingBox&&(t.boundingBox=this.getBoundingBox(new ne))}getRootRanges(e){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:Bi(this.geometry,e,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}}class pe{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(e,t){let i=1/0,s=-1/0;for(let a=0,r=e.length;a<r;a++){const l=e[a][t];i=l<i?l:i,s=l>s?l:s}this.min=i,this.max=s}setFromPoints(e,t){let i=1/0,s=-1/0;for(let a=0,r=t.length;a<r;a++){const c=t[a],l=e.dot(c);i=l<i?l:i,s=l>s?l:s}this.min=i,this.max=s}isSeparated(e){return this.min>e.max||e.min>this.max}}pe.prototype.setFromBox=(function(){const n=new F;return function(t,i){const s=i.min,a=i.max;let r=1/0,c=-1/0;for(let l=0;l<=1;l++)for(let h=0;h<=1;h++)for(let f=0;f<=1;f++){n.x=s.x*l+a.x*(1-l),n.y=s.y*h+a.y*(1-h),n.z=s.z*f+a.z*(1-f);const u=t.dot(n);r=Math.min(u,r),c=Math.max(u,c)}this.min=r,this.max=c}})();const Es=(function(){const n=new F,e=new F,t=new F;return function(s,a,r){const c=s.start,l=n,h=a.start,f=e;t.subVectors(c,h),n.subVectors(s.end,s.start),e.subVectors(a.end,a.start);const u=t.dot(f),o=f.dot(l),m=f.dot(f),g=t.dot(l),d=l.dot(l)*m-o*o;let b,p;d!==0?b=(u*o-g*m)/d:b=0,p=(u+b*o)/m,r.x=b,r.y=p}})(),yi=(function(){const n=new Y,e=new F,t=new F;return function(s,a,r,c){Es(s,a,n);let l=n.x,h=n.y;if(l>=0&&l<=1&&h>=0&&h<=1){s.at(l,r),a.at(h,c);return}else if(l>=0&&l<=1){h<0?a.at(0,c):a.at(1,c),s.closestPointToPoint(c,!0,r);return}else if(h>=0&&h<=1){l<0?s.at(0,r):s.at(1,r),a.closestPointToPoint(r,!0,c);return}else{let f;l<0?f=s.start:f=s.end;let u;h<0?u=a.start:u=a.end;const o=e,m=t;if(s.closestPointToPoint(u,!0,e),a.closestPointToPoint(f,!0,t),o.distanceToSquared(u)<=m.distanceToSquared(f)){r.copy(o),c.copy(u);return}else{r.copy(f),c.copy(m);return}}}})(),zs=(function(){const n=new F,e=new F,t=new hr,i=new me;return function(a,r){const{radius:c,center:l}=a,{a:h,b:f,c:u}=r;if(i.start=h,i.end=f,i.closestPointToPoint(l,!0,n).distanceTo(l)<=c||(i.start=h,i.end=u,i.closestPointToPoint(l,!0,n).distanceTo(l)<=c)||(i.start=f,i.end=u,i.closestPointToPoint(l,!0,n).distanceTo(l)<=c))return!0;const y=r.getPlane(t);if(Math.abs(y.distanceToPoint(l))<=c){const b=y.projectPoint(l,e);if(r.containsPoint(b))return!0}return!1}})(),ks=["x","y","z"],he=1e-15,Ei=he*he;function K(n){return Math.abs(n)<he}class se extends Ve{constructor(...e){super(...e),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new F),this.satBounds=new Array(4).fill().map(()=>new pe),this.points=[this.a,this.b,this.c],this.plane=new hr,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new me,this.needsUpdate=!0}intersectsSphere(e){return zs(e,this)}update(){const e=this.a,t=this.b,i=this.c,s=this.points,a=this.satAxes,r=this.satBounds,c=a[0],l=r[0];this.getNormal(c),l.setFromPoints(c,s);const h=a[1],f=r[1];h.subVectors(e,t),f.setFromPoints(h,s);const u=a[2],o=r[2];u.subVectors(t,i),o.setFromPoints(u,s);const m=a[3],g=r[3];m.subVectors(i,e),g.setFromPoints(m,s);const y=h.length(),d=u.length(),b=m.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,y<he?d<he||b<he?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(i)):d<he?b<he?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(e)):b<he&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(i),this.degenerateSegment.end.copy(t)),this.plane.setFromNormalAndCoplanarPoint(c,e),this.needsUpdate=!1}}se.prototype.closestPointToSegment=(function(){const n=new F,e=new F,t=new me;return function(s,a=null,r=null){const{start:c,end:l}=s,h=this.points;let f,u=1/0;for(let o=0;o<3;o++){const m=(o+1)%3;t.start.copy(h[o]),t.end.copy(h[m]),yi(t,s,n,e),f=n.distanceToSquared(e),f<u&&(u=f,a&&a.copy(n),r&&r.copy(e))}return this.closestPointToPoint(c,n),f=c.distanceToSquared(n),f<u&&(u=f,a&&a.copy(n),r&&r.copy(c)),this.closestPointToPoint(l,n),f=l.distanceToSquared(n),f<u&&(u=f,a&&a.copy(n),r&&r.copy(l)),Math.sqrt(u)}})();se.prototype.intersectsTriangle=(function(){const n=new se,e=new pe,t=new pe,i=new F,s=new F,a=new F,r=new F,c=new me,l=new me,h=new F,f=new Y,u=new Y;function o(v,x,T,w){const S=i;!v.isDegenerateIntoPoint&&!v.isDegenerateIntoSegment?S.copy(v.plane.normal):S.copy(x.plane.normal);const M=v.satBounds,I=v.satAxes;for(let A=1;A<4;A++){const P=M[A],C=I[A];if(e.setFromPoints(C,x.points),P.isSeparated(e)||(r.copy(S).cross(C),e.setFromPoints(r,v.points),t.setFromPoints(r,x.points),e.isSeparated(t)))return!1}const _=x.satBounds,R=x.satAxes;for(let A=1;A<4;A++){const P=_[A],C=R[A];if(e.setFromPoints(C,v.points),P.isSeparated(e)||(r.crossVectors(S,C),e.setFromPoints(r,v.points),t.setFromPoints(r,x.points),e.isSeparated(t)))return!1}return T&&(w||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),T.start.set(0,0,0),T.end.set(0,0,0)),!0}function m(v,x,T,w,S,M,I,_,R,A,P){let C=I/(I-_);A.x=w+(S-w)*C,P.start.subVectors(x,v).multiplyScalar(C).add(v),C=I/(I-R),A.y=w+(M-w)*C,P.end.subVectors(T,v).multiplyScalar(C).add(v)}function g(v,x,T,w,S,M,I,_,R,A,P){if(S>0)m(v.c,v.a,v.b,w,x,T,R,I,_,A,P);else if(M>0)m(v.b,v.a,v.c,T,x,w,_,I,R,A,P);else if(_*R>0||I!=0)m(v.a,v.b,v.c,x,T,w,I,_,R,A,P);else if(_!=0)m(v.b,v.a,v.c,T,x,w,_,I,R,A,P);else if(R!=0)m(v.c,v.a,v.b,w,x,T,R,I,_,A,P);else return!0;return!1}function y(v,x,T,w){const S=x.degenerateSegment,M=v.plane.distanceToPoint(S.start),I=v.plane.distanceToPoint(S.end);return K(M)?K(I)?o(v,x,T,w):(T&&(T.start.copy(S.start),T.end.copy(S.start)),v.containsPoint(S.start)):K(I)?(T&&(T.start.copy(S.end),T.end.copy(S.end)),v.containsPoint(S.end)):v.plane.intersectLine(S,i)!=null?(T&&(T.start.copy(i),T.end.copy(i)),v.containsPoint(i)):!1}function d(v,x,T){const w=x.a;return K(v.plane.distanceToPoint(w))&&v.containsPoint(w)?(T&&(T.start.copy(w),T.end.copy(w)),!0):!1}function b(v,x,T){const w=v.degenerateSegment,S=x.a;return w.closestPointToPoint(S,!0,i),S.distanceToSquared(i)<Ei?(T&&(T.start.copy(S),T.end.copy(S)),!0):!1}function p(v,x,T,w){if(v.isDegenerateIntoSegment)if(x.isDegenerateIntoSegment){const S=v.degenerateSegment,M=x.degenerateSegment,I=s,_=a;S.delta(I),M.delta(_);const R=i.subVectors(M.start,S.start),A=I.x*_.y-I.y*_.x;if(K(A))return!1;const P=(R.x*_.y-R.y*_.x)/A,C=-(I.x*R.y-I.y*R.x)/A;if(P<0||P>1||C<0||C>1)return!1;const D=S.start.z+I.z*P,B=M.start.z+_.z*C;return K(D-B)?(T&&(T.start.copy(S.start).addScaledVector(I,P),T.end.copy(S.start).addScaledVector(I,P)),!0):!1}else return x.isDegenerateIntoPoint?b(v,x,T):y(x,v,T,w);else{if(v.isDegenerateIntoPoint)return x.isDegenerateIntoPoint?x.a.distanceToSquared(v.a)<Ei?(T&&(T.start.copy(v.a),T.end.copy(v.a)),!0):!1:x.isDegenerateIntoSegment?b(x,v,T):d(x,v,T);if(x.isDegenerateIntoPoint)return d(v,x,T);if(x.isDegenerateIntoSegment)return y(v,x,T,w)}}return function(x,T=null,w=!1){this.needsUpdate&&this.update(),x.isExtendedTriangle?x.needsUpdate&&x.update():(n.copy(x),n.update(),x=n);const S=p(this,x,T,w);if(S!==void 0)return S;const M=this.plane,I=x.plane;let _=I.distanceToPoint(this.a),R=I.distanceToPoint(this.b),A=I.distanceToPoint(this.c);K(_)&&(_=0),K(R)&&(R=0),K(A)&&(A=0);const P=_*R,C=_*A;if(P>0&&C>0)return!1;let D=M.distanceToPoint(x.a),B=M.distanceToPoint(x.b),ae=M.distanceToPoint(x.c);K(D)&&(D=0),K(B)&&(B=0),K(ae)&&(ae=0);const ee=D*B,ge=D*ae;if(ee>0&&ge>0)return!1;s.copy(M.normal),a.copy(I.normal);const le=s.cross(a);let oe=0,zt=Math.abs(le.x);const _i=Math.abs(le.y);_i>zt&&(zt=_i,oe=1),Math.abs(le.z)>zt&&(oe=2);const Fe=ks[oe],Nr=this.a[Fe],Or=this.b[Fe],Lr=this.c[Fe],Ur=x.a[Fe],Hr=x.b[Fe],Wr=x.c[Fe];if(g(this,Nr,Or,Lr,P,C,_,R,A,f,c))return o(this,x,T,w);if(g(x,Ur,Hr,Wr,ee,ge,D,B,ae,u,l))return o(this,x,T,w);if(f.y<f.x){const kt=f.y;f.y=f.x,f.x=kt,h.copy(c.start),c.start.copy(c.end),c.end.copy(h)}if(u.y<u.x){const kt=u.y;u.y=u.x,u.x=kt,h.copy(l.start),l.start.copy(l.end),l.end.copy(h)}return f.y<u.x||u.y<f.x?!1:(T&&(u.x>f.x?T.start.copy(l.start):T.start.copy(c.start),u.y<f.y?T.end.copy(l.end):T.end.copy(c.end)),!0)}})();se.prototype.distanceToPoint=(function(){const n=new F;return function(t){return this.closestPointToPoint(t,n),t.distanceTo(n)}})();se.prototype.distanceToTriangle=(function(){const n=new F,e=new F,t=["a","b","c"],i=new me,s=new me;return function(r,c=null,l=null){const h=c||l?i:null;if(this.intersectsTriangle(r,h,!0))return(c||l)&&(c&&h.getCenter(c),l&&h.getCenter(l)),0;let f=1/0;for(let u=0;u<3;u++){let o;const m=t[u],g=r[m];this.closestPointToPoint(g,n),o=g.distanceToSquared(n),o<f&&(f=o,c&&c.copy(n),l&&l.copy(g));const y=this[m];r.closestPointToPoint(y,n),o=y.distanceToSquared(n),o<f&&(f=o,c&&c.copy(y),l&&l.copy(n))}for(let u=0;u<3;u++){const o=t[u],m=t[(u+1)%3];i.set(this[o],this[m]);for(let g=0;g<3;g++){const y=t[g],d=t[(g+1)%3];s.set(r[y],r[d]),yi(i,s,n,e);const b=n.distanceToSquared(e);b<f&&(f=b,c&&c.copy(n),l&&l.copy(e))}}return Math.sqrt(f)}})();class X{constructor(e,t,i){this.isOrientedBox=!0,this.min=new F,this.max=new F,this.matrix=new V,this.invMatrix=new V,this.points=new Array(8).fill().map(()=>new F),this.satAxes=new Array(3).fill().map(()=>new F),this.satBounds=new Array(3).fill().map(()=>new pe),this.alignedSatBounds=new Array(3).fill().map(()=>new pe),this.needsUpdate=!1,e&&this.min.copy(e),t&&this.max.copy(t),i&&this.matrix.copy(i)}set(e,t,i){this.min.copy(e),this.max.copy(t),this.matrix.copy(i),this.needsUpdate=!0}copy(e){this.min.copy(e.min),this.max.copy(e.max),this.matrix.copy(e.matrix),this.needsUpdate=!0}}X.prototype.update=(function(){return function(){const e=this.matrix,t=this.min,i=this.max,s=this.points;for(let h=0;h<=1;h++)for(let f=0;f<=1;f++)for(let u=0;u<=1;u++){const o=1*h|2*f|4*u,m=s[o];m.x=h?i.x:t.x,m.y=f?i.y:t.y,m.z=u?i.z:t.z,m.applyMatrix4(e)}const a=this.satBounds,r=this.satAxes,c=s[0];for(let h=0;h<3;h++){const f=r[h],u=a[h],o=1<<h,m=s[o];f.subVectors(c,m),u.setFromPoints(f,s)}const l=this.alignedSatBounds;l[0].setFromPointsField(s,"x"),l[1].setFromPointsField(s,"y"),l[2].setFromPointsField(s,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();X.prototype.intersectsBox=(function(){const n=new pe;return function(t){this.needsUpdate&&this.update();const i=t.min,s=t.max,a=this.satBounds,r=this.satAxes,c=this.alignedSatBounds;if(n.min=i.x,n.max=s.x,c[0].isSeparated(n)||(n.min=i.y,n.max=s.y,c[1].isSeparated(n))||(n.min=i.z,n.max=s.z,c[2].isSeparated(n)))return!1;for(let l=0;l<3;l++){const h=r[l],f=a[l];if(n.setFromBox(h,t),f.isSeparated(n))return!1}return!0}})();X.prototype.intersectsTriangle=(function(){const n=new se,e=new Array(3),t=new pe,i=new pe,s=new F;return function(r){this.needsUpdate&&this.update(),r.isExtendedTriangle?r.needsUpdate&&r.update():(n.copy(r),n.update(),r=n);const c=this.satBounds,l=this.satAxes;e[0]=r.a,e[1]=r.b,e[2]=r.c;for(let o=0;o<3;o++){const m=c[o],g=l[o];if(t.setFromPoints(g,e),m.isSeparated(t))return!1}const h=r.satBounds,f=r.satAxes,u=this.points;for(let o=0;o<3;o++){const m=h[o],g=f[o];if(t.setFromPoints(g,u),m.isSeparated(t))return!1}for(let o=0;o<3;o++){const m=l[o];for(let g=0;g<4;g++){const y=f[g];if(s.crossVectors(m,y),t.setFromPoints(s,e),i.setFromPoints(s,u),t.isSeparated(i))return!1}}return!0}})();X.prototype.closestPointToPoint=(function(){return function(e,t){return this.needsUpdate&&this.update(),t.copy(e).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),t}})();X.prototype.distanceToPoint=(function(){const n=new F;return function(t){return this.closestPointToPoint(t,n),t.distanceTo(n)}})();X.prototype.distanceToBox=(function(){const n=["x","y","z"],e=new Array(12).fill().map(()=>new me),t=new Array(12).fill().map(()=>new me),i=new F,s=new F;return function(r,c=0,l=null,h=null){if(this.needsUpdate&&this.update(),this.intersectsBox(r))return(l||h)&&(r.getCenter(s),this.closestPointToPoint(s,i),r.closestPointToPoint(i,s),l&&l.copy(i),h&&h.copy(s)),0;const f=c*c,u=r.min,o=r.max,m=this.points;let g=1/0;for(let d=0;d<8;d++){const b=m[d];s.copy(b).clamp(u,o);const p=b.distanceToSquared(s);if(p<g&&(g=p,l&&l.copy(b),h&&h.copy(s),p<f))return Math.sqrt(p)}let y=0;for(let d=0;d<3;d++)for(let b=0;b<=1;b++)for(let p=0;p<=1;p++){const v=(d+1)%3,x=(d+2)%3,T=b<<v|p<<x,w=1<<d|b<<v|p<<x,S=m[T],M=m[w];e[y].set(S,M);const _=n[d],R=n[v],A=n[x],P=t[y],C=P.start,D=P.end;C[_]=u[_],C[R]=b?u[R]:o[R],C[A]=p?u[A]:o[R],D[_]=o[_],D[R]=b?u[R]:o[R],D[A]=p?u[A]:o[R],y++}for(let d=0;d<=1;d++)for(let b=0;b<=1;b++)for(let p=0;p<=1;p++){s.x=d?o.x:u.x,s.y=b?o.y:u.y,s.z=p?o.z:u.z,this.closestPointToPoint(s,i);const v=s.distanceToSquared(i);if(v<g&&(g=v,l&&l.copy(i),h&&h.copy(s),v<f))return Math.sqrt(v)}for(let d=0;d<12;d++){const b=e[d];for(let p=0;p<12;p++){const v=t[p];yi(b,v,i,s);const x=i.distanceToSquared(s);if(x<g&&(g=x,l&&l.copy(i),h&&h.copy(s),x<f))return Math.sqrt(x)}}return Math.sqrt(g)}})();class Ns extends xi{constructor(){super(()=>new se)}}const J=new Ns,Xe=new F,qt=new F;function Os(n,e,t={},i=0,s=1/0){const a=i*i,r=s*s;let c=1/0,l=null;if(n.shapecast({boundsTraverseOrder:f=>(Xe.copy(e).clamp(f.min,f.max),Xe.distanceToSquared(e)),intersectsBounds:(f,u,o)=>o<c&&o<r,intersectsTriangle:(f,u)=>{f.closestPointToPoint(e,Xe);const o=e.distanceToSquared(Xe);return o<c&&(qt.copy(Xe),c=o,l=u),o<a}}),c===1/0)return null;const h=Math.sqrt(c);return t.point?t.point.copy(qt):t.point=qt.clone(),t.distance=h,t.faceIndex=l,t}const lt=parseInt(mr)>=169,Ls=parseInt(mr)<=161,we=new F,Se=new F,_e=new F,ut=new Y,ft=new Y,ht=new Y,zi=new F,ki=new F,Ni=new F,Qe=new F;function Us(n,e,t,i,s,a,r,c){let l;if(a===dr?l=n.intersectTriangle(i,t,e,!0,s):l=n.intersectTriangle(e,t,i,a!==pi,s),l===null)return null;const h=n.origin.distanceTo(s);return h<r||h>c?null:{distance:h,point:s.clone()}}function Oi(n,e,t,i,s,a,r,c,l,h,f){we.fromBufferAttribute(e,a),Se.fromBufferAttribute(e,r),_e.fromBufferAttribute(e,c);const u=Us(n,we,Se,_e,Qe,l,h,f);if(u){if(i){ut.fromBufferAttribute(i,a),ft.fromBufferAttribute(i,r),ht.fromBufferAttribute(i,c),u.uv=new Y;const m=Ve.getInterpolation(Qe,we,Se,_e,ut,ft,ht,u.uv);lt||(u.uv=m)}if(s){ut.fromBufferAttribute(s,a),ft.fromBufferAttribute(s,r),ht.fromBufferAttribute(s,c),u.uv1=new Y;const m=Ve.getInterpolation(Qe,we,Se,_e,ut,ft,ht,u.uv1);lt||(u.uv1=m),Ls&&(u.uv2=u.uv1)}if(t){zi.fromBufferAttribute(t,a),ki.fromBufferAttribute(t,r),Ni.fromBufferAttribute(t,c),u.normal=new F;const m=Ve.getInterpolation(Qe,we,Se,_e,zi,ki,Ni,u.normal);u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1),lt||(u.normal=m)}const o={a,b:r,c,normal:new F,materialIndex:0};if(Ve.getNormal(we,Se,_e,o.normal),u.face=o,u.faceIndex=a,lt){const m=new F;Ve.getBarycoord(Qe,we,Se,_e,m),u.barycoord=m}}return u}function Li(n){return n&&n.isMaterial?n.side:n}function Et(n,e,t,i,s,a,r){const c=i*3;let l=c+0,h=c+1,f=c+2;const{index:u,groups:o}=n;n.index&&(l=u.getX(l),h=u.getX(h),f=u.getX(f));const{position:m,normal:g,uv:y,uv1:d}=n.attributes;if(Array.isArray(e)){const b=i*3;for(let p=0,v=o.length;p<v;p++){const{start:x,count:T,materialIndex:w}=o[p];if(b>=x&&b<x+T){const S=Li(e[w]),M=Oi(t,m,g,y,d,l,h,f,S,a,r);if(M)if(M.faceIndex=i,M.face.materialIndex=w,s)s.push(M);else return M}}}else{const b=Li(e),p=Oi(t,m,g,y,d,l,h,f,b,a,r);if(p)if(p.faceIndex=i,p.face.materialIndex=0,s)s.push(p);else return p}return null}function O(n,e,t,i){const s=n.a,a=n.b,r=n.c;let c=e,l=e+1,h=e+2;t&&(c=t.getX(c),l=t.getX(l),h=t.getX(h)),s.x=i.getX(c),s.y=i.getY(c),s.z=i.getZ(c),a.x=i.getX(l),a.y=i.getY(l),a.z=i.getZ(l),r.x=i.getX(h),r.y=i.getY(h),r.z=i.getZ(h)}function Hs(n,e,t,i,s,a,r,c){const{geometry:l,_indirectBuffer:h}=n;for(let f=i,u=i+s;f<u;f++)Et(l,e,t,f,a,r,c)}function Ws(n,e,t,i,s,a,r){const{geometry:c,_indirectBuffer:l}=n;let h=1/0,f=null;for(let u=i,o=i+s;u<o;u++){let m;m=Et(c,e,t,u,null,a,r),m&&m.distance<h&&(f=m,h=m.distance)}return f}function Vs(n,e,t,i,s,a,r){const{geometry:c}=t,{index:l}=c,h=c.attributes.position;for(let f=n,u=e+n;f<u;f++){let o;if(o=f,O(r,o*3,l,h),r.needsUpdate=!0,i(r,o,s,a))return!0}return!1}function qs(n,e=null){e&&Array.isArray(e)&&(e=new Set(e));const t=n.geometry,i=t.index?t.index.array:null,s=t.attributes.position;let a,r,c,l,h=0;const f=n._roots;for(let o=0,m=f.length;o<m;o++)a=f[o],r=new Uint32Array(a),c=new Uint16Array(a),l=new Float32Array(a),u(0,h),h+=a.byteLength;function u(o,m,g=!1){const y=o*2;if(N(y,c)){const d=q(o,r),b=$(y,c);let p=1/0,v=1/0,x=1/0,T=-1/0,w=-1/0,S=-1/0;for(let M=3*d,I=3*(d+b);M<I;M++){let _=i[M];const R=s.getX(_),A=s.getY(_),P=s.getZ(_);R<p&&(p=R),R>T&&(T=R),A<v&&(v=A),A>w&&(w=A),P<x&&(x=P),P>S&&(S=P)}return l[o+0]!==p||l[o+1]!==v||l[o+2]!==x||l[o+3]!==T||l[o+4]!==w||l[o+5]!==S?(l[o+0]=p,l[o+1]=v,l[o+2]=x,l[o+3]=T,l[o+4]=w,l[o+5]=S,!0):!1}else{const d=H(o),b=W(o,r);let p=g,v=!1,x=!1;if(e){if(!p){const _=d/L+m/U,R=b/L+m/U;v=e.has(_),x=e.has(R),p=!v&&!x}}else v=!0,x=!0;const T=p||v,w=p||x;let S=!1;T&&(S=u(d,m,p));let M=!1;w&&(M=u(b,m,p));const I=S||M;if(I)for(let _=0;_<3;_++){const R=d+_,A=b+_,P=l[R],C=l[R+3],D=l[A],B=l[A+3];l[o+_]=P<D?P:D,l[o+_+3]=C>B?C:B}return I}}}function Te(n,e,t,i,s){let a,r,c,l,h,f;const u=1/t.direction.x,o=1/t.direction.y,m=1/t.direction.z,g=t.origin.x,y=t.origin.y,d=t.origin.z;let b=e[n],p=e[n+3],v=e[n+1],x=e[n+3+1],T=e[n+2],w=e[n+3+2];return u>=0?(a=(b-g)*u,r=(p-g)*u):(a=(p-g)*u,r=(b-g)*u),o>=0?(c=(v-y)*o,l=(x-y)*o):(c=(x-y)*o,l=(v-y)*o),a>l||c>r||((c>a||isNaN(a))&&(a=c),(l<r||isNaN(r))&&(r=l),m>=0?(h=(T-d)*m,f=(w-d)*m):(h=(w-d)*m,f=(T-d)*m),a>f||h>r)?!1:((h>a||a!==a)&&(a=h),(f<r||r!==r)&&(r=f),a<=s&&r>=i)}function Gs(n,e,t,i,s,a,r,c){const{geometry:l,_indirectBuffer:h}=n;for(let f=i,u=i+s;f<u;f++){let o=h?h[f]:f;Et(l,e,t,o,a,r,c)}}function $s(n,e,t,i,s,a,r){const{geometry:c,_indirectBuffer:l}=n;let h=1/0,f=null;for(let u=i,o=i+s;u<o;u++){let m;m=Et(c,e,t,l?l[u]:u,null,a,r),m&&m.distance<h&&(f=m,h=m.distance)}return f}function Ys(n,e,t,i,s,a,r){const{geometry:c}=t,{index:l}=c,h=c.attributes.position;for(let f=n,u=e+n;f<u;f++){let o;if(o=t.resolveTriangleIndex(f),O(r,o*3,l,h),r.needsUpdate=!0,i(r,o,s,a))return!0}return!1}function js(n,e,t,i,s,a,r){E.setBuffer(n._roots[e]),oi(0,n,t,i,s,a,r),E.clearBuffer()}function oi(n,e,t,i,s,a,r){const{float32Array:c,uint16Array:l,uint32Array:h}=E,f=n*2;if(N(f,l)){const o=q(n,h),m=$(f,l);Hs(e,t,i,o,m,s,a,r)}else{const o=H(n);Te(o,c,i,a,r)&&oi(o,e,t,i,s,a,r);const m=W(n,h);Te(m,c,i,a,r)&&oi(m,e,t,i,s,a,r)}}const Xs=["x","y","z"];function Qs(n,e,t,i,s,a){E.setBuffer(n._roots[e]);const r=ci(0,n,t,i,s,a);return E.clearBuffer(),r}function ci(n,e,t,i,s,a){const{float32Array:r,uint16Array:c,uint32Array:l}=E;let h=n*2;if(N(h,c)){const u=q(n,l),o=$(h,c);return Ws(e,t,i,u,o,s,a)}else{const u=Ft(n,l),o=Xs[u],g=i.direction[o]>=0;let y,d;g?(y=H(n),d=W(n,l)):(y=W(n,l),d=H(n));const p=Te(y,r,i,s,a)?ci(y,e,t,i,s,a):null;if(p){const T=p.point[o];if(g?T<=r[d+u]:T>=r[d+u+3])return p}const x=Te(d,r,i,s,a)?ci(d,e,t,i,s,a):null;return p&&x?p.distance<=x.distance?p:x:p||x||null}}const dt=new ne,ke=new se,Ne=new se,Ze=new V,Ui=new X,mt=new X;function Zs(n,e,t,i){E.setBuffer(n._roots[e]);const s=li(0,n,t,i);return E.clearBuffer(),s}function li(n,e,t,i,s=null){const{float32Array:a,uint16Array:r,uint32Array:c}=E;let l=n*2;if(s===null&&(t.boundingBox||t.computeBoundingBox(),Ui.set(t.boundingBox.min,t.boundingBox.max,i),s=Ui),N(l,r)){const f=e.geometry,u=f.index,o=f.attributes.position,m=t.index,g=t.attributes.position,y=q(n,c),d=$(l,r);if(Ze.copy(i).invert(),t.boundsTree)return z(n,a,mt),mt.matrix.copy(Ze),mt.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:p=>mt.intersectsBox(p),intersectsTriangle:p=>{p.a.applyMatrix4(i),p.b.applyMatrix4(i),p.c.applyMatrix4(i),p.needsUpdate=!0;for(let v=y*3,x=(d+y)*3;v<x;v+=3)if(O(Ne,v,u,o),Ne.needsUpdate=!0,p.intersectsTriangle(Ne))return!0;return!1}});{const b=Bt(t);for(let p=y*3,v=(d+y)*3;p<v;p+=3){O(ke,p,u,o),ke.a.applyMatrix4(Ze),ke.b.applyMatrix4(Ze),ke.c.applyMatrix4(Ze),ke.needsUpdate=!0;for(let x=0,T=b*3;x<T;x+=3)if(O(Ne,x,m,g),Ne.needsUpdate=!0,ke.intersectsTriangle(Ne))return!0}}}else{const f=H(n),u=W(n,c);return z(f,a,dt),!!(s.intersectsBox(dt)&&li(f,e,t,i,s)||(z(u,a,dt),s.intersectsBox(dt)&&li(u,e,t,i,s)))}}const pt=new V,Gt=new X,Ke=new X,Ks=new F,Js=new F,en=new F,tn=new F;function rn(n,e,t,i={},s={},a=0,r=1/0){e.boundingBox||e.computeBoundingBox(),Gt.set(e.boundingBox.min,e.boundingBox.max,t),Gt.needsUpdate=!0;const c=n.geometry,l=c.attributes.position,h=c.index,f=e.attributes.position,u=e.index,o=J.getPrimitive(),m=J.getPrimitive();let g=Ks,y=Js,d=null,b=null;s&&(d=en,b=tn);let p=1/0,v=null,x=null;return pt.copy(t).invert(),Ke.matrix.copy(pt),n.shapecast({boundsTraverseOrder:T=>Gt.distanceToBox(T),intersectsBounds:(T,w,S)=>S<p&&S<r?(w&&(Ke.min.copy(T.min),Ke.max.copy(T.max),Ke.needsUpdate=!0),!0):!1,intersectsRange:(T,w)=>{if(e.boundsTree)return e.boundsTree.shapecast({boundsTraverseOrder:M=>Ke.distanceToBox(M),intersectsBounds:(M,I,_)=>_<p&&_<r,intersectsRange:(M,I)=>{for(let _=M,R=M+I;_<R;_++){O(m,3*_,u,f),m.a.applyMatrix4(t),m.b.applyMatrix4(t),m.c.applyMatrix4(t),m.needsUpdate=!0;for(let A=T,P=T+w;A<P;A++){O(o,3*A,h,l),o.needsUpdate=!0;const C=o.distanceToTriangle(m,g,d);if(C<p&&(y.copy(g),b&&b.copy(d),p=C,v=A,x=_),C<a)return!0}}}});{const S=Bt(e);for(let M=0,I=S;M<I;M++){O(m,3*M,u,f),m.a.applyMatrix4(t),m.b.applyMatrix4(t),m.c.applyMatrix4(t),m.needsUpdate=!0;for(let _=T,R=T+w;_<R;_++){O(o,3*_,h,l),o.needsUpdate=!0;const A=o.distanceToTriangle(m,g,d);if(A<p&&(y.copy(g),b&&b.copy(d),p=A,v=_,x=M),A<a)return!0}}}}}),J.releasePrimitive(o),J.releasePrimitive(m),p===1/0?null:(i.point?i.point.copy(y):i.point=y.clone(),i.distance=p,i.faceIndex=v,s&&(s.point?s.point.copy(b):s.point=b.clone(),s.point.applyMatrix4(pt),y.applyMatrix4(pt),s.distance=y.sub(s.point).length(),s.faceIndex=x),i)}function sn(n,e=null){e&&Array.isArray(e)&&(e=new Set(e));const t=n.geometry,i=t.index?t.index.array:null,s=t.attributes.position;let a,r,c,l,h=0;const f=n._roots;for(let o=0,m=f.length;o<m;o++)a=f[o],r=new Uint32Array(a),c=new Uint16Array(a),l=new Float32Array(a),u(0,h),h+=a.byteLength;function u(o,m,g=!1){const y=o*2;if(N(y,c)){const d=q(o,r),b=$(y,c);let p=1/0,v=1/0,x=1/0,T=-1/0,w=-1/0,S=-1/0;for(let M=d,I=d+b;M<I;M++){const _=3*n.resolveTriangleIndex(M);for(let R=0;R<3;R++){let A=_+R;A=i?i[A]:A;const P=s.getX(A),C=s.getY(A),D=s.getZ(A);P<p&&(p=P),P>T&&(T=P),C<v&&(v=C),C>w&&(w=C),D<x&&(x=D),D>S&&(S=D)}}return l[o+0]!==p||l[o+1]!==v||l[o+2]!==x||l[o+3]!==T||l[o+4]!==w||l[o+5]!==S?(l[o+0]=p,l[o+1]=v,l[o+2]=x,l[o+3]=T,l[o+4]=w,l[o+5]=S,!0):!1}else{const d=H(o),b=W(o,r);let p=g,v=!1,x=!1;if(e){if(!p){const _=d/L+m/U,R=b/L+m/U;v=e.has(_),x=e.has(R),p=!v&&!x}}else v=!0,x=!0;const T=p||v,w=p||x;let S=!1;T&&(S=u(d,m,p));let M=!1;w&&(M=u(b,m,p));const I=S||M;if(I)for(let _=0;_<3;_++){const R=d+_,A=b+_,P=l[R],C=l[R+3],D=l[A],B=l[A+3];l[o+_]=P<D?P:D,l[o+_+3]=C>B?C:B}return I}}}function nn(n,e,t,i,s,a,r){E.setBuffer(n._roots[e]),ui(0,n,t,i,s,a,r),E.clearBuffer()}function ui(n,e,t,i,s,a,r){const{float32Array:c,uint16Array:l,uint32Array:h}=E,f=n*2;if(N(f,l)){const o=q(n,h),m=$(f,l);Gs(e,t,i,o,m,s,a,r)}else{const o=H(n);Te(o,c,i,a,r)&&ui(o,e,t,i,s,a,r);const m=W(n,h);Te(m,c,i,a,r)&&ui(m,e,t,i,s,a,r)}}const an=["x","y","z"];function on(n,e,t,i,s,a){E.setBuffer(n._roots[e]);const r=fi(0,n,t,i,s,a);return E.clearBuffer(),r}function fi(n,e,t,i,s,a){const{float32Array:r,uint16Array:c,uint32Array:l}=E;let h=n*2;if(N(h,c)){const u=q(n,l),o=$(h,c);return $s(e,t,i,u,o,s,a)}else{const u=Ft(n,l),o=an[u],g=i.direction[o]>=0;let y,d;g?(y=H(n),d=W(n,l)):(y=W(n,l),d=H(n));const p=Te(y,r,i,s,a)?fi(y,e,t,i,s,a):null;if(p){const T=p.point[o];if(g?T<=r[d+u]:T>=r[d+u+3])return p}const x=Te(d,r,i,s,a)?fi(d,e,t,i,s,a):null;return p&&x?p.distance<=x.distance?p:x:p||x||null}}const gt=new ne,Oe=new se,Le=new se,Je=new V,Hi=new X,vt=new X;function cn(n,e,t,i){E.setBuffer(n._roots[e]);const s=hi(0,n,t,i);return E.clearBuffer(),s}function hi(n,e,t,i,s=null){const{float32Array:a,uint16Array:r,uint32Array:c}=E;let l=n*2;if(s===null&&(t.boundingBox||t.computeBoundingBox(),Hi.set(t.boundingBox.min,t.boundingBox.max,i),s=Hi),N(l,r)){const f=e.geometry,u=f.index,o=f.attributes.position,m=t.index,g=t.attributes.position,y=q(n,c),d=$(l,r);if(Je.copy(i).invert(),t.boundsTree)return z(n,a,vt),vt.matrix.copy(Je),vt.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:p=>vt.intersectsBox(p),intersectsTriangle:p=>{p.a.applyMatrix4(i),p.b.applyMatrix4(i),p.c.applyMatrix4(i),p.needsUpdate=!0;for(let v=y,x=d+y;v<x;v++)if(O(Le,3*e.resolveTriangleIndex(v),u,o),Le.needsUpdate=!0,p.intersectsTriangle(Le))return!0;return!1}});{const b=Bt(t);for(let p=y,v=d+y;p<v;p++){const x=e.resolveTriangleIndex(p);O(Oe,3*x,u,o),Oe.a.applyMatrix4(Je),Oe.b.applyMatrix4(Je),Oe.c.applyMatrix4(Je),Oe.needsUpdate=!0;for(let T=0,w=b*3;T<w;T+=3)if(O(Le,T,m,g),Le.needsUpdate=!0,Oe.intersectsTriangle(Le))return!0}}}else{const f=H(n),u=W(n,c);return z(f,a,gt),!!(s.intersectsBox(gt)&&hi(f,e,t,i,s)||(z(u,a,gt),s.intersectsBox(gt)&&hi(u,e,t,i,s)))}}const xt=new V,$t=new X,et=new X,ln=new F,un=new F,fn=new F,hn=new F;function dn(n,e,t,i={},s={},a=0,r=1/0){e.boundingBox||e.computeBoundingBox(),$t.set(e.boundingBox.min,e.boundingBox.max,t),$t.needsUpdate=!0;const c=n.geometry,l=c.attributes.position,h=c.index,f=e.attributes.position,u=e.index,o=J.getPrimitive(),m=J.getPrimitive();let g=ln,y=un,d=null,b=null;s&&(d=fn,b=hn);let p=1/0,v=null,x=null;return xt.copy(t).invert(),et.matrix.copy(xt),n.shapecast({boundsTraverseOrder:T=>$t.distanceToBox(T),intersectsBounds:(T,w,S)=>S<p&&S<r?(w&&(et.min.copy(T.min),et.max.copy(T.max),et.needsUpdate=!0),!0):!1,intersectsRange:(T,w)=>{if(e.boundsTree){const S=e.boundsTree;return S.shapecast({boundsTraverseOrder:M=>et.distanceToBox(M),intersectsBounds:(M,I,_)=>_<p&&_<r,intersectsRange:(M,I)=>{for(let _=M,R=M+I;_<R;_++){const A=S.resolveTriangleIndex(_);O(m,3*A,u,f),m.a.applyMatrix4(t),m.b.applyMatrix4(t),m.c.applyMatrix4(t),m.needsUpdate=!0;for(let P=T,C=T+w;P<C;P++){const D=n.resolveTriangleIndex(P);O(o,3*D,h,l),o.needsUpdate=!0;const B=o.distanceToTriangle(m,g,d);if(B<p&&(y.copy(g),b&&b.copy(d),p=B,v=P,x=_),B<a)return!0}}}})}else{const S=Bt(e);for(let M=0,I=S;M<I;M++){O(m,3*M,u,f),m.a.applyMatrix4(t),m.b.applyMatrix4(t),m.c.applyMatrix4(t),m.needsUpdate=!0;for(let _=T,R=T+w;_<R;_++){const A=n.resolveTriangleIndex(_);O(o,3*A,h,l),o.needsUpdate=!0;const P=o.distanceToTriangle(m,g,d);if(P<p&&(y.copy(g),b&&b.copy(d),p=P,v=_,x=M),P<a)return!0}}}}}),J.releasePrimitive(o),J.releasePrimitive(m),p===1/0?null:(i.point?i.point.copy(y):i.point=y.clone(),i.distance=p,i.faceIndex=v,s&&(s.point?s.point.copy(b):s.point=b.clone(),s.point.applyMatrix4(xt),y.applyMatrix4(xt),s.distance=y.sub(s.point).length(),s.faceIndex=x),i)}function Wi(n,e,t){return n===null?null:(n.point.applyMatrix4(e.matrixWorld),n.distance=n.point.distanceTo(t.ray.origin),n.object=e,n)}const yt=new X,bt=new $r,Vi=new F,qi=new V,Gi=new F,Yt=["getX","getY","getZ"];class Ct extends Bs{static serialize(e,t={}){t={cloneBuffers:!0,...t};const i=e.geometry,s=e._roots,a=e._indirectBuffer,r=i.getIndex(),c={version:1,roots:null,index:null,indirectBuffer:null};return t.cloneBuffers?(c.roots=s.map(l=>l.slice()),c.index=r?r.array.slice():null,c.indirectBuffer=a?a.slice():null):(c.roots=s,c.index=r?r.array:null,c.indirectBuffer=a),c}static deserialize(e,t,i={}){i={setIndex:!0,indirect:!!e.indirectBuffer,...i};const{index:s,roots:a,indirectBuffer:r}=e;e.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),l(a));const c=new Ct(t,{...i,[vi]:!0});if(c._roots=a,c._indirectBuffer=r||null,i.setIndex){const h=t.getIndex();if(h===null){const f=new Z(e.index,1,!1);t.setIndex(f)}else h.array!==s&&(h.array.set(s),h.needsUpdate=!0)}return c;function l(h){for(let f=0;f<h.length;f++){const u=h[f],o=new Uint32Array(u),m=new Uint16Array(u);for(let g=0,y=u.byteLength/U;g<y;g++){const d=L*g,b=2*d;N(b,m)||(o[d+6]=o[d+6]/L-g)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(e,t={}){t.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use maxLeafSize, instead.'),t={...t,maxLeafSize:t.maxLeafTris}),super(e,t)}shiftTriangleOffsets(e){return super.shiftPrimitiveOffsets(e)}writePrimitiveBounds(e,t,i){const s=this.geometry,a=this._indirectBuffer,r=s.attributes.position,c=s.index?s.index.array:null,h=(a?a[e]:e)*3;let f=h+0,u=h+1,o=h+2;c&&(f=c[f],u=c[u],o=c[o]);for(let m=0;m<3;m++){const g=r[Yt[m]](f),y=r[Yt[m]](u),d=r[Yt[m]](o);let b=g;y<b&&(b=y),d<b&&(b=d);let p=g;y>p&&(p=y),d>p&&(p=d),t[i+m]=b,t[i+m+3]=p}return t}computePrimitiveBounds(e,t,i){const s=this.geometry,a=this._indirectBuffer,r=s.attributes.position,c=s.index?s.index.array:null,l=r.normalized;if(e<0||t+e-i.offset>i.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");const h=r.array,f=r.offset||0;let u=3;r.isInterleavedBufferAttribute&&(u=r.data.stride);const o=["getX","getY","getZ"],m=i.offset;for(let g=e,y=e+t;g<y;g++){const b=(a?a[g]:g)*3,p=(g-m)*6;let v=b+0,x=b+1,T=b+2;c&&(v=c[v],x=c[x],T=c[T]),l||(v=v*u+f,x=x*u+f,T=T*u+f);for(let w=0;w<3;w++){let S,M,I;l?(S=r[o[w]](v),M=r[o[w]](x),I=r[o[w]](T)):(S=h[v+w],M=h[x+w],I=h[T+w]);let _=S;M<_&&(_=M),I<_&&(_=I);let R=S;M>R&&(R=M),I>R&&(R=I);const A=(R-_)/2,P=w*2;i[p+P+0]=_+A,i[p+P+1]=A+(Math.abs(_)+A)*At}}return i}raycastObject3D(e,t,i=[]){const{material:s}=e;if(s===void 0)return;qi.copy(e.matrixWorld).invert(),bt.copy(t.ray).applyMatrix4(qi),Gi.setFromMatrixScale(e.matrixWorld),Vi.copy(bt.direction).multiply(Gi);const a=Vi.length(),r=t.near/a,c=t.far/a;if(t.firstHitOnly===!0){let l=this.raycastFirst(bt,s,r,c);l=Wi(l,e,t),l&&i.push(l)}else{const l=this.raycast(bt,s,r,c);for(let h=0,f=l.length;h<f;h++){const u=Wi(l[h],e,t);u&&i.push(u)}}return i}refit(e=null){return(this.indirect?sn:qs)(this,e)}raycast(e,t=Jt,i=0,s=1/0){const a=this._roots,r=[],c=this.indirect?nn:js;for(let l=0,h=a.length;l<h;l++)c(this,l,t,e,r,i,s);return r}raycastFirst(e,t=Jt,i=0,s=1/0){const a=this._roots;let r=null;const c=this.indirect?on:Qs;for(let l=0,h=a.length;l<h;l++){const f=c(this,l,t,e,i,s);f!=null&&(r==null||f.distance<r.distance)&&(r=f)}return r}intersectsGeometry(e,t){let i=!1;const s=this._roots,a=this.indirect?cn:Zs;for(let r=0,c=s.length;r<c&&(i=a(this,r,e,t),!i);r++);return i}shapecast(e){const t=J.getPrimitive(),i=super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:this.indirect?Ys:Vs});return J.releasePrimitive(t),i}bvhcast(e,t,i){let{intersectsRanges:s,intersectsTriangles:a}=i;const r=J.getPrimitive(),c=this.geometry.index,l=this.geometry.attributes.position,h=this.indirect?g=>{const y=this.resolveTriangleIndex(g);O(r,y*3,c,l)}:g=>{O(r,g*3,c,l)},f=J.getPrimitive(),u=e.geometry.index,o=e.geometry.attributes.position,m=e.indirect?g=>{const y=e.resolveTriangleIndex(g);O(f,y*3,u,o)}:g=>{O(f,g*3,u,o)};if(a){if(!(e instanceof Ct))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');const g=(y,d,b,p,v,x,T,w)=>{for(let S=b,M=b+p;S<M;S++){m(S),f.a.applyMatrix4(t),f.b.applyMatrix4(t),f.c.applyMatrix4(t),f.needsUpdate=!0;for(let I=y,_=y+d;I<_;I++)if(h(I),r.needsUpdate=!0,a(r,f,I,S,v,x,T,w))return!0}return!1};if(s){const y=s;s=function(d,b,p,v,x,T,w,S){return y(d,b,p,v,x,T,w,S)?!0:g(d,b,p,v,x,T,w,S)}}else s=g}return super.bvhcast(e,t,{intersectsRanges:s})}intersectsBox(e,t){return yt.set(e.min,e.max,t),yt.needsUpdate=!0,this.shapecast({intersectsBounds:i=>yt.intersectsBox(i),intersectsTriangle:i=>yt.intersectsTriangle(i)})}intersectsSphere(e){return this.shapecast({intersectsBounds:t=>e.intersectsBox(t),intersectsTriangle:t=>t.intersectsSphere(e)})}closestPointToGeometry(e,t,i={},s={},a=0,r=1/0){return(this.indirect?dn:rn)(this,e,t,i,s,a,r)}closestPointToPoint(e,t={},i=0,s=1/0){return Os(this,e,t,i,s)}}function mn(n){switch(n){case 1:return"R";case 2:return"RG";case 3:return"RGBA";case 4:return"RGBA"}throw new Error}function pn(n){switch(n){case 1:return It;case 2:return gr;case 3:return G;case 4:return G}}function $i(n){switch(n){case 1:return Xr;case 2:return pr;case 3:return ti;case 4:return ti}}class Rr extends re{constructor(){super(),this.minFilter=k,this.magFilter=k,this.generateMipmaps=!1,this.overrideItemSize=null,this._forcedType=null}updateFrom(e){const t=this.overrideItemSize,i=e.itemSize,s=e.count;if(t!==null){if(i*s%t!==0)throw new Error("VertexAttributeTexture: overrideItemSize must divide evenly into buffer length.");e.itemSize=t,e.count=s*i/t}const a=e.itemSize,r=e.count,c=e.normalized,l=e.array.constructor,h=l.BYTES_PER_ELEMENT;let f=this._forcedType,u=a;if(f===null)switch(l){case Float32Array:f=j;break;case Uint8Array:case Uint16Array:case Uint32Array:f=it;break;case Int8Array:case Int16Array:case Int32Array:f=Nt;break}let o,m,g,y,d=mn(a);switch(f){case j:g=1,m=pn(a),c&&h===1?(y=l,d+="8",l===Uint8Array?o=ei:(o=Ai,d+="_SNORM")):(y=Float32Array,d+="32F",o=j);break;case Nt:d+=h*8+"I",g=c?Math.pow(2,l.BYTES_PER_ELEMENT*8-1):1,m=$i(a),h===1?(y=Int8Array,o=Ai):h===2?(y=Int16Array,o=jr):(y=Int32Array,o=Nt);break;case it:d+=h*8+"UI",g=c?Math.pow(2,l.BYTES_PER_ELEMENT*8-1):1,m=$i(a),h===1?(y=Uint8Array,o=ei):h===2?(y=Uint16Array,o=Yr):(y=Uint32Array,o=it);break}u===3&&(m===G||m===ti)&&(u=4);const b=Math.ceil(Math.sqrt(r))||1,p=u*b*b,v=new y(p),x=e.normalized;e.normalized=!1;for(let T=0;T<r;T++){const w=u*T;v[w]=e.getX(T)/g,a>=2&&(v[w+1]=e.getY(T)/g),a>=3&&(v[w+2]=e.getZ(T)/g,u===4&&(v[w+3]=1)),a>=4&&(v[w+3]=e.getW(T)/g)}e.normalized=x,this.internalFormat=d,this.format=m,this.type=o,this.image.width=b,this.image.height=b,this.image.data=v,this.needsUpdate=!0,this.dispose(),e.itemSize=i,e.count=s}}class Pr extends Rr{constructor(){super(),this._forcedType=it}}class Cr extends Rr{constructor(){super(),this._forcedType=j}}class gn{constructor(){this.index=new Pr,this.position=new Cr,this.bvhBounds=new re,this.bvhContents=new re,this._cachedIndexAttr=null,this.index.overrideItemSize=3}updateFrom(e){const{geometry:t}=e;if(xn(e,this.bvhBounds,this.bvhContents),this.position.updateFrom(t.attributes.position),e.indirect){const i=e._indirectBuffer;if(this._cachedIndexAttr===null||this._cachedIndexAttr.count!==i.length)if(t.index)this._cachedIndexAttr=t.index.clone();else{const s=Ir(Dt(t));this._cachedIndexAttr=new Z(s,1,!1)}vn(t,i,this._cachedIndexAttr),this.index.updateFrom(this._cachedIndexAttr)}else this.index.updateFrom(t.index)}dispose(){const{index:e,position:t,bvhBounds:i,bvhContents:s}=this;e&&e.dispose(),t&&t.dispose(),i&&i.dispose(),s&&s.dispose()}}function vn(n,e,t){const i=t.array,s=n.index?n.index.array:null;for(let a=0,r=e.length;a<r;a++){const c=3*a,l=3*e[a];for(let h=0;h<3;h++)i[c+h]=s?s[l+h]:l+h}}function xn(n,e,t){const i=n._roots;if(i.length!==1)throw new Error("MeshBVHUniformStruct: Multi-root BVHs not supported.");const s=i[0],a=new Uint16Array(s),r=new Uint32Array(s),c=new Float32Array(s),l=s.byteLength/U,h=2*Math.ceil(Math.sqrt(l/2)),f=new Float32Array(4*h*h),u=Math.ceil(Math.sqrt(l)),o=new Uint32Array(2*u*u);for(let m=0;m<l;m++){const g=m*U/4,y=g*2,d=g;for(let b=0;b<3;b++)f[8*m+0+b]=c[d+0+b],f[8*m+4+b]=c[d+3+b];if(N(y,a)){const b=$(y,a),p=q(g,r),v=ps|b;o[m*2+0]=v,o[m*2+1]=p}else{const b=r[g+6],p=Ft(g,r);o[m*2+0]=p,o[m*2+1]=b}}e.image.data=f,e.image.width=h,e.image.height=h,e.format=G,e.type=j,e.internalFormat="RGBA32F",e.minFilter=k,e.magFilter=k,e.generateMipmaps=!1,e.needsUpdate=!0,e.dispose(),t.image.data=o,t.image.width=u,t.image.height=u,t.format=pr,t.type=it,t.internalFormat="RG32UI",t.minFilter=k,t.magFilter=k,t.generateMipmaps=!1,t.needsUpdate=!0,t.dispose()}const yn=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`,bn=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`,Tn=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`;function Fr(n,e,t=0){if(n.isInterleavedBufferAttribute){const i=n.itemSize;for(let s=0,a=n.count;s<a;s++){const r=s+t;e.setX(r,n.getX(s)),i>=2&&e.setY(r,n.getY(s)),i>=3&&e.setZ(r,n.getZ(s)),i>=4&&e.setW(r,n.getW(s))}}else{const i=e.array,s=i.constructor,a=i.BYTES_PER_ELEMENT*n.itemSize*t;new s(i.buffer,a,n.array.length).set(n.array)}}function tt(n,e=null){const t=n.array.constructor,i=n.normalized,s=n.itemSize,a=e===null?n.count:e;return new Z(new t(s*a),s,i)}function qe(n,e){if(!n&&!e)return!0;if(!!n!=!!e)return!1;const t=n.count===e.count,i=n.normalized===e.normalized,s=n.array.constructor===e.array.constructor,a=n.itemSize===e.itemSize;return!(!t||!i||!s||!a)}function wn(n){const e=n[0].index!==null,t=new Set(Object.keys(n[0].attributes));if(!n[0].getAttribute("position"))throw new Error("StaticGeometryGenerator: position attribute is required.");for(let i=0;i<n.length;++i){const s=n[i];let a=0;if(e!==(s.index!==null))throw new Error("StaticGeometryGenerator: All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.");for(const r in s.attributes){if(!t.has(r))throw new Error('StaticGeometryGenerator: All geometries must have compatible attributes; make sure "'+r+'" attribute exists among all geometries, or in none of them.');a++}if(a!==t.size)throw new Error("StaticGeometryGenerator: All geometries must have the same number of attributes.")}}function Sn(n){let e=0;for(let t=0,i=n.length;t<i;t++)e+=n[t].getIndex().count;return e}function _n(n){let e=0;for(let t=0,i=n.length;t<i;t++)e+=n[t].getAttribute("position").count;return e}function An(n,e,t){n.index&&n.index.count!==e&&n.setIndex(null);const i=n.attributes;for(const s in i)i[s].count!==t&&n.deleteAttribute(s)}function Mn(n,e={},t=new be){const{useGroups:i=!1,forceUpdate:s=!1,skipAssigningAttributes:a=[],overwriteIndex:r=!0}=e;wn(n);const c=n[0].index!==null,l=c?Sn(n):-1,h=_n(n);if(An(t,l,h),i){let u=0;for(let o=0,m=n.length;o<m;o++){const g=n[o];let y;c?y=g.getIndex().count:y=g.getAttribute("position").count,t.addGroup(u,y,o),u+=y}}if(c){let u=!1;if(t.index||(t.setIndex(new Z(new Uint32Array(l),1,!1)),u=!0),u||r){let o=0,m=0;const g=t.getIndex();for(let y=0,d=n.length;y<d;y++){const b=n[y],p=b.getIndex();if(!(!s&&!u&&a[y]))for(let x=0;x<p.count;++x)g.setX(o+x,p.getX(x)+m);o+=p.count,m+=b.getAttribute("position").count}}}const f=Object.keys(n[0].attributes);for(let u=0,o=f.length;u<o;u++){let m=!1;const g=f[u];if(!t.getAttribute(g)){const b=n[0].getAttribute(g);t.setAttribute(g,tt(b,h)),m=!0}let y=0;const d=t.getAttribute(g);for(let b=0,p=n.length;b<p;b++){const v=n[b],x=!s&&!m&&a[b],T=v.getAttribute(g);if(!x)if(g==="color"&&d.itemSize!==T.itemSize)for(let w=y,S=T.count;w<S;w++)T.setXYZW(w,d.getX(w),d.getY(w),d.getZ(w),1);else Fr(T,d,y);y+=T.count}}}function In(n,e,t){const i=n.index,a=n.attributes.position.count,r=i?i.count:a;let c=n.groups;c.length===0&&(c=[{count:r,start:0,materialIndex:0}]);let l=n.getAttribute("materialIndex");if(!l||l.count!==a){let f;t.length<=255?f=new Uint8Array(a):f=new Uint16Array(a),l=new Z(f,1,!1),n.deleteAttribute("materialIndex"),n.setAttribute("materialIndex",l)}const h=l.array;for(let f=0;f<c.length;f++){const u=c[f],o=u.start,m=u.count,g=Math.min(m,r-o),y=Array.isArray(e)?e[u.materialIndex]:e,d=t.indexOf(y);for(let b=0;b<g;b++){let p=o+b;i&&(p=i.getX(p)),h[p]=d}}}function Rn(n,e){if(!n.index){const t=n.attributes.position.count,i=new Array(t);for(let s=0;s<t;s++)i[s]=s;n.setIndex(i)}if(!n.attributes.normal&&e&&e.includes("normal")&&n.computeVertexNormals(),!n.attributes.uv&&e&&e.includes("uv")){const t=n.attributes.position.count;n.setAttribute("uv",new Z(new Float32Array(t*2),2,!1))}if(!n.attributes.uv2&&e&&e.includes("uv2")){const t=n.attributes.position.count;n.setAttribute("uv2",new Z(new Float32Array(t*2),2,!1))}if(!n.attributes.tangent&&e&&e.includes("tangent"))if(n.attributes.uv&&n.attributes.normal)n.computeTangents();else{const t=n.attributes.position.count;n.setAttribute("tangent",new Z(new Float32Array(t*4),4,!1))}if(!n.attributes.color&&e&&e.includes("color")){const t=n.attributes.position.count,i=new Float32Array(t*4);i.fill(1),n.setAttribute("color",new Z(i,4))}}function bi(n){let e=0;if(n.byteLength!==0){const t=new Uint8Array(n);for(let i=0;i<n.byteLength;i++){const s=t[i];e=(e<<5)-e+s,e|=0}}return e}function Yi(n){let e=n.uuid;const t=Object.values(n.attributes);n.index&&(t.push(n.index),e+=`index|${n.index.version}`);const i=Object.keys(t).sort();for(const s of i){const a=t[s];e+=`${s}_${a.version}|`}return e}function ji(n){const e=n.skeleton;return e?(e.boneTexture||e.computeBoneTexture(),`${bi(e.boneTexture.image.data.buffer)}_${e.boneTexture.uuid}`):null}class Pn{constructor(e=null){this.matrixWorld=new V,this.geometryHash=null,this.skeletonHash=null,this.primitiveCount=-1,e!==null&&this.updateFrom(e)}updateFrom(e){const t=e.geometry,i=(t.index?t.index.count:t.attributes.position.count)/3;this.matrixWorld.copy(e.matrixWorld),this.geometryHash=Yi(t),this.primitiveCount=i,this.skeletonHash=ji(e)}didChange(e){const t=e.geometry,i=(t.index?t.index.count:t.attributes.position.count)/3;return!(this.matrixWorld.equals(e.matrixWorld)&&this.geometryHash===Yi(t)&&this.skeletonHash===ji(e)&&this.primitiveCount===i)}}const Ae=new F,Me=new F,Ie=new F,Xi=new Ye,Tt=new F,jt=new F,Qi=new Ye,Zi=new Ye,wt=new V,Ki=new V;function Ji(n,e,t){const i=n.skeleton,s=n.geometry,a=i.bones,r=i.boneInverses;Qi.fromBufferAttribute(s.attributes.skinIndex,e),Zi.fromBufferAttribute(s.attributes.skinWeight,e),wt.elements.fill(0);for(let c=0;c<4;c++){const l=Zi.getComponent(c);if(l!==0){const h=Qi.getComponent(c);Ki.multiplyMatrices(a[h].matrixWorld,r[h]),Cn(wt,Ki,l)}}return wt.multiply(n.bindMatrix).premultiply(n.bindMatrixInverse),t.transformDirection(wt),t}function Xt(n,e,t,i,s){Tt.set(0,0,0);for(let a=0,r=n.length;a<r;a++){const c=e[a],l=n[a];c!==0&&(jt.fromBufferAttribute(l,i),t?Tt.addScaledVector(jt,c):Tt.addScaledVector(jt.sub(s),c))}s.add(Tt)}function Cn(n,e,t){const i=n.elements,s=e.elements;for(let a=0,r=s.length;a<r;a++)i[a]+=s[a]*t}function Fn(n){const{index:e,attributes:t}=n;if(e)for(let i=0,s=e.count;i<s;i+=3){const a=e.getX(i),r=e.getX(i+2);e.setX(i,r),e.setX(i+2,a)}else for(const i in t){const s=t[i],a=s.itemSize;for(let r=0,c=s.count;r<c;r+=3)for(let l=0;l<a;l++){const h=s.getComponent(r,l),f=s.getComponent(r+2,l);s.setComponent(r,l,f),s.setComponent(r+2,l,h)}}return n}function Dn(n,e={},t=new be){e={applyWorldTransforms:!0,attributes:[],...e};const i=n.geometry,s=e.applyWorldTransforms,a=e.attributes.includes("normal"),r=e.attributes.includes("tangent"),c=i.attributes,l=t.attributes;for(const p in t.attributes)(!e.attributes.includes(p)||!(p in i.attributes))&&t.deleteAttribute(p);!t.index&&i.index&&(t.index=i.index.clone()),l.position||t.setAttribute("position",tt(c.position)),a&&!l.normal&&c.normal&&t.setAttribute("normal",tt(c.normal)),r&&!l.tangent&&c.tangent&&t.setAttribute("tangent",tt(c.tangent)),qe(i.index,t.index),qe(c.position,l.position),a&&qe(c.normal,l.normal),r&&qe(c.tangent,l.tangent);const h=c.position,f=a?c.normal:null,u=r?c.tangent:null,o=i.morphAttributes.position,m=i.morphAttributes.normal,g=i.morphAttributes.tangent,y=i.morphTargetsRelative,d=n.morphTargetInfluences,b=new Qr;b.getNormalMatrix(n.matrixWorld),i.index&&t.index.array.set(i.index.array);for(let p=0,v=c.position.count;p<v;p++)Ae.fromBufferAttribute(h,p),f&&Me.fromBufferAttribute(f,p),u&&(Xi.fromBufferAttribute(u,p),Ie.fromBufferAttribute(u,p)),d&&(o&&Xt(o,d,y,p,Ae),m&&Xt(m,d,y,p,Me),g&&Xt(g,d,y,p,Ie)),n.isSkinnedMesh&&(n.applyBoneTransform(p,Ae),f&&Ji(n,p,Me),u&&Ji(n,p,Ie)),s&&Ae.applyMatrix4(n.matrixWorld),l.position.setXYZ(p,Ae.x,Ae.y,Ae.z),f&&(s&&Me.applyNormalMatrix(b),l.normal.setXYZ(p,Me.x,Me.y,Me.z)),u&&(s&&Ie.transformDirection(n.matrixWorld),l.tangent.setXYZW(p,Ie.x,Ie.y,Ie.z,Xi.w));for(const p in e.attributes){const v=e.attributes[p];v==="position"||v==="tangent"||v==="normal"||!(v in c)||(l[v]||t.setAttribute(v,tt(c[v])),qe(c[v],l[v]),Fr(c[v],l[v]))}return n.matrixWorld.determinant()<0&&Fn(t),t}class Bn extends be{constructor(){super(),this.version=0,this.hash=null,this._diff=new Pn}isCompatible(e,t){const i=e.geometry;for(let s=0;s<t.length;s++){const a=t[s],r=i.attributes[a],c=this.attributes[a];if(r&&!qe(r,c))return!1}return!0}updateFrom(e,t){const i=this._diff;return i.didChange(e)?(Dn(e,t,this),i.updateFrom(e),this.version++,this.hash=`${this.uuid}_${this.version}`,!0):!1}}const di=0,Dr=1,Br=2;function En(n,e){for(let t=0,i=n.length;t<i;t++)n[t].traverseVisible(a=>{a.isMesh&&e(a)})}function zn(n){const e=[];for(let t=0,i=n.length;t<i;t++){const s=n[t];Array.isArray(s.material)?e.push(...s.material):e.push(s.material)}return e}function kn(n,e,t){if(n.length===0){e.setIndex(null);const i=e.attributes;for(const s in i)e.deleteAttribute(s);for(const s in t.attributes)e.setAttribute(t.attributes[s],new Z(new Float32Array(0),4,!1))}else Mn(n,t,e);for(const i in e.attributes)e.attributes[i].needsUpdate=!0}class Nn{constructor(e){this.objects=null,this.useGroups=!0,this.applyWorldTransforms=!0,this.generateMissingAttributes=!0,this.overwriteIndex=!0,this.attributes=["position","normal","color","tangent","uv","uv2"],this._intermediateGeometry=new Map,this._geometryMergeSets=new WeakMap,this._mergeOrder=[],this._dummyMesh=null,this.setObjects(e||[])}_getDummyMesh(){if(!this._dummyMesh){const e=new ii,t=new be;t.setAttribute("position",new Z(new Float32Array(9),3)),this._dummyMesh=new Rt(t,e)}return this._dummyMesh}_getMeshes(){const e=[];return En(this.objects,t=>{e.push(t)}),e.sort((t,i)=>t.uuid>i.uuid?1:t.uuid<i.uuid?-1:0),e.length===0&&e.push(this._getDummyMesh()),e}_updateIntermediateGeometries(){const{_intermediateGeometry:e}=this,t=this._getMeshes(),i=new Set(e.keys()),s={attributes:this.attributes,applyWorldTransforms:this.applyWorldTransforms};for(let a=0,r=t.length;a<r;a++){const c=t[a],l=c.uuid;i.delete(l);let h=e.get(l);(!h||!h.isCompatible(c,this.attributes))&&(h&&h.dispose(),h=new Bn,e.set(l,h)),h.updateFrom(c,s)&&this.generateMissingAttributes&&Rn(h,this.attributes)}i.forEach(a=>{e.delete(a)})}setObjects(e){Array.isArray(e)?this.objects=[...e]:this.objects=[e]}generate(e=new be){const{useGroups:t,overwriteIndex:i,_intermediateGeometry:s,_geometryMergeSets:a}=this,r=this._getMeshes(),c=[],l=[],h=a.get(e)||[];this._updateIntermediateGeometries();let f=!1;r.length!==h.length&&(f=!0);for(let o=0,m=r.length;o<m;o++){const g=r[o],y=s.get(g.uuid);l.push(y);const d=h[o];!d||d.uuid!==y.uuid?(c.push(!1),f=!0):d.version!==y.version?c.push(!1):c.push(!0)}kn(l,e,{useGroups:t,forceUpdate:f,skipAssigningAttributes:c,overwriteIndex:i}),f&&e.dispose(),a.set(e,l.map(o=>({version:o.version,uuid:o.uuid})));let u=di;return f?u=Br:c.includes(!1)&&(u=Dr),{changeType:u,materials:zn(r),geometry:e}}}function On(n){const e=new Set;for(let t=0,i=n.length;t<i;t++){const s=n[t];for(const a in s){const r=s[a];r&&r.isTexture&&e.add(r)}}return Array.from(e)}function Ln(n){const e=[],t=new Set;for(let s=0,a=n.length;s<a;s++)n[s].traverse(r=>{r.visible&&(r.isRectAreaLight||r.isSpotLight||r.isPointLight||r.isDirectionalLight)&&(e.push(r),r.iesMap&&t.add(r.iesMap))});const i=Array.from(t).sort((s,a)=>s.uuid<a.uuid?1:s.uuid>a.uuid?-1:0);return{lights:e,iesTextures:i}}class Un{get initialized(){return!!this.bvh}constructor(e){this.bvhOptions={},this.attributes=["position","normal","tangent","color","uv","uv2"],this.generateBVH=!0,this.bvh=null,this.geometry=new be,this.staticGeometryGenerator=new Nn(e),this._bvhWorker=null,this._pendingGenerate=null,this._buildAsync=!1,this._materialUuids=null}setObjects(e){this.staticGeometryGenerator.setObjects(e)}setBVHWorker(e){this._bvhWorker=e}async generateAsync(e=null){if(!this._bvhWorker)throw new Error('PathTracingSceneGenerator: "setBVHWorker" must be called before "generateAsync" can be called.');if(this.bvh instanceof Promise)return this._pendingGenerate||(this._pendingGenerate=new Promise(async()=>(await this.bvh,this._pendingGenerate=null,this.generateAsync(e)))),this._pendingGenerate;{this._buildAsync=!0;const t=this.generate(e);return this._buildAsync=!1,t.bvh=this.bvh=await t.bvh,t}}generate(e=null){const{staticGeometryGenerator:t,geometry:i,attributes:s}=this,a=t.objects;t.attributes=s,a.forEach(o=>{o.traverse(m=>{m.isSkinnedMesh&&m.skeleton&&m.skeleton.update()})});const r=t.generate(i),c=r.materials;let l=r.changeType!==di||this._materialUuids===null||this._materialUuids.length!==length;if(!l){for(let o=0,m=c.length;o<m;o++)if(c[o].uuid!==this._materialUuids[o]){l=!0;break}}const h=On(c),{lights:f,iesTextures:u}=Ln(a);if(l&&(In(i,c,c),this._materialUuids=c.map(o=>o.uuid)),this.generateBVH){if(this.bvh instanceof Promise)throw new Error("PathTracingSceneGenerator: BVH is already building asynchronously.");if(r.changeType===Br){const o={strategy:Sr,maxLeafTris:1,indirect:!0,onProgress:e,...this.bvhOptions};this._buildAsync?this.bvh=this._bvhWorker.generate(i,o):this.bvh=new Ct(i,o)}else r.changeType===Dr&&this.bvh.refit()}return{bvhChanged:r.changeType!==di,bvh:this.bvh,needsMaterialIndexUpdate:l,lights:f,iesTextures:u,geometry:i,materials:c,textures:h,objects:a}}}const Hn=new Zr(-1,1,1,-1,0,1);class Wn extends be{constructor(){super(),this.setAttribute("position",new Mi([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Mi([0,2,0,0,2,0],2))}}const Vn=new Wn;class Ce{constructor(e){this._mesh=new Rt(Vn,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Hn)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Ti extends nt{set needsUpdate(e){super.needsUpdate=!0,this.dispatchEvent({type:"recompilation"})}constructor(e){super(e);for(const t in this.uniforms)Object.defineProperty(this,t,{get(){return this.uniforms[t].value},set(i){this.uniforms[t].value=i}})}setDefine(e,t=void 0){if(t==null){if(e in this.defines)return delete this.defines[e],this.needsUpdate=!0,!0}else if(this.defines[e]!==t)return this.defines[e]=t,this.needsUpdate=!0,!0;return!1}}class qn extends Ti{constructor(e){super({blending:st,uniforms:{target1:{value:null},target2:{value:null},opacity:{value:1}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				uniform float opacity;

				uniform sampler2D target1;
				uniform sampler2D target2;

				varying vec2 vUv;

				void main() {

					vec4 color1 = texture2D( target1, vUv );
					vec4 color2 = texture2D( target2, vUv );

					float invOpacity = 1.0 - opacity;
					float totalAlpha = color1.a * invOpacity + color2.a * opacity;

					if ( color1.a != 0.0 || color2.a != 0.0 ) {

						gl_FragColor.rgb = color1.rgb * ( invOpacity * color1.a / totalAlpha ) + color2.rgb * ( opacity * color2.a / totalAlpha );
						gl_FragColor.a = totalAlpha;

					} else {

						gl_FragColor = vec4( 0.0 );

					}

				}`}),this.setValues(e)}}function St(n=1){let e="uint";return n>1&&(e="uvec"+n),`
		${e} sobolReverseBits( ${e} x ) {

			x = ( ( ( x & 0xaaaaaaaau ) >> 1 ) | ( ( x & 0x55555555u ) << 1 ) );
			x = ( ( ( x & 0xccccccccu ) >> 2 ) | ( ( x & 0x33333333u ) << 2 ) );
			x = ( ( ( x & 0xf0f0f0f0u ) >> 4 ) | ( ( x & 0x0f0f0f0fu ) << 4 ) );
			x = ( ( ( x & 0xff00ff00u ) >> 8 ) | ( ( x & 0x00ff00ffu ) << 8 ) );
			return ( ( x >> 16 ) | ( x << 16 ) );

		}

		${e} sobolHashCombine( uint seed, ${e} v ) {

			return seed ^ ( v + ${e}( ( seed << 6 ) + ( seed >> 2 ) ) );

		}

		${e} sobolLaineKarrasPermutation( ${e} x, ${e} seed ) {

			x += seed;
			x ^= x * 0x6c50b47cu;
			x ^= x * 0xb82f1e52u;
			x ^= x * 0xc7afe638u;
			x ^= x * 0x8d22f6e6u;
			return x;

		}

		${e} nestedUniformScrambleBase2( ${e} x, ${e} seed ) {

			x = sobolLaineKarrasPermutation( x, seed );
			x = sobolReverseBits( x );
			return x;

		}
	`}function _t(n=1){let e="uint",t="float",i="",s=".r",a="1u";return n>1&&(e="uvec"+n,t="vec"+n,i=n+"",n===2?(s=".rg",a="uvec2( 1u, 2u )"):n===3?(s=".rgb",a="uvec3( 1u, 2u, 3u )"):(s="",a="uvec4( 1u, 2u, 3u, 4u )")),`

		${t} sobol${i}( int effect ) {

			uint seed = sobolGetSeed( sobolBounceIndex, uint( effect ) );
			uint index = sobolPathIndex;

			uint shuffle_seed = sobolHashCombine( seed, 0u );
			uint shuffled_index = nestedUniformScrambleBase2( sobolReverseBits( index ), shuffle_seed );
			${t} sobol_pt = sobolGetTexturePoint( shuffled_index )${s};
			${e} result = ${e}( sobol_pt * 16777216.0 );

			${e} seed2 = sobolHashCombine( seed, ${a} );
			result = nestedUniformScrambleBase2( result, seed2 );

			return SOBOL_FACTOR * ${t}( result >> 8 );

		}
	`}const Er=`

	// Utils
	const float SOBOL_FACTOR = 1.0 / 16777216.0;
	const uint SOBOL_MAX_POINTS = 256u * 256u;

	${St(1)}
	${St(2)}
	${St(3)}
	${St(4)}

	uint sobolHash( uint x ) {

		// finalizer from murmurhash3
		x ^= x >> 16;
		x *= 0x85ebca6bu;
		x ^= x >> 13;
		x *= 0xc2b2ae35u;
		x ^= x >> 16;
		return x;

	}

`,Gn=`

	const uint SOBOL_DIRECTIONS_1[ 32 ] = uint[ 32 ](
		0x80000000u, 0xc0000000u, 0xa0000000u, 0xf0000000u,
		0x88000000u, 0xcc000000u, 0xaa000000u, 0xff000000u,
		0x80800000u, 0xc0c00000u, 0xa0a00000u, 0xf0f00000u,
		0x88880000u, 0xcccc0000u, 0xaaaa0000u, 0xffff0000u,
		0x80008000u, 0xc000c000u, 0xa000a000u, 0xf000f000u,
		0x88008800u, 0xcc00cc00u, 0xaa00aa00u, 0xff00ff00u,
		0x80808080u, 0xc0c0c0c0u, 0xa0a0a0a0u, 0xf0f0f0f0u,
		0x88888888u, 0xccccccccu, 0xaaaaaaaau, 0xffffffffu
	);

	const uint SOBOL_DIRECTIONS_2[ 32 ] = uint[ 32 ](
		0x80000000u, 0xc0000000u, 0x60000000u, 0x90000000u,
		0xe8000000u, 0x5c000000u, 0x8e000000u, 0xc5000000u,
		0x68800000u, 0x9cc00000u, 0xee600000u, 0x55900000u,
		0x80680000u, 0xc09c0000u, 0x60ee0000u, 0x90550000u,
		0xe8808000u, 0x5cc0c000u, 0x8e606000u, 0xc5909000u,
		0x6868e800u, 0x9c9c5c00u, 0xeeee8e00u, 0x5555c500u,
		0x8000e880u, 0xc0005cc0u, 0x60008e60u, 0x9000c590u,
		0xe8006868u, 0x5c009c9cu, 0x8e00eeeeu, 0xc5005555u
	);

	const uint SOBOL_DIRECTIONS_3[ 32 ] = uint[ 32 ](
		0x80000000u, 0xc0000000u, 0x20000000u, 0x50000000u,
		0xf8000000u, 0x74000000u, 0xa2000000u, 0x93000000u,
		0xd8800000u, 0x25400000u, 0x59e00000u, 0xe6d00000u,
		0x78080000u, 0xb40c0000u, 0x82020000u, 0xc3050000u,
		0x208f8000u, 0x51474000u, 0xfbea2000u, 0x75d93000u,
		0xa0858800u, 0x914e5400u, 0xdbe79e00u, 0x25db6d00u,
		0x58800080u, 0xe54000c0u, 0x79e00020u, 0xb6d00050u,
		0x800800f8u, 0xc00c0074u, 0x200200a2u, 0x50050093u
	);

	const uint SOBOL_DIRECTIONS_4[ 32 ] = uint[ 32 ](
		0x80000000u, 0x40000000u, 0x20000000u, 0xb0000000u,
		0xf8000000u, 0xdc000000u, 0x7a000000u, 0x9d000000u,
		0x5a800000u, 0x2fc00000u, 0xa1600000u, 0xf0b00000u,
		0xda880000u, 0x6fc40000u, 0x81620000u, 0x40bb0000u,
		0x22878000u, 0xb3c9c000u, 0xfb65a000u, 0xddb2d000u,
		0x78022800u, 0x9c0b3c00u, 0x5a0fb600u, 0x2d0ddb00u,
		0xa2878080u, 0xf3c9c040u, 0xdb65a020u, 0x6db2d0b0u,
		0x800228f8u, 0x400b3cdcu, 0x200fb67au, 0xb00ddb9du
	);

	uint getMaskedSobol( uint index, uint directions[ 32 ] ) {

		uint X = 0u;
		for ( int bit = 0; bit < 32; bit ++ ) {

			uint mask = ( index >> bit ) & 1u;
			X ^= mask * directions[ bit ];

		}
		return X;

	}

	vec4 generateSobolPoint( uint index ) {

		if ( index >= SOBOL_MAX_POINTS ) {

			return vec4( 0.0 );

		}

		// NOTE: this sobol "direction" is also available but we can't write out 5 components
		// uint x = index & 0x00ffffffu;
		uint x = sobolReverseBits( getMaskedSobol( index, SOBOL_DIRECTIONS_1 ) ) & 0x00ffffffu;
		uint y = sobolReverseBits( getMaskedSobol( index, SOBOL_DIRECTIONS_2 ) ) & 0x00ffffffu;
		uint z = sobolReverseBits( getMaskedSobol( index, SOBOL_DIRECTIONS_3 ) ) & 0x00ffffffu;
		uint w = sobolReverseBits( getMaskedSobol( index, SOBOL_DIRECTIONS_4 ) ) & 0x00ffffffu;

		return vec4( x, y, z, w ) * SOBOL_FACTOR;

	}

`,$n=`

	// Seeds
	uniform sampler2D sobolTexture;
	uint sobolPixelIndex = 0u;
	uint sobolPathIndex = 0u;
	uint sobolBounceIndex = 0u;

	uint sobolGetSeed( uint bounce, uint effect ) {

		return sobolHash(
			sobolHashCombine(
				sobolHashCombine(
					sobolHash( bounce ),
					sobolPixelIndex
				),
				effect
			)
		);

	}

	vec4 sobolGetTexturePoint( uint index ) {

		if ( index >= SOBOL_MAX_POINTS ) {

			index = index % SOBOL_MAX_POINTS;

		}

		uvec2 dim = uvec2( textureSize( sobolTexture, 0 ).xy );
		uint y = index / dim.x;
		uint x = index - y * dim.x;
		vec2 uv = vec2( x, y ) / vec2( dim );
		return texture( sobolTexture, uv );

	}

	${_t(1)}
	${_t(2)}
	${_t(3)}
	${_t(4)}

`;class Yn extends Ti{constructor(){super({blending:st,uniforms:{resolution:{value:new Y}},vertexShader:`

				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,fragmentShader:`

				${Er}
				${Gn}

				varying vec2 vUv;
				uniform vec2 resolution;
				void main() {

					uint index = uint( gl_FragCoord.y ) * uint( resolution.x ) + uint( gl_FragCoord.x );
					gl_FragColor = generateSobolPoint( index );

				}
			`})}}class jn{generate(e,t=256){const i=new $e(t,t,{type:j,format:G,minFilter:k,magFilter:k,generateMipmaps:!1}),s=e.getRenderTarget();e.setRenderTarget(i);const a=new Ce(new Yn);return a.material.resolution.set(t,t),a.render(e),e.setRenderTarget(s),a.dispose(),i}}class zr extends vr{set bokehSize(e){this.fStop=this.getFocalLength()/e}get bokehSize(){return this.getFocalLength()/this.fStop}constructor(...e){super(...e),this.fStop=1.4,this.apertureBlades=0,this.apertureRotation=0,this.focusDistance=25,this.anamorphicRatio=1}copy(e,t){return super.copy(e,t),this.fStop=e.fStop,this.apertureBlades=e.apertureBlades,this.apertureRotation=e.apertureRotation,this.focusDistance=e.focusDistance,this.anamorphicRatio=e.anamorphicRatio,this}}class Xn{constructor(){this.bokehSize=0,this.apertureBlades=0,this.apertureRotation=0,this.focusDistance=10,this.anamorphicRatio=1}updateFrom(e){e instanceof zr?(this.bokehSize=e.bokehSize,this.apertureBlades=e.apertureBlades,this.apertureRotation=e.apertureRotation,this.focusDistance=e.focusDistance,this.anamorphicRatio=e.anamorphicRatio):(this.bokehSize=0,this.apertureRotation=0,this.apertureBlades=0,this.focusDistance=10,this.anamorphicRatio=1)}}function Qt(n){const e=new Uint16Array(n.length);for(let t=0,i=n.length;t<i;++t)e[t]=de.toHalfFloat(n[t]);return e}function er(n,e,t=0,i=n.length){let s=t,a=t+i-1;for(;s<a;){const r=s+a>>1;n[r]<e?s=r+1:a=r}return s-t}function Qn(n,e,t){return .2126*n+.7152*e+.0722*t}function Zn(n,e=ce){const t=n.clone();t.source=new Kr({...t.image});const{width:i,height:s,data:a}=t.image;let r=a;if(t.type!==e){e===ce?r=new Uint16Array(a.length):r=new Float32Array(a.length);let c;a instanceof Int8Array||a instanceof Int16Array||a instanceof Int32Array?c=2**(8*a.BYTES_PER_ELEMENT-1)-1:c=2**(8*a.BYTES_PER_ELEMENT)-1;for(let l=0,h=a.length;l<h;l++){let f=a[l];t.type===ce&&(f=de.fromHalfFloat(a[l])),t.type!==j&&t.type!==ce&&(f/=c),e===ce&&(r[l]=de.toHalfFloat(f))}t.image.data=r,t.type=e}if(t.flipY){const c=r;r=r.slice();for(let l=0;l<s;l++)for(let h=0;h<i;h++){const f=s-l-1,u=4*(l*i+h),o=4*(f*i+h);r[o+0]=c[u+0],r[o+1]=c[u+1],r[o+2]=c[u+2],r[o+3]=c[u+3]}t.flipY=!1,t.image.data=r}return t}class Kn{constructor(){const e=new re(Qt(new Float32Array([0,0,0,0])),1,1);e.type=ce,e.format=G,e.minFilter=fe,e.magFilter=fe,e.wrapS=Re,e.wrapT=Re,e.generateMipmaps=!1,e.needsUpdate=!0;const t=new re(Qt(new Float32Array([0,1])),1,2);t.type=ce,t.format=It,t.minFilter=fe,t.magFilter=fe,t.generateMipmaps=!1,t.needsUpdate=!0;const i=new re(Qt(new Float32Array([0,0,1,1])),2,2);i.type=ce,i.format=It,i.minFilter=fe,i.magFilter=fe,i.generateMipmaps=!1,i.needsUpdate=!0,this.map=e,this.marginalWeights=t,this.conditionalWeights=i,this.totalSum=0}dispose(){this.marginalWeights.dispose(),this.conditionalWeights.dispose(),this.map.dispose()}updateFrom(e){const t=Zn(e);t.wrapS=Re,t.wrapT=Pe;const{width:i,height:s,data:a}=t.image,r=new Float32Array(i*s),c=new Float32Array(i*s),l=new Float32Array(s),h=new Float32Array(s);let f=0,u=0;for(let d=0;d<s;d++){let b=0;for(let p=0;p<i;p++){const v=d*i+p,x=de.fromHalfFloat(a[4*v+0]),T=de.fromHalfFloat(a[4*v+1]),w=de.fromHalfFloat(a[4*v+2]),S=Qn(x,T,w);b+=S,f+=S,r[v]=S,c[v]=b}if(b!==0)for(let p=d*i,v=d*i+i;p<v;p++)r[p]/=b,c[p]/=b;u+=b,l[d]=b,h[d]=u}if(u!==0)for(let d=0,b=l.length;d<b;d++)l[d]/=u,h[d]/=u;const o=new Uint16Array(s),m=new Uint16Array(i*s);for(let d=0;d<s;d++){const b=(d+1)/s,p=er(h,b);o[d]=de.toHalfFloat((p+.5)/s)}for(let d=0;d<s;d++)for(let b=0;b<i;b++){const p=d*i+b,v=(b+1)/i,x=er(c,v,d*i,i);m[p]=de.toHalfFloat((x+.5)/i)}this.dispose();const{marginalWeights:g,conditionalWeights:y}=this;g.image={width:s,height:1,data:o},g.needsUpdate=!0,y.image={width:i,height:s,data:m},y.needsUpdate=!0,this.totalSum=f,this.map=t}}const Zt=6,Jn=0,ea=1,ta=2,ia=3,ra=4,te=new F,Q=new F,tr=new V,Ue=new xr,ir=new F,He=new F,sa=new F(0,1,0);class na{constructor(){const e=new re(new Float32Array(4),1,1);e.format=G,e.type=j,e.wrapS=Pe,e.wrapT=Pe,e.generateMipmaps=!1,e.minFilter=k,e.magFilter=k,this.tex=e,this.count=0}updateFrom(e,t=[]){const i=this.tex,s=Math.max(e.length*Zt,1),a=Math.ceil(Math.sqrt(s));i.image.width!==a&&(i.dispose(),i.image.data=new Float32Array(a*a*4),i.image.width=a,i.image.height=a);const r=i.image.data;for(let l=0,h=e.length;l<h;l++){const f=e[l],u=l*Zt*4;let o=0;for(let g=0;g<Zt*4;g++)r[u+g]=0;f.getWorldPosition(Q),r[u+o++]=Q.x,r[u+o++]=Q.y,r[u+o++]=Q.z;let m=Jn;if(f.isRectAreaLight&&f.isCircular?m=ea:f.isSpotLight?m=ta:f.isDirectionalLight?m=ia:f.isPointLight&&(m=ra),r[u+o++]=m,r[u+o++]=f.color.r,r[u+o++]=f.color.g,r[u+o++]=f.color.b,r[u+o++]=f.intensity,f.getWorldQuaternion(Ue),f.isRectAreaLight)te.set(f.width,0,0).applyQuaternion(Ue),r[u+o++]=te.x,r[u+o++]=te.y,r[u+o++]=te.z,o++,Q.set(0,f.height,0).applyQuaternion(Ue),r[u+o++]=Q.x,r[u+o++]=Q.y,r[u+o++]=Q.z,r[u+o++]=te.cross(Q).length()*(f.isCircular?Math.PI/4:1);else if(f.isSpotLight){const g=f.radius||0;ir.setFromMatrixPosition(f.matrixWorld),He.setFromMatrixPosition(f.target.matrixWorld),tr.lookAt(ir,He,sa),Ue.setFromRotationMatrix(tr),te.set(1,0,0).applyQuaternion(Ue),r[u+o++]=te.x,r[u+o++]=te.y,r[u+o++]=te.z,o++,Q.set(0,1,0).applyQuaternion(Ue),r[u+o++]=Q.x,r[u+o++]=Q.y,r[u+o++]=Q.z,r[u+o++]=Math.PI*g*g,r[u+o++]=g,r[u+o++]=f.decay,r[u+o++]=f.distance,r[u+o++]=Math.cos(f.angle),r[u+o++]=Math.cos(f.angle*(1-f.penumbra)),r[u+o++]=f.iesMap?t.indexOf(f.iesMap):-1}else if(f.isPointLight){const g=te.setFromMatrixPosition(f.matrixWorld);r[u+o++]=g.x,r[u+o++]=g.y,r[u+o++]=g.z,o++,o+=4,o+=1,r[u+o++]=f.decay,r[u+o++]=f.distance}else if(f.isDirectionalLight){const g=te.setFromMatrixPosition(f.matrixWorld),y=Q.setFromMatrixPosition(f.target.matrixWorld);He.subVectors(g,y).normalize(),r[u+o++]=He.x,r[u+o++]=He.y,r[u+o++]=He.z}}this.count=e.length;const c=bi(r.buffer);return this.hash!==c?(this.hash=c,i.needsUpdate=!0,!0):!1}}function rr(n,e,t,i,s){if(e>i)throw new Error;const a=n.length/e,r=n.constructor.BYTES_PER_ELEMENT*8;let c=1;switch(n.constructor){case Uint8Array:case Uint16Array:case Uint32Array:c=2**r-1;break;case Int8Array:case Int16Array:case Int32Array:c=2**(r-1)-1;break}for(let l=0;l<a;l++){const h=4*l,f=e*l;for(let u=0;u<i;u++)t[s+h+u]=e>=u+1?n[f+u]/c:0}}class aa extends Jr{constructor(){super(),this._textures=[],this.type=j,this.format=G,this.internalFormat="RGBA32F"}updateAttribute(e,t){const i=this._textures[e];i.updateFrom(t);const s=i.image,a=this.image;if(s.width!==a.width||s.height!==a.height)throw new Error("FloatAttributeTextureArray: Attribute must be the same dimensions when updating single layer.");const{width:r,height:c,data:l}=a,f=r*c*4*e;let u=t.itemSize;u===3&&(u=4),rr(i.image.data,u,l,4,f),this.dispose(),this.needsUpdate=!0}setAttributes(e){const t=e[0].count,i=e.length;for(let u=0,o=i;u<o;u++)if(e[u].count!==t)throw new Error("FloatAttributeTextureArray: All attributes must have the same item count.");const s=this._textures;for(;s.length<i;){const u=new Cr;s.push(u)}for(;s.length>i;)s.pop();for(let u=0,o=i;u<o;u++)s[u].updateFrom(e[u]);const r=s[0].image,c=this.image;(r.width!==c.width||r.height!==c.height||r.depth!==i)&&(c.width=r.width,c.height=r.height,c.depth=i,c.data=new Float32Array(c.width*c.height*c.depth*4));const{data:l,width:h,height:f}=c;for(let u=0,o=i;u<o;u++){const m=s[u],y=h*f*4*u;let d=e[u].itemSize;d===3&&(d=4),rr(m.image.data,d,l,4,y)}this.dispose(),this.needsUpdate=!0}}class oa extends aa{updateNormalAttribute(e){this.updateAttribute(0,e)}updateTangentAttribute(e){this.updateAttribute(1,e)}updateUvAttribute(e){this.updateAttribute(2,e)}updateColorAttribute(e){this.updateAttribute(3,e)}updateFrom(e,t,i,s){this.setAttributes([e,t,i,s])}}function wi(n,e){return n.uuid<e.uuid?1:n.uuid>e.uuid?-1:0}function mi(n){return`${n.source.uuid}:${n.colorSpace}`}function ca(n){const e=new Set,t=[];for(let i=0,s=n.length;i<s;i++){const a=n[i],r=mi(a);e.has(r)||(e.add(r),t.push(a))}return t}function la(n){const e=n.map(i=>i.iesMap||null).filter(i=>i),t=new Set(e);return Array.from(t).sort(wi)}function ua(n){const e=new Set;for(let i=0,s=n.length;i<s;i++){const a=n[i];for(const r in a){const c=a[r];c&&c.isTexture&&e.add(c)}}const t=Array.from(e);return ca(t).sort(wi)}function fa(n){const e=[];return n.traverse(t=>{t.visible&&(t.isRectAreaLight||t.isSpotLight||t.isPointLight||t.isDirectionalLight)&&e.push(t)}),e.sort(wi)}const Si=47,sr=Si*4;class ha{constructor(){this._features={}}isUsed(e){return e in this._features}setUsed(e,t=!0){t===!1?delete this._features[e]:this._features[e]=!0}reset(){this._features={}}}class da extends re{constructor(){super(new Float32Array(4),1,1),this.format=G,this.type=j,this.wrapS=Pe,this.wrapT=Pe,this.minFilter=k,this.magFilter=k,this.generateMipmaps=!1,this.features=new ha}updateFrom(e,t){function i(g,y,d=-1){if(y in g&&g[y]){const b=mi(g[y]);return u[b]}else return d}function s(g,y,d){return y in g?g[y]:d}function a(g,y,d,b){const p=g[y]&&g[y].isTexture?g[y]:null;if(p){p.matrixAutoUpdate&&p.updateMatrix();const v=p.matrix.elements;let x=0;d[b+x++]=v[0],d[b+x++]=v[3],d[b+x++]=v[6],x++,d[b+x++]=v[1],d[b+x++]=v[4],d[b+x++]=v[7],x++}return 8}let r=0;const c=e.length*Si,l=Math.ceil(Math.sqrt(c))||1,{image:h,features:f}=this,u={};for(let g=0,y=t.length;g<y;g++)u[mi(t[g])]=g;h.width!==l&&(this.dispose(),h.data=new Float32Array(l*l*4),h.width=l,h.height=l);const o=h.data;f.reset();for(let g=0,y=e.length;g<y;g++){const d=e[g];if(d.isFogVolumeMaterial){f.setUsed("FOG");for(let v=0;v<sr;v++)o[r+v]=0;o[r+0+0]=d.color.r,o[r+0+1]=d.color.g,o[r+0+2]=d.color.b,o[r+8+3]=s(d,"emissiveIntensity",0),o[r+12+0]=d.emissive.r,o[r+12+1]=d.emissive.g,o[r+12+2]=d.emissive.b,o[r+52+1]=d.density,o[r+52+3]=0,o[r+56+2]=4,r+=sr;continue}o[r++]=d.color.r,o[r++]=d.color.g,o[r++]=d.color.b,o[r++]=i(d,"map"),o[r++]=s(d,"metalness",0),o[r++]=i(d,"metalnessMap"),o[r++]=s(d,"roughness",0),o[r++]=i(d,"roughnessMap"),o[r++]=s(d,"ior",1.5),o[r++]=s(d,"transmission",0),o[r++]=i(d,"transmissionMap"),o[r++]=s(d,"emissiveIntensity",0),"emissive"in d?(o[r++]=d.emissive.r,o[r++]=d.emissive.g,o[r++]=d.emissive.b):(o[r++]=0,o[r++]=0,o[r++]=0),o[r++]=i(d,"emissiveMap"),o[r++]=i(d,"normalMap"),"normalScale"in d?(o[r++]=d.normalScale.x,o[r++]=d.normalScale.y):(o[r++]=1,o[r++]=1),o[r++]=s(d,"clearcoat",0),o[r++]=i(d,"clearcoatMap"),o[r++]=s(d,"clearcoatRoughness",0),o[r++]=i(d,"clearcoatRoughnessMap"),o[r++]=i(d,"clearcoatNormalMap"),"clearcoatNormalScale"in d?(o[r++]=d.clearcoatNormalScale.x,o[r++]=d.clearcoatNormalScale.y):(o[r++]=1,o[r++]=1),r++,o[r++]=s(d,"sheen",0),"sheenColor"in d?(o[r++]=d.sheenColor.r,o[r++]=d.sheenColor.g,o[r++]=d.sheenColor.b):(o[r++]=0,o[r++]=0,o[r++]=0),o[r++]=i(d,"sheenColorMap"),o[r++]=s(d,"sheenRoughness",0),o[r++]=i(d,"sheenRoughnessMap"),o[r++]=i(d,"iridescenceMap"),o[r++]=i(d,"iridescenceThicknessMap"),o[r++]=s(d,"iridescence",0),o[r++]=s(d,"iridescenceIOR",1.3);const b=s(d,"iridescenceThicknessRange",[100,400]);o[r++]=b[0],o[r++]=b[1],"specularColor"in d?(o[r++]=d.specularColor.r,o[r++]=d.specularColor.g,o[r++]=d.specularColor.b):(o[r++]=1,o[r++]=1,o[r++]=1),o[r++]=i(d,"specularColorMap"),o[r++]=s(d,"specularIntensity",1),o[r++]=i(d,"specularIntensityMap");const p=s(d,"thickness",0)===0&&s(d,"attenuationDistance",1/0)===1/0;if(o[r++]=Number(p),r++,"attenuationColor"in d?(o[r++]=d.attenuationColor.r,o[r++]=d.attenuationColor.g,o[r++]=d.attenuationColor.b):(o[r++]=1,o[r++]=1,o[r++]=1),o[r++]=s(d,"attenuationDistance",1/0),o[r++]=i(d,"alphaMap"),o[r++]=d.opacity,o[r++]=d.alphaTest,!p&&d.transmission>0)o[r++]=0;else switch(d.side){case Jt:o[r++]=1;break;case dr:o[r++]=-1;break;case pi:o[r++]=0;break}o[r++]=Number(s(d,"matte",!1)),o[r++]=Number(s(d,"castShadow",!0)),o[r++]=Number(d.vertexColors)|Number(d.flatShading)<<1,o[r++]=Number(d.transparent),r+=a(d,"map",o,r),r+=a(d,"metalnessMap",o,r),r+=a(d,"roughnessMap",o,r),r+=a(d,"transmissionMap",o,r),r+=a(d,"emissiveMap",o,r),r+=a(d,"normalMap",o,r),r+=a(d,"clearcoatMap",o,r),r+=a(d,"clearcoatNormalMap",o,r),r+=a(d,"clearcoatRoughnessMap",o,r),r+=a(d,"sheenColorMap",o,r),r+=a(d,"sheenRoughnessMap",o,r),r+=a(d,"iridescenceMap",o,r),r+=a(d,"iridescenceThicknessMap",o,r),r+=a(d,"specularColorMap",o,r),r+=a(d,"specularIntensityMap",o,r),r+=a(d,"alphaMap",o,r)}const m=bi(o.buffer);return this.hash!==m?(this.hash=m,this.needsUpdate=!0,!0):!1}}const nr=new yr;function ma(n){return n?`${n.uuid}:${n.version}`:null}function pa(n,e){for(const t in e)t in n&&(n[t]=e[t])}class ar extends es{constructor(e,t,i){const s={format:G,type:ei,minFilter:fe,magFilter:fe,wrapS:Re,wrapT:Re,generateMipmaps:!1,...i};super(e,t,1,s),pa(this.texture,s),this.texture.setTextures=(...r)=>{this.setTextures(...r)},this.hashes=[null];const a=new Ce(new ga);this.fsQuad=a}setTextures(e,t,i=this.width,s=this.height){const a=e.getRenderTarget(),r=e.toneMapping,c=e.getClearAlpha();e.getClearColor(nr);const l=t.length||1;(i!==this.width||s!==this.height||this.depth!==l)&&(this.setSize(i,s,l),this.hashes=new Array(l).fill(null)),e.setClearColor(0,0),e.toneMapping=ts;const h=this.fsQuad,f=this.hashes;let u=!1;for(let o=0,m=l;o<m;o++){const g=t[o],y=ma(g);g&&(f[o]!==y||g.isWebGLRenderTarget)&&(g.matrixAutoUpdate=!1,g.matrix.identity(),h.material.map=g,e.setRenderTarget(this,o),h.render(e),g.updateMatrix(),g.matrixAutoUpdate=!0,f[o]=y,u=!0)}return h.material.map=null,e.setClearColor(nr,c),e.setRenderTarget(a),e.toneMapping=r,u}dispose(){super.dispose(),this.fsQuad.dispose()}}class ga extends nt{get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({uniforms:{map:{value:null}},vertexShader:`
				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,fragmentShader:`
				uniform sampler2D map;
				varying vec2 vUv;
				void main() {

					gl_FragColor = texture2D( map, vUv );

				}
			`})}}function va(n,e=Math.random()){for(let t=n.length-1;t>0;t--){const i=Math.floor(e()*(t+1)),s=n[t];n[t]=n[i],n[i]=s}return n}class xa{constructor(e,t,i=Math.random){const s=e**t,a=new Uint16Array(s);let r=s;for(let c=0;c<s;c++)a[c]=c;this.samples=new Float32Array(t),this.strataCount=e,this.reset=function(){for(let c=0;c<s;c++)a[c]=c;r=0},this.reshuffle=function(){r=0},this.next=function(){const{samples:c}=this;r>=a.length&&(va(a,i),this.reshuffle());let l=a[r++];for(let h=0;h<t;h++)c[h]=(l%e+i())/e,l=Math.floor(l/e);return c}}}class ya{constructor(e,t,i=Math.random){let s=0;for(const l of t)s+=l;const a=new Float32Array(s),r=[];let c=0;for(const l of t){const h=new xa(e,l,i);h.samples=new Float32Array(a.buffer,c,h.samples.length),c+=h.samples.length*4,r.push(h)}this.samples=a,this.strataCount=e,this.next=function(){for(const l of r)l.next();return a},this.reshuffle=function(){for(const l of r)l.reshuffle()},this.reset=function(){for(const l of r)l.reset()}}}class ba{constructor(e=0){this.m=2147483648,this.a=1103515245,this.c=12345,this.seed=e}nextInt(){return this.seed=(this.a*this.seed+this.c)%this.m,this.seed}nextFloat(){return this.nextInt()/(this.m-1)}}class Ta extends re{constructor(e=1,t=1,i=8){super(new Float32Array(1),1,1,G,j),this.minFilter=k,this.magFilter=k,this.strata=i,this.sampler=null,this.generator=new ba,this.stableNoise=!1,this.random=()=>this.stableNoise?this.generator.nextFloat():Math.random(),this.init(e,t,i)}init(e=this.image.height,t=this.image.width,i=this.strata){const{image:s}=this;if(s.width===t&&s.height===e&&this.sampler!==null)return;const a=new Array(e*t).fill(4),r=new ya(i,a,this.random);s.width=t,s.height=e,s.data=r.samples,this.sampler=r,this.dispose(),this.next()}next(){this.sampler.next(),this.needsUpdate=!0}reset(){this.sampler.reset(),this.generator.seed=0}}function wa(n,e=Math.random){for(let t=n.length-1;t>0;t--){const i=~~((e()-1e-6)*t),s=n[t];n[t]=n[i],n[i]=s}}function Sa(n,e){n.fill(0);for(let t=0;t<e;t++)n[t]=1}class or{constructor(e){this.count=0,this.size=-1,this.sigma=-1,this.radius=-1,this.lookupTable=null,this.score=null,this.binaryPattern=null,this.resize(e),this.setSigma(1.5)}findVoid(){const{score:e,binaryPattern:t}=this;let i=1/0,s=-1;for(let a=0,r=t.length;a<r;a++){if(t[a]!==0)continue;const c=e[a];c<i&&(i=c,s=a)}return s}findCluster(){const{score:e,binaryPattern:t}=this;let i=-1/0,s=-1;for(let a=0,r=t.length;a<r;a++){if(t[a]!==1)continue;const c=e[a];c>i&&(i=c,s=a)}return s}setSigma(e){if(e===this.sigma)return;const t=~~(Math.sqrt(20*e**2)+1),i=2*t+1,s=new Float32Array(i*i),a=e*e;for(let r=-t;r<=t;r++)for(let c=-t;c<=t;c++){const l=(t+c)*i+r+t,h=r*r+c*c;s[l]=Math.E**(-h/(2*a))}this.lookupTable=s,this.sigma=e,this.radius=t}resize(e){this.size!==e&&(this.size=e,this.score=new Float32Array(e*e),this.binaryPattern=new Uint8Array(e*e))}invert(){const{binaryPattern:e,score:t,size:i}=this;t.fill(0);for(let s=0,a=e.length;s<a;s++)if(e[s]===0){const r=~~(s/i),c=s-r*i;this.updateScore(c,r,1),e[s]=1}else e[s]=0}updateScore(e,t,i){const{size:s,score:a,lookupTable:r}=this,c=this.radius,l=2*c+1;for(let h=-c;h<=c;h++)for(let f=-c;f<=c;f++){const u=(c+f)*l+h+c,o=r[u];let m=e+h;m=m<0?s+m:m%s;let g=t+f;g=g<0?s+g:g%s;const y=g*s+m;a[y]+=i*o}}addPointIndex(e){this.binaryPattern[e]=1;const t=this.size,i=~~(e/t),s=e-i*t;this.updateScore(s,i,1),this.count++}removePointIndex(e){this.binaryPattern[e]=0;const t=this.size,i=~~(e/t),s=e-i*t;this.updateScore(s,i,-1),this.count--}copy(e){this.resize(e.size),this.score.set(e.score),this.binaryPattern.set(e.binaryPattern),this.setSigma(e.sigma),this.count=e.count}}class _a{constructor(){this.random=Math.random,this.sigma=1.5,this.size=64,this.majorityPointsRatio=.1,this.samples=new or(1),this.savedSamples=new or(1)}generate(){const{samples:e,savedSamples:t,sigma:i,majorityPointsRatio:s,size:a}=this;e.resize(a),e.setSigma(i);const r=Math.floor(a*a*s),c=e.binaryPattern;Sa(c,r),wa(c,this.random);for(let u=0,o=c.length;u<o;u++)c[u]===1&&e.addPointIndex(u);for(;;){const u=e.findCluster();e.removePointIndex(u);const o=e.findVoid();if(u===o){e.addPointIndex(u);break}e.addPointIndex(o)}const l=new Uint32Array(a*a);t.copy(e);let h;for(h=e.count-1;h>=0;){const u=e.findCluster();e.removePointIndex(u),l[u]=h,h--}const f=a*a;for(h=t.count;h<f/2;){const u=t.findVoid();t.addPointIndex(u),l[u]=h,h++}for(t.invert();h<f;){const u=t.findCluster();t.removePointIndex(u),l[u]=h,h++}return{data:l,maxValue:f}}}function Aa(n){return n>=3?4:n}function Ma(n){switch(n){case 1:return It;case 2:return gr;default:return G}}class Ia extends re{constructor(e=64,t=1){super(new Float32Array(4),1,1,G,j),this.minFilter=k,this.magFilter=k,this.size=e,this.channels=t,this.update()}update(){const e=this.channels,t=this.size,i=new _a;i.channels=e,i.size=t;const s=Aa(e),a=Ma(s);(this.image.width!==t||a!==this.format)&&(this.image.width=t,this.image.height=t,this.image.data=new Float32Array(t**2*s),this.format=a,this.dispose());const r=this.image.data;for(let c=0,l=e;c<l;c++){const h=i.generate(),f=h.data,u=h.maxValue;for(let o=0,m=f.length;o<m;o++){const g=f[o]/u;r[o*s+c]=g}}this.needsUpdate=!0}}const Ra=`

	struct PhysicalCamera {

		float focusDistance;
		float anamorphicRatio;
		float bokehSize;
		int apertureBlades;
		float apertureRotation;

	};

`,Pa=`

	struct EquirectHdrInfo {

		sampler2D marginalWeights;
		sampler2D conditionalWeights;
		sampler2D map;

		float totalSum;

	};

`,Ca=`

	#define RECT_AREA_LIGHT_TYPE 0
	#define CIRC_AREA_LIGHT_TYPE 1
	#define SPOT_LIGHT_TYPE 2
	#define DIR_LIGHT_TYPE 3
	#define POINT_LIGHT_TYPE 4

	struct LightsInfo {

		sampler2D tex;
		uint count;

	};

	struct Light {

		vec3 position;
		int type;

		vec3 color;
		float intensity;

		vec3 u;
		vec3 v;
		float area;

		// spot light fields
		float radius;
		float near;
		float decay;
		float distance;
		float coneCos;
		float penumbraCos;
		int iesProfile;

	};

	Light readLightInfo( sampler2D tex, uint index ) {

		uint i = index * 6u;

		vec4 s0 = texelFetch1D( tex, i + 0u );
		vec4 s1 = texelFetch1D( tex, i + 1u );
		vec4 s2 = texelFetch1D( tex, i + 2u );
		vec4 s3 = texelFetch1D( tex, i + 3u );

		Light l;
		l.position = s0.rgb;
		l.type = int( round( s0.a ) );

		l.color = s1.rgb;
		l.intensity = s1.a;

		l.u = s2.rgb;
		l.v = s3.rgb;
		l.area = s3.a;

		if ( l.type == SPOT_LIGHT_TYPE || l.type == POINT_LIGHT_TYPE ) {

			vec4 s4 = texelFetch1D( tex, i + 4u );
			vec4 s5 = texelFetch1D( tex, i + 5u );
			l.radius = s4.r;
			l.decay = s4.g;
			l.distance = s4.b;
			l.coneCos = s4.a;

			l.penumbraCos = s5.r;
			l.iesProfile = int( round( s5.g ) );

		} else {

			l.radius = 0.0;
			l.decay = 0.0;
			l.distance = 0.0;

			l.coneCos = 0.0;
			l.penumbraCos = 0.0;
			l.iesProfile = - 1;

		}

		return l;

	}

`,Fa=`

	struct Material {

		vec3 color;
		int map;

		float metalness;
		int metalnessMap;

		float roughness;
		int roughnessMap;

		float ior;
		float transmission;
		int transmissionMap;

		float emissiveIntensity;
		vec3 emissive;
		int emissiveMap;

		int normalMap;
		vec2 normalScale;

		float clearcoat;
		int clearcoatMap;
		int clearcoatNormalMap;
		vec2 clearcoatNormalScale;
		float clearcoatRoughness;
		int clearcoatRoughnessMap;

		int iridescenceMap;
		int iridescenceThicknessMap;
		float iridescence;
		float iridescenceIor;
		float iridescenceThicknessMinimum;
		float iridescenceThicknessMaximum;

		vec3 specularColor;
		int specularColorMap;

		float specularIntensity;
		int specularIntensityMap;
		bool thinFilm;

		vec3 attenuationColor;
		float attenuationDistance;

		int alphaMap;

		bool castShadow;
		float opacity;
		float alphaTest;

		float side;
		bool matte;

		float sheen;
		vec3 sheenColor;
		int sheenColorMap;
		float sheenRoughness;
		int sheenRoughnessMap;

		bool vertexColors;
		bool flatShading;
		bool transparent;
		bool fogVolume;

		mat3 mapTransform;
		mat3 metalnessMapTransform;
		mat3 roughnessMapTransform;
		mat3 transmissionMapTransform;
		mat3 emissiveMapTransform;
		mat3 normalMapTransform;
		mat3 clearcoatMapTransform;
		mat3 clearcoatNormalMapTransform;
		mat3 clearcoatRoughnessMapTransform;
		mat3 sheenColorMapTransform;
		mat3 sheenRoughnessMapTransform;
		mat3 iridescenceMapTransform;
		mat3 iridescenceThicknessMapTransform;
		mat3 specularColorMapTransform;
		mat3 specularIntensityMapTransform;
		mat3 alphaMapTransform;

	};

	mat3 readTextureTransform( sampler2D tex, uint index ) {

		mat3 textureTransform;

		vec4 row1 = texelFetch1D( tex, index );
		vec4 row2 = texelFetch1D( tex, index + 1u );

		textureTransform[0] = vec3(row1.r, row2.r, 0.0);
		textureTransform[1] = vec3(row1.g, row2.g, 0.0);
		textureTransform[2] = vec3(row1.b, row2.b, 1.0);

		return textureTransform;

	}

	Material readMaterialInfo( sampler2D tex, uint index ) {

		uint i = index * uint( MATERIAL_PIXELS );

		vec4 s0 = texelFetch1D( tex, i + 0u );
		vec4 s1 = texelFetch1D( tex, i + 1u );
		vec4 s2 = texelFetch1D( tex, i + 2u );
		vec4 s3 = texelFetch1D( tex, i + 3u );
		vec4 s4 = texelFetch1D( tex, i + 4u );
		vec4 s5 = texelFetch1D( tex, i + 5u );
		vec4 s6 = texelFetch1D( tex, i + 6u );
		vec4 s7 = texelFetch1D( tex, i + 7u );
		vec4 s8 = texelFetch1D( tex, i + 8u );
		vec4 s9 = texelFetch1D( tex, i + 9u );
		vec4 s10 = texelFetch1D( tex, i + 10u );
		vec4 s11 = texelFetch1D( tex, i + 11u );
		vec4 s12 = texelFetch1D( tex, i + 12u );
		vec4 s13 = texelFetch1D( tex, i + 13u );
		vec4 s14 = texelFetch1D( tex, i + 14u );

		Material m;
		m.color = s0.rgb;
		m.map = int( round( s0.a ) );

		m.metalness = s1.r;
		m.metalnessMap = int( round( s1.g ) );
		m.roughness = s1.b;
		m.roughnessMap = int( round( s1.a ) );

		m.ior = s2.r;
		m.transmission = s2.g;
		m.transmissionMap = int( round( s2.b ) );
		m.emissiveIntensity = s2.a;

		m.emissive = s3.rgb;
		m.emissiveMap = int( round( s3.a ) );

		m.normalMap = int( round( s4.r ) );
		m.normalScale = s4.gb;

		m.clearcoat = s4.a;
		m.clearcoatMap = int( round( s5.r ) );
		m.clearcoatRoughness = s5.g;
		m.clearcoatRoughnessMap = int( round( s5.b ) );
		m.clearcoatNormalMap = int( round( s5.a ) );
		m.clearcoatNormalScale = s6.rg;

		m.sheen = s6.a;
		m.sheenColor = s7.rgb;
		m.sheenColorMap = int( round( s7.a ) );
		m.sheenRoughness = s8.r;
		m.sheenRoughnessMap = int( round( s8.g ) );

		m.iridescenceMap = int( round( s8.b ) );
		m.iridescenceThicknessMap = int( round( s8.a ) );
		m.iridescence = s9.r;
		m.iridescenceIor = s9.g;
		m.iridescenceThicknessMinimum = s9.b;
		m.iridescenceThicknessMaximum = s9.a;

		m.specularColor = s10.rgb;
		m.specularColorMap = int( round( s10.a ) );

		m.specularIntensity = s11.r;
		m.specularIntensityMap = int( round( s11.g ) );
		m.thinFilm = bool( s11.b );

		m.attenuationColor = s12.rgb;
		m.attenuationDistance = s12.a;

		m.alphaMap = int( round( s13.r ) );

		m.opacity = s13.g;
		m.alphaTest = s13.b;
		m.side = s13.a;

		m.matte = bool( s14.r );
		m.castShadow = bool( s14.g );
		m.vertexColors = bool( int( s14.b ) & 1 );
		m.flatShading = bool( int( s14.b ) & 2 );
		m.fogVolume = bool( int( s14.b ) & 4 );
		m.transparent = bool( s14.a );

		uint firstTextureTransformIdx = i + 15u;

		// mat3( 1.0 ) is an identity matrix
		m.mapTransform = m.map == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx );
		m.metalnessMapTransform = m.metalnessMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 2u );
		m.roughnessMapTransform = m.roughnessMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 4u );
		m.transmissionMapTransform = m.transmissionMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 6u );
		m.emissiveMapTransform = m.emissiveMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 8u );
		m.normalMapTransform = m.normalMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 10u );
		m.clearcoatMapTransform = m.clearcoatMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 12u );
		m.clearcoatNormalMapTransform = m.clearcoatNormalMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 14u );
		m.clearcoatRoughnessMapTransform = m.clearcoatRoughnessMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 16u );
		m.sheenColorMapTransform = m.sheenColorMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 18u );
		m.sheenRoughnessMapTransform = m.sheenRoughnessMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 20u );
		m.iridescenceMapTransform = m.iridescenceMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 22u );
		m.iridescenceThicknessMapTransform = m.iridescenceThicknessMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 24u );
		m.specularColorMapTransform = m.specularColorMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 26u );
		m.specularIntensityMapTransform = m.specularIntensityMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 28u );
		m.alphaMapTransform = m.alphaMap == - 1 ? mat3( 1.0 ) : readTextureTransform( tex, firstTextureTransformIdx + 30u );

		return m;

	}

`,Da=`

	struct SurfaceRecord {

		// surface type
		bool volumeParticle;

		// geometry
		vec3 faceNormal;
		bool frontFace;
		vec3 normal;
		mat3 normalBasis;
		mat3 normalInvBasis;

		// cached properties
		float eta;
		float f0;

		// material
		float roughness;
		float filteredRoughness;
		float metalness;
		vec3 color;
		vec3 emission;

		// transmission
		float ior;
		float transmission;
		bool thinFilm;
		vec3 attenuationColor;
		float attenuationDistance;

		// clearcoat
		vec3 clearcoatNormal;
		mat3 clearcoatBasis;
		mat3 clearcoatInvBasis;
		float clearcoat;
		float clearcoatRoughness;
		float filteredClearcoatRoughness;

		// sheen
		float sheen;
		vec3 sheenColor;
		float sheenRoughness;

		// iridescence
		float iridescence;
		float iridescenceIor;
		float iridescenceThickness;

		// specular
		vec3 specularColor;
		float specularIntensity;
	};

	struct ScatterRecord {
		float specularPdf;
		float pdf;
		vec3 direction;
		vec3 color;
	};

`,Ba=`

	// samples the the given environment map in the given direction
	vec3 sampleEquirectColor( sampler2D envMap, vec3 direction ) {

		return texture2D( envMap, equirectDirectionToUv( direction ) ).rgb;

	}

	// gets the pdf of the given direction to sample
	float equirectDirectionPdf( vec3 direction ) {

		vec2 uv = equirectDirectionToUv( direction );
		float theta = uv.y * PI;
		float sinTheta = sin( theta );
		if ( sinTheta == 0.0 ) {

			return 0.0;

		}

		return 1.0 / ( 2.0 * PI * PI * sinTheta );

	}

	// samples the color given env map with CDF and returns the pdf of the direction
	float sampleEquirect( vec3 direction, inout vec3 color ) {

		float totalSum = envMapInfo.totalSum;
		if ( totalSum == 0.0 ) {

			color = vec3( 0.0 );
			return 1.0;

		}

		vec2 uv = equirectDirectionToUv( direction );
		color = texture2D( envMapInfo.map, uv ).rgb;

		float lum = luminance( color );
		ivec2 resolution = textureSize( envMapInfo.map, 0 );
		float pdf = lum / totalSum;

		return float( resolution.x * resolution.y ) * pdf * equirectDirectionPdf( direction );

	}

	// samples a direction of the envmap with color and retrieves pdf
	float sampleEquirectProbability( vec2 r, inout vec3 color, inout vec3 direction ) {

		// sample env map cdf
		float v = texture2D( envMapInfo.marginalWeights, vec2( r.x, 0.0 ) ).x;
		float u = texture2D( envMapInfo.conditionalWeights, vec2( r.y, v ) ).x;
		vec2 uv = vec2( u, v );

		vec3 derivedDirection = equirectUvToDirection( uv );
		direction = derivedDirection;
		color = texture2D( envMapInfo.map, uv ).rgb;

		float totalSum = envMapInfo.totalSum;
		float lum = luminance( color );
		ivec2 resolution = textureSize( envMapInfo.map, 0 );
		float pdf = lum / totalSum;

		return float( resolution.x * resolution.y ) * pdf * equirectDirectionPdf( direction );

	}
`,Ea=`

	float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {

		return smoothstep( coneCosine, penumbraCosine, angleCosine );

	}

	float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {

		// based upon Frostbite 3 Moving to Physically-based Rendering
		// page 32, equation 26: E[window1]
		// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), EPSILON );

		if ( cutoffDistance > 0.0 ) {

			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );

		}

		return distanceFalloff;

	}

	float getPhotometricAttenuation( sampler2DArray iesProfiles, int iesProfile, vec3 posToLight, vec3 lightDir, vec3 u, vec3 v ) {

		float cosTheta = dot( posToLight, lightDir );
		float angle = acos( cosTheta ) / PI;

		return texture2D( iesProfiles, vec3( angle, 0.0, iesProfile ) ).r;

	}

	struct LightRecord {

		float dist;
		vec3 direction;
		float pdf;
		vec3 emission;
		int type;

	};

	bool intersectLightAtIndex( sampler2D lights, vec3 rayOrigin, vec3 rayDirection, uint l, inout LightRecord lightRec ) {

		bool didHit = false;
		Light light = readLightInfo( lights, l );

		vec3 u = light.u;
		vec3 v = light.v;

		// check for backface
		vec3 normal = normalize( cross( u, v ) );
		if ( dot( normal, rayDirection ) > 0.0 ) {

			u *= 1.0 / dot( u, u );
			v *= 1.0 / dot( v, v );

			float dist;

			// MIS / light intersection is not supported for punctual lights.
			if(
				( light.type == RECT_AREA_LIGHT_TYPE && intersectsRectangle( light.position, normal, u, v, rayOrigin, rayDirection, dist ) ) ||
				( light.type == CIRC_AREA_LIGHT_TYPE && intersectsCircle( light.position, normal, u, v, rayOrigin, rayDirection, dist ) )
			) {

				float cosTheta = dot( rayDirection, normal );
				didHit = true;
				lightRec.dist = dist;
				lightRec.pdf = ( dist * dist ) / ( light.area * cosTheta );
				lightRec.emission = light.color * light.intensity;
				lightRec.direction = rayDirection;
				lightRec.type = light.type;

			}

		}

		return didHit;

	}

	LightRecord randomAreaLightSample( Light light, vec3 rayOrigin, vec2 ruv ) {

		vec3 randomPos;
		if( light.type == RECT_AREA_LIGHT_TYPE ) {

			// rectangular area light
			randomPos = light.position + light.u * ( ruv.x - 0.5 ) + light.v * ( ruv.y - 0.5 );

		} else if( light.type == CIRC_AREA_LIGHT_TYPE ) {

			// circular area light
			float r = 0.5 * sqrt( ruv.x );
			float theta = ruv.y * 2.0 * PI;
			float x = r * cos( theta );
			float y = r * sin( theta );

			randomPos = light.position + light.u * x + light.v * y;

		}

		vec3 toLight = randomPos - rayOrigin;
		float lightDistSq = dot( toLight, toLight );
		float dist = sqrt( lightDistSq );
		vec3 direction = toLight / dist;
		vec3 lightNormal = normalize( cross( light.u, light.v ) );

		LightRecord lightRec;
		lightRec.type = light.type;
		lightRec.emission = light.color * light.intensity;
		lightRec.dist = dist;
		lightRec.direction = direction;

		// TODO: the denominator is potentially zero
		lightRec.pdf = lightDistSq / ( light.area * dot( direction, lightNormal ) );

		return lightRec;

	}

	LightRecord randomSpotLightSample( Light light, sampler2DArray iesProfiles, vec3 rayOrigin, vec2 ruv ) {

		float radius = light.radius * sqrt( ruv.x );
		float theta = ruv.y * 2.0 * PI;
		float x = radius * cos( theta );
		float y = radius * sin( theta );

		vec3 u = light.u;
		vec3 v = light.v;
		vec3 normal = normalize( cross( u, v ) );

		float angle = acos( light.coneCos );
		float angleTan = tan( angle );
		float startDistance = light.radius / max( angleTan, EPSILON );

		vec3 randomPos = light.position - normal * startDistance + u * x + v * y;
		vec3 toLight = randomPos - rayOrigin;
		float lightDistSq = dot( toLight, toLight );
		float dist = sqrt( lightDistSq );

		vec3 direction = toLight / max( dist, EPSILON );
		float cosTheta = dot( direction, normal );

		float spotAttenuation = light.iesProfile != - 1 ?
			getPhotometricAttenuation( iesProfiles, light.iesProfile, direction, normal, u, v ) :
			getSpotAttenuation( light.coneCos, light.penumbraCos, cosTheta );

		float distanceAttenuation = getDistanceAttenuation( dist, light.distance, light.decay );
		LightRecord lightRec;
		lightRec.type = light.type;
		lightRec.dist = dist;
		lightRec.direction = direction;
		lightRec.emission = light.color * light.intensity * distanceAttenuation * spotAttenuation;
		lightRec.pdf = 1.0;

		return lightRec;

	}

	LightRecord randomLightSample( sampler2D lights, sampler2DArray iesProfiles, uint lightCount, vec3 rayOrigin, vec3 ruv ) {

		LightRecord result;

		// pick a random light
		uint l = uint( ruv.x * float( lightCount ) );
		Light light = readLightInfo( lights, l );

		if ( light.type == SPOT_LIGHT_TYPE ) {

			result = randomSpotLightSample( light, iesProfiles, rayOrigin, ruv.yz );

		} else if ( light.type == POINT_LIGHT_TYPE ) {

			vec3 lightRay = light.u - rayOrigin;
			float lightDist = length( lightRay );
			float cutoffDistance = light.distance;
			float distanceFalloff = 1.0 / max( pow( lightDist, light.decay ), 0.01 );
			if ( cutoffDistance > 0.0 ) {

				distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDist / cutoffDistance ) ) );

			}

			LightRecord rec;
			rec.direction = normalize( lightRay );
			rec.dist = length( lightRay );
			rec.pdf = 1.0;
			rec.emission = light.color * light.intensity * distanceFalloff;
			rec.type = light.type;
			result = rec;

		} else if ( light.type == DIR_LIGHT_TYPE ) {

			LightRecord rec;
			rec.dist = 1e10;
			rec.direction = light.u;
			rec.pdf = 1.0;
			rec.emission = light.color * light.intensity;
			rec.type = light.type;

			result = rec;

		} else {

			// sample the light
			result = randomAreaLightSample( light, rayOrigin, ruv.yz );

		}

		return result;

	}

`,za=`

	vec3 sampleHemisphere( vec3 n, vec2 uv ) {

		// https://www.rorydriscoll.com/2009/01/07/better-sampling/
		// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
		float sign = n.z == 0.0 ? 1.0 : sign( n.z );
		float a = - 1.0 / ( sign + n.z );
		float b = n.x * n.y * a;
		vec3 b1 = vec3( 1.0 + sign * n.x * n.x * a, sign * b, - sign * n.x );
		vec3 b2 = vec3( b, sign + n.y * n.y * a, - n.y );

		float r = sqrt( uv.x );
		float theta = 2.0 * PI * uv.y;
		float x = r * cos( theta );
		float y = r * sin( theta );
		return x * b1 + y * b2 + sqrt( 1.0 - uv.x ) * n;

	}

	vec2 sampleTriangle( vec2 a, vec2 b, vec2 c, vec2 r ) {

		// get the edges of the triangle and the diagonal across the
		// center of the parallelogram
		vec2 e1 = a - b;
		vec2 e2 = c - b;
		vec2 diag = normalize( e1 + e2 );

		// pick the point in the parallelogram
		if ( r.x + r.y > 1.0 ) {

			r = vec2( 1.0 ) - r;

		}

		return e1 * r.x + e2 * r.y;

	}

	vec2 sampleCircle( vec2 uv ) {

		float angle = 2.0 * PI * uv.x;
		float radius = sqrt( uv.y );
		return vec2( cos( angle ), sin( angle ) ) * radius;

	}

	vec3 sampleSphere( vec2 uv ) {

		float u = ( uv.x - 0.5 ) * 2.0;
		float t = uv.y * PI * 2.0;
		float f = sqrt( 1.0 - u * u );

		return vec3( f * cos( t ), f * sin( t ), u );

	}

	vec2 sampleRegularPolygon( int sides, vec3 uvw ) {

		sides = max( sides, 3 );

		vec3 r = uvw;
		float anglePerSegment = 2.0 * PI / float( sides );
		float segment = floor( float( sides ) * r.x );

		float angle1 = anglePerSegment * segment;
		float angle2 = angle1 + anglePerSegment;
		vec2 a = vec2( sin( angle1 ), cos( angle1 ) );
		vec2 b = vec2( 0.0, 0.0 );
		vec2 c = vec2( sin( angle2 ), cos( angle2 ) );

		return sampleTriangle( a, b, c, r.yz );

	}

	// samples an aperture shape with the given number of sides. 0 means circle
	vec2 sampleAperture( int blades, vec3 uvw ) {

		return blades == 0 ?
			sampleCircle( uvw.xy ) :
			sampleRegularPolygon( blades, uvw );

	}


`,ka=`

	bool totalInternalReflection( float cosTheta, float eta ) {

		float sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > 1.0;

	}

	// https://google.github.io/filament/Filament.md.html#materialsystem/diffusebrdf
	float schlickFresnel( float cosine, float f0 ) {

		return f0 + ( 1.0 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

	vec3 schlickFresnel( float cosine, vec3 f0 ) {

		return f0 + ( 1.0 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

	vec3 schlickFresnel( float cosine, vec3 f0, vec3 f90 ) {

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

	float dielectricFresnel( float cosThetaI, float eta ) {

		// https://schuttejoe.github.io/post/disneybsdf/
		float ni = eta;
		float nt = 1.0;

		// Check for total internal reflection
		float sinThetaISq = 1.0f - cosThetaI * cosThetaI;
		float sinThetaTSq = eta * eta * sinThetaISq;
		if( sinThetaTSq >= 1.0 ) {

			return 1.0;

		}

		float sinThetaT = sqrt( sinThetaTSq );

		float cosThetaT = sqrt( max( 0.0, 1.0f - sinThetaT * sinThetaT ) );
		float rParallel = ( ( nt * cosThetaI ) - ( ni * cosThetaT ) ) / ( ( nt * cosThetaI ) + ( ni * cosThetaT ) );
		float rPerpendicular = ( ( ni * cosThetaI ) - ( nt * cosThetaT ) ) / ( ( ni * cosThetaI ) + ( nt * cosThetaT ) );
		return ( rParallel * rParallel + rPerpendicular * rPerpendicular ) / 2.0;

	}

	// https://raytracing.github.io/books/RayTracingInOneWeekend.html#dielectrics/schlickapproximation
	float iorRatioToF0( float eta ) {

		return pow( ( 1.0 - eta ) / ( 1.0 + eta ), 2.0 );

	}

	vec3 evaluateFresnel( float cosTheta, float eta, vec3 f0, vec3 f90 ) {

		if ( totalInternalReflection( cosTheta, eta ) ) {

			return f90;

		}

		return schlickFresnel( cosTheta, f0, f90 );

	}

	// TODO: disney fresnel was removed and replaced with this fresnel function to better align with
	// the glTF but is causing blown out pixels. Should be revisited
	// float evaluateFresnelWeight( float cosTheta, float eta, float f0 ) {

	// 	if ( totalInternalReflection( cosTheta, eta ) ) {

	// 		return 1.0;

	// 	}

	// 	return schlickFresnel( cosTheta, f0 );

	// }

	// https://schuttejoe.github.io/post/disneybsdf/
	float disneyFresnel( vec3 wo, vec3 wi, vec3 wh, float f0, float eta, float metalness ) {

		float dotHV = dot( wo, wh );
		if ( totalInternalReflection( dotHV, eta ) ) {

			return 1.0;

		}

		float dotHL = dot( wi, wh );
		float dielectricFresnel = dielectricFresnel( abs( dotHV ), eta );
		float metallicFresnel = schlickFresnel( dotHL, f0 );

		return mix( dielectricFresnel, metallicFresnel, metalness );

	}

`,Na=`

	// Fast arccos approximation used to remove banding artifacts caused by numerical errors in acos.
	// This is a cubic Lagrange interpolating polynomial for x = [-1, -1/2, 0, 1/2, 1].
	// For more information see: https://github.com/gkjohnson/three-gpu-pathtracer/pull/171#issuecomment-1152275248
	float acosApprox( float x ) {

		x = clamp( x, -1.0, 1.0 );
		return ( - 0.69813170079773212 * x * x - 0.87266462599716477 ) * x + 1.5707963267948966;

	}

	// An acos with input values bound to the range [-1, 1].
	float acosSafe( float x ) {

		return acos( clamp( x, -1.0, 1.0 ) );

	}

	float saturateCos( float val ) {

		return clamp( val, 0.001, 1.0 );

	}

	float square( float t ) {

		return t * t;

	}

	vec2 square( vec2 t ) {

		return t * t;

	}

	vec3 square( vec3 t ) {

		return t * t;

	}

	vec4 square( vec4 t ) {

		return t * t;

	}

	vec2 rotateVector( vec2 v, float t ) {

		float ac = cos( t );
		float as = sin( t );
		return vec2(
			v.x * ac - v.y * as,
			v.x * as + v.y * ac
		);

	}

	// forms a basis with the normal vector as Z
	mat3 getBasisFromNormal( vec3 normal ) {

		vec3 other;
		if ( abs( normal.x ) > 0.5 ) {

			other = vec3( 0.0, 1.0, 0.0 );

		} else {

			other = vec3( 1.0, 0.0, 0.0 );

		}

		vec3 ortho = normalize( cross( normal, other ) );
		vec3 ortho2 = normalize( cross( normal, ortho ) );
		return mat3( ortho2, ortho, normal );

	}

`,Oa=`

	// Finds the point where the ray intersects the plane defined by u and v and checks if this point
	// falls in the bounds of the rectangle on that same plane.
	// Plane intersection: https://lousodrome.net/blog/light/2020/07/03/intersection-of-a-ray-and-a-plane/
	bool intersectsRectangle( vec3 center, vec3 normal, vec3 u, vec3 v, vec3 rayOrigin, vec3 rayDirection, inout float dist ) {

		float t = dot( center - rayOrigin, normal ) / dot( rayDirection, normal );

		if ( t > EPSILON ) {

			vec3 p = rayOrigin + rayDirection * t;
			vec3 vi = p - center;

			// check if p falls inside the rectangle
			float a1 = dot( u, vi );
			if ( abs( a1 ) <= 0.5 ) {

				float a2 = dot( v, vi );
				if ( abs( a2 ) <= 0.5 ) {

					dist = t;
					return true;

				}

			}

		}

		return false;

	}

	// Finds the point where the ray intersects the plane defined by u and v and checks if this point
	// falls in the bounds of the circle on that same plane. See above URL for a description of the plane intersection algorithm.
	bool intersectsCircle( vec3 position, vec3 normal, vec3 u, vec3 v, vec3 rayOrigin, vec3 rayDirection, inout float dist ) {

		float t = dot( position - rayOrigin, normal ) / dot( rayDirection, normal );

		if ( t > EPSILON ) {

			vec3 hit = rayOrigin + rayDirection * t;
			vec3 vi = hit - position;

			float a1 = dot( u, vi );
			float a2 = dot( v, vi );

			if( length( vec2( a1, a2 ) ) <= 0.5 ) {

				dist = t;
				return true;

			}

		}

		return false;

	}

`,La=`

	// add texel fetch functions for texture arrays
	vec4 texelFetch1D( sampler2DArray tex, int layer, uint index ) {

		uint width = uint( textureSize( tex, 0 ).x );
		uvec2 uv;
		uv.x = index % width;
		uv.y = index / width;

		return texelFetch( tex, ivec3( uv, layer ), 0 );

	}

	vec4 textureSampleBarycoord( sampler2DArray tex, int layer, vec3 barycoord, uvec3 faceIndices ) {

		return
			barycoord.x * texelFetch1D( tex, layer, faceIndices.x ) +
			barycoord.y * texelFetch1D( tex, layer, faceIndices.y ) +
			barycoord.z * texelFetch1D( tex, layer, faceIndices.z );

	}

`,kr=`

	// TODO: possibly this should be renamed something related to material or path tracing logic

	#ifndef RAY_OFFSET
	#define RAY_OFFSET 1e-4
	#endif

	// adjust the hit point by the surface normal by a factor of some offset and the
	// maximum component-wise value of the current point to accommodate floating point
	// error as values increase.
	vec3 stepRayOrigin( vec3 rayOrigin, vec3 rayDirection, vec3 offset, float dist ) {

		vec3 point = rayOrigin + rayDirection * dist;
		vec3 absPoint = abs( point );
		float maxPoint = max( absPoint.x, max( absPoint.y, absPoint.z ) );
		return point + offset * ( maxPoint + 1.0 ) * RAY_OFFSET;

	}

	// https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md#attenuation
	vec3 transmissionAttenuation( float dist, vec3 attColor, float attDist ) {

		vec3 ot = - log( attColor ) / attDist;
		return exp( - ot * dist );

	}

	vec3 getHalfVector( vec3 wi, vec3 wo, float eta ) {

		// get the half vector - assuming if the light incident vector is on the other side
		// of the that it's transmissive.
		vec3 h;
		if ( wi.z > 0.0 ) {

			h = normalize( wi + wo );

		} else {

			// Scale by the ior ratio to retrieve the appropriate half vector
			// From Section 2.2 on computing the transmission half vector:
			// https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf
			h = normalize( wi + wo * eta );

		}

		h *= sign( h.z );
		return h;

	}

	vec3 getHalfVector( vec3 a, vec3 b ) {

		return normalize( a + b );

	}

	// The discrepancy between interpolated surface normal and geometry normal can cause issues when a ray
	// is cast that is on the top side of the geometry normal plane but below the surface normal plane. If
	// we find a ray like that we ignore it to avoid artifacts.
	// This function returns if the direction is on the same side of both planes.
	bool isDirectionValid( vec3 direction, vec3 surfaceNormal, vec3 geometryNormal ) {

		bool aboveSurfaceNormal = dot( direction, surfaceNormal ) > 0.0;
		bool aboveGeometryNormal = dot( direction, geometryNormal ) > 0.0;
		return aboveSurfaceNormal == aboveGeometryNormal;

	}

	// ray sampling x and z are swapped to align with expected background view
	vec2 equirectDirectionToUv( vec3 direction ) {

		// from Spherical.setFromCartesianCoords
		vec2 uv = vec2( atan( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

	vec3 equirectUvToDirection( vec2 uv ) {

		// undo above adjustments
		uv.x -= 0.5;
		uv.y = 1.0 - uv.y;

		// from Vector3.setFromSphericalCoords
		float theta = uv.x * 2.0 * PI;
		float phi = uv.y * PI;

		float sinPhi = sin( phi );

		return vec3( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

	}

	// power heuristic for multiple importance sampling
	float misHeuristic( float a, float b ) {

		float aa = a * a;
		float bb = b * b;
		return aa / ( aa + bb );

	}

	// tentFilter from Peter Shirley's 'Realistic Ray Tracing (2nd Edition)' book, pg. 60
	// erichlof/THREE.js-PathTracing-Renderer/
	float tentFilter( float x ) {

		return x < 0.5 ? sqrt( 2.0 * x ) - 1.0 : 1.0 - sqrt( 2.0 - ( 2.0 * x ) );

	}
`,cr=`

	// https://www.shadertoy.com/view/wltcRS
	uvec4 WHITE_NOISE_SEED;

	void rng_initialize( vec2 p, int frame ) {

		// white noise seed
		WHITE_NOISE_SEED = uvec4( p, uint( frame ), uint( p.x ) + uint( p.y ) );

	}

	// https://www.pcg-random.org/
	void pcg4d( inout uvec4 v ) {

		v = v * 1664525u + 1013904223u;
		v.x += v.y * v.w;
		v.y += v.z * v.x;
		v.z += v.x * v.y;
		v.w += v.y * v.z;
		v = v ^ ( v >> 16u );
		v.x += v.y*v.w;
		v.y += v.z*v.x;
		v.z += v.x*v.y;
		v.w += v.y*v.z;

	}

	// returns [ 0, 1 ]
	float pcgRand() {

		pcg4d( WHITE_NOISE_SEED );
		return float( WHITE_NOISE_SEED.x ) / float( 0xffffffffu );

	}

	vec2 pcgRand2() {

		pcg4d( WHITE_NOISE_SEED );
		return vec2( WHITE_NOISE_SEED.xy ) / float(0xffffffffu);

	}

	vec3 pcgRand3() {

		pcg4d( WHITE_NOISE_SEED );
		return vec3( WHITE_NOISE_SEED.xyz ) / float( 0xffffffffu );

	}

	vec4 pcgRand4() {

		pcg4d( WHITE_NOISE_SEED );
		return vec4( WHITE_NOISE_SEED ) / float( 0xffffffffu );

	}
`,Ua=`

	uniform sampler2D stratifiedTexture;
	uniform sampler2D stratifiedOffsetTexture;

	uint sobolPixelIndex = 0u;
	uint sobolPathIndex = 0u;
	uint sobolBounceIndex = 0u;
	vec4 pixelSeed = vec4( 0 );

	vec4 rand4( int v ) {

		ivec2 uv = ivec2( v, sobolBounceIndex );
		vec4 stratifiedSample = texelFetch( stratifiedTexture, uv, 0 );
		return fract( stratifiedSample + pixelSeed.r ); // blue noise + stratified samples

	}

	vec3 rand3( int v ) {

		return rand4( v ).xyz;

	}

	vec2 rand2( int v ) {

		return rand4( v ).xy;

	}

	float rand( int v ) {

		return rand4( v ).x;

	}

	void rng_initialize( vec2 screenCoord, int frame ) {

		// tile the small noise texture across the entire screen
		ivec2 noiseSize = ivec2( textureSize( stratifiedOffsetTexture, 0 ) );
		ivec2 pixel = ivec2( screenCoord.xy ) % noiseSize;
		vec2 pixelWidth = 1.0 / vec2( noiseSize );
		vec2 uv = vec2( pixel ) * pixelWidth + pixelWidth * 0.5;

		// note that using "texelFetch" here seems to break Android for some reason
		pixelSeed = texture( stratifiedOffsetTexture, uv );

	}

`,Ha=`

	// diffuse
	float diffuseEval( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf, inout vec3 color ) {

		// https://schuttejoe.github.io/post/disneybsdf/
		float fl = schlickFresnel( wi.z, 0.0 );
		float fv = schlickFresnel( wo.z, 0.0 );

		float metalFactor = ( 1.0 - surf.metalness );
		float transFactor = ( 1.0 - surf.transmission );
		float rr = 0.5 + 2.0 * surf.roughness * fl * fl;
		float retro = rr * ( fl + fv + fl * fv * ( rr - 1.0f ) );
		float lambert = ( 1.0f - 0.5f * fl ) * ( 1.0f - 0.5f * fv );

		// TODO: subsurface approx?

		// float F = evaluateFresnelWeight( dot( wo, wh ), surf.eta, surf.f0 );
		float F = disneyFresnel( wo, wi, wh, surf.f0, surf.eta, surf.metalness );
		color = ( 1.0 - F ) * transFactor * metalFactor * wi.z * surf.color * ( retro + lambert ) / PI;

		return wi.z / PI;

	}

	vec3 diffuseDirection( vec3 wo, SurfaceRecord surf ) {

		vec3 lightDirection = sampleSphere( rand2( 11 ) );
		lightDirection.z += 1.0;
		lightDirection = normalize( lightDirection );

		return lightDirection;

	}

	// specular
	float specularEval( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf, inout vec3 color ) {

		// if roughness is set to 0 then D === NaN which results in black pixels
		float metalness = surf.metalness;
		float roughness = surf.filteredRoughness;

		float eta = surf.eta;
		float f0 = surf.f0;

		vec3 f0Color = mix( f0 * surf.specularColor * surf.specularIntensity, surf.color, surf.metalness );
		vec3 f90Color = vec3( mix( surf.specularIntensity, 1.0, surf.metalness ) );
		vec3 F = evaluateFresnel( dot( wo, wh ), eta, f0Color, f90Color );

		vec3 iridescenceF = evalIridescence( 1.0, surf.iridescenceIor, dot( wi, wh ), surf.iridescenceThickness, f0Color );
		F = mix( F, iridescenceF,  surf.iridescence );

		// PDF
		// See 14.1.1 Microfacet BxDFs in https://www.pbr-book.org/
		float incidentTheta = acos( wo.z );
		float G = ggxShadowMaskG2( wi, wo, roughness );
		float D = ggxDistribution( wh, roughness );
		float G1 = ggxShadowMaskG1( incidentTheta, roughness );
		float ggxPdf = D * G1 * max( 0.0, abs( dot( wo, wh ) ) ) / abs ( wo.z );

		color = wi.z * F * G * D / ( 4.0 * abs( wi.z * wo.z ) );
		return ggxPdf / ( 4.0 * dot( wo, wh ) );

	}

	vec3 specularDirection( vec3 wo, SurfaceRecord surf ) {

		// sample ggx vndf distribution which gives a new normal
		float roughness = surf.filteredRoughness;
		vec3 halfVector = ggxDirection(
			wo,
			vec2( roughness ),
			rand2( 12 )
		);

		// apply to new ray by reflecting off the new normal
		return - reflect( wo, halfVector );

	}


	// transmission
	/*
	float transmissionEval( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf, inout vec3 color ) {

		// See section 4.2 in https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf

		float filteredRoughness = surf.filteredRoughness;
		float eta = surf.eta;
		bool frontFace = surf.frontFace;
		bool thinFilm = surf.thinFilm;

		color = surf.transmission * surf.color;

		float denom = pow( eta * dot( wi, wh ) + dot( wo, wh ), 2.0 );
		return ggxPDF( wo, wh, filteredRoughness ) / denom;

	}

	vec3 transmissionDirection( vec3 wo, SurfaceRecord surf ) {

		float filteredRoughness = surf.filteredRoughness;
		float eta = surf.eta;
		bool frontFace = surf.frontFace;

		// sample ggx vndf distribution which gives a new normal
		vec3 halfVector = ggxDirection(
			wo,
			vec2( filteredRoughness ),
			rand2( 13 )
		);

		vec3 lightDirection = refract( normalize( - wo ), halfVector, eta );
		if ( surf.thinFilm ) {

			lightDirection = - refract( normalize( - lightDirection ), - vec3( 0.0, 0.0, 1.0 ), 1.0 / eta );

		}

		return normalize( lightDirection );

	}
	*/

	// TODO: This is just using a basic cosine-weighted specular distribution with an
	// incorrect PDF value at the moment. Update it to correctly use a GGX distribution
	float transmissionEval( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf, inout vec3 color ) {

		color = surf.transmission * surf.color;

		// PDF
		// float F = evaluateFresnelWeight( dot( wo, wh ), surf.eta, surf.f0 );
		// float F = disneyFresnel( wo, wi, wh, surf.f0, surf.eta, surf.metalness );
		// if ( F >= 1.0 ) {

		// 	return 0.0;

		// }

		// return 1.0 / ( 1.0 - F );

		// reverted to previous to transmission. The above was causing black pixels
		float eta = surf.eta;
		float f0 = surf.f0;
		float cosTheta = min( wo.z, 1.0 );
		float sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		float reflectance = schlickFresnel( cosTheta, f0 );
		bool cannotRefract = eta * sinTheta > 1.0;
		if ( cannotRefract ) {

			return 0.0;

		}

		return 1.0 / ( 1.0 - reflectance );

	}

	vec3 transmissionDirection( vec3 wo, SurfaceRecord surf ) {

		float roughness = surf.filteredRoughness;
		float eta = surf.eta;
		vec3 halfVector = normalize( vec3( 0.0, 0.0, 1.0 ) + sampleSphere( rand2( 13 ) ) * roughness );
		vec3 lightDirection = refract( normalize( - wo ), halfVector, eta );

		if ( surf.thinFilm ) {

			lightDirection = - refract( normalize( - lightDirection ), - vec3( 0.0, 0.0, 1.0 ), 1.0 / eta );

		}
		return normalize( lightDirection );

	}

	// clearcoat
	float clearcoatEval( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf, inout vec3 color ) {

		float ior = 1.5;
		float f0 = iorRatioToF0( ior );
		bool frontFace = surf.frontFace;
		float roughness = surf.filteredClearcoatRoughness;

		float eta = frontFace ? 1.0 / ior : ior;
		float G = ggxShadowMaskG2( wi, wo, roughness );
		float D = ggxDistribution( wh, roughness );
		float F = schlickFresnel( dot( wi, wh ), f0 );

		float fClearcoat = F * D * G / ( 4.0 * abs( wi.z * wo.z ) );
		color = color * ( 1.0 - surf.clearcoat * F ) + fClearcoat * surf.clearcoat * wi.z;

		// PDF
		// See equation (27) in http://jcgt.org/published/0003/02/03/
		return ggxPDF( wo, wh, roughness ) / ( 4.0 * dot( wi, wh ) );

	}

	vec3 clearcoatDirection( vec3 wo, SurfaceRecord surf ) {

		// sample ggx vndf distribution which gives a new normal
		float roughness = surf.filteredClearcoatRoughness;
		vec3 halfVector = ggxDirection(
			wo,
			vec2( roughness ),
			rand2( 14 )
		);

		// apply to new ray by reflecting off the new normal
		return - reflect( wo, halfVector );

	}

	// sheen
	vec3 sheenColor( vec3 wo, vec3 wi, vec3 wh, SurfaceRecord surf ) {

		float cosThetaO = saturateCos( wo.z );
		float cosThetaI = saturateCos( wi.z );
		float cosThetaH = wh.z;

		float D = velvetD( cosThetaH, surf.sheenRoughness );
		float G = velvetG( cosThetaO, cosThetaI, surf.sheenRoughness );

		// See equation (1) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
		vec3 color = surf.sheenColor;
		color *= D * G / ( 4.0 * abs( cosThetaO * cosThetaI ) );
		color *= wi.z;

		return color;

	}

	// bsdf
	void getLobeWeights(
		vec3 wo, vec3 wi, vec3 wh, vec3 clearcoatWo, SurfaceRecord surf,
		inout float diffuseWeight, inout float specularWeight, inout float transmissionWeight, inout float clearcoatWeight
	) {

		float metalness = surf.metalness;
		float transmission = surf.transmission;
		// float fEstimate = evaluateFresnelWeight( dot( wo, wh ), surf.eta, surf.f0 );
		float fEstimate = disneyFresnel( wo, wi, wh, surf.f0, surf.eta, surf.metalness );

		float transSpecularProb = mix( max( 0.25, fEstimate ), 1.0, metalness );
		float diffSpecularProb = 0.5 + 0.5 * metalness;

		diffuseWeight = ( 1.0 - transmission ) * ( 1.0 - diffSpecularProb );
		specularWeight = transmission * transSpecularProb + ( 1.0 - transmission ) * diffSpecularProb;
		transmissionWeight = transmission * ( 1.0 - transSpecularProb );
		clearcoatWeight = surf.clearcoat * schlickFresnel( clearcoatWo.z, 0.04 );

		float totalWeight = diffuseWeight + specularWeight + transmissionWeight + clearcoatWeight;
		diffuseWeight /= totalWeight;
		specularWeight /= totalWeight;
		transmissionWeight /= totalWeight;
		clearcoatWeight /= totalWeight;
	}

	float bsdfEval(
		vec3 wo, vec3 clearcoatWo, vec3 wi, vec3 clearcoatWi, SurfaceRecord surf,
		float diffuseWeight, float specularWeight, float transmissionWeight, float clearcoatWeight, inout float specularPdf, inout vec3 color
	) {

		float metalness = surf.metalness;
		float transmission = surf.transmission;

		float spdf = 0.0;
		float dpdf = 0.0;
		float tpdf = 0.0;
		float cpdf = 0.0;
		color = vec3( 0.0 );

		vec3 halfVector = getHalfVector( wi, wo, surf.eta );

		// diffuse
		if ( diffuseWeight > 0.0 && wi.z > 0.0 ) {

			dpdf = diffuseEval( wo, wi, halfVector, surf, color );
			color *= 1.0 - surf.transmission;

		}

		// ggx specular
		if ( specularWeight > 0.0 && wi.z > 0.0 ) {

			vec3 outColor;
			spdf = specularEval( wo, wi, getHalfVector( wi, wo ), surf, outColor );
			color += outColor;

		}

		// transmission
		if ( transmissionWeight > 0.0 && wi.z < 0.0 ) {

			tpdf = transmissionEval( wo, wi, halfVector, surf, color );

		}

		// sheen
		color *= mix( 1.0, sheenAlbedoScaling( wo, wi, surf ), surf.sheen );
		color += sheenColor( wo, wi, halfVector, surf ) * surf.sheen;

		// clearcoat
		if ( clearcoatWi.z >= 0.0 && clearcoatWeight > 0.0 ) {

			vec3 clearcoatHalfVector = getHalfVector( clearcoatWo, clearcoatWi );
			cpdf = clearcoatEval( clearcoatWo, clearcoatWi, clearcoatHalfVector, surf, color );

		}

		float pdf =
			dpdf * diffuseWeight
			+ spdf * specularWeight
			+ tpdf * transmissionWeight
			+ cpdf * clearcoatWeight;

		// retrieve specular rays for the shadows flag
		specularPdf = spdf * specularWeight + cpdf * clearcoatWeight;

		return pdf;

	}

	float bsdfResult( vec3 worldWo, vec3 worldWi, SurfaceRecord surf, inout vec3 color ) {

		if ( surf.volumeParticle ) {

			color = surf.color / ( 4.0 * PI );
			return 1.0 / ( 4.0 * PI );

		}

		vec3 wo = normalize( surf.normalInvBasis * worldWo );
		vec3 wi = normalize( surf.normalInvBasis * worldWi );

		vec3 clearcoatWo = normalize( surf.clearcoatInvBasis * worldWo );
		vec3 clearcoatWi = normalize( surf.clearcoatInvBasis * worldWi );

		vec3 wh = getHalfVector( wo, wi, surf.eta );
		float diffuseWeight;
		float specularWeight;
		float transmissionWeight;
		float clearcoatWeight;
		getLobeWeights( wo, wi, wh, clearcoatWo, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight );

		float specularPdf;
		return bsdfEval( wo, clearcoatWo, wi, clearcoatWi, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight, specularPdf, color );

	}

	ScatterRecord bsdfSample( vec3 worldWo, SurfaceRecord surf ) {

		if ( surf.volumeParticle ) {

			ScatterRecord sampleRec;
			sampleRec.specularPdf = 0.0;
			sampleRec.pdf = 1.0 / ( 4.0 * PI );
			sampleRec.direction = sampleSphere( rand2( 16 ) );
			sampleRec.color = surf.color / ( 4.0 * PI );
			return sampleRec;

		}

		vec3 wo = normalize( surf.normalInvBasis * worldWo );
		vec3 clearcoatWo = normalize( surf.clearcoatInvBasis * worldWo );
		mat3 normalBasis = surf.normalBasis;
		mat3 invBasis = surf.normalInvBasis;
		mat3 clearcoatNormalBasis = surf.clearcoatBasis;
		mat3 clearcoatInvBasis = surf.clearcoatInvBasis;

		float diffuseWeight;
		float specularWeight;
		float transmissionWeight;
		float clearcoatWeight;
		// using normal and basically-reflected ray since we don't have proper half vector here
		getLobeWeights( wo, wo, vec3( 0, 0, 1 ), clearcoatWo, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight );

		float pdf[4];
		pdf[0] = diffuseWeight;
		pdf[1] = specularWeight;
		pdf[2] = transmissionWeight;
		pdf[3] = clearcoatWeight;

		float cdf[4];
		cdf[0] = pdf[0];
		cdf[1] = pdf[1] + cdf[0];
		cdf[2] = pdf[2] + cdf[1];
		cdf[3] = pdf[3] + cdf[2];

		if( cdf[3] != 0.0 ) {

			float invMaxCdf = 1.0 / cdf[3];
			cdf[0] *= invMaxCdf;
			cdf[1] *= invMaxCdf;
			cdf[2] *= invMaxCdf;
			cdf[3] *= invMaxCdf;

		} else {

			cdf[0] = 1.0;
			cdf[1] = 0.0;
			cdf[2] = 0.0;
			cdf[3] = 0.0;

		}

		vec3 wi;
		vec3 clearcoatWi;

		float r = rand( 15 );
		if ( r <= cdf[0] ) { // diffuse

			wi = diffuseDirection( wo, surf );
			clearcoatWi = normalize( clearcoatInvBasis * normalize( normalBasis * wi ) );

		} else if ( r <= cdf[1] ) { // specular

			wi = specularDirection( wo, surf );
			clearcoatWi = normalize( clearcoatInvBasis * normalize( normalBasis * wi ) );

		} else if ( r <= cdf[2] ) { // transmission / refraction

			wi = transmissionDirection( wo, surf );
			clearcoatWi = normalize( clearcoatInvBasis * normalize( normalBasis * wi ) );

		} else if ( r <= cdf[3] ) { // clearcoat

			clearcoatWi = clearcoatDirection( clearcoatWo, surf );
			wi = normalize( invBasis * normalize( clearcoatNormalBasis * clearcoatWi ) );

		}

		ScatterRecord result;
		result.pdf = bsdfEval( wo, clearcoatWo, wi, clearcoatWi, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight, result.specularPdf, result.color );
		result.direction = normalize( surf.normalBasis * wi );

		return result;

	}

`,Wa=`

	// returns the hit distance given the material density
	float intersectFogVolume( Material material, float u ) {

		// https://raytracing.github.io/books/RayTracingTheNextWeek.html#volumes/constantdensitymediums
		return material.opacity == 0.0 ? INFINITY : ( - 1.0 / material.opacity ) * log( u );

	}

	ScatterRecord sampleFogVolume( SurfaceRecord surf, vec2 uv ) {

		ScatterRecord sampleRec;
		sampleRec.specularPdf = 0.0;
		sampleRec.pdf = 1.0 / ( 2.0 * PI );
		sampleRec.direction = sampleSphere( uv );
		sampleRec.color = surf.color;
		return sampleRec;

	}

`,Va=`

	// The GGX functions provide sampling and distribution information for normals as output so
	// in order to get probability of scatter direction the half vector must be computed and provided.
	// [0] https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf
	// [1] https://hal.archives-ouvertes.fr/hal-01509746/document
	// [2] http://jcgt.org/published/0007/04/01/
	// [4] http://jcgt.org/published/0003/02/03/

	// trowbridge-reitz === GGX === GTR

	vec3 ggxDirection( vec3 incidentDir, vec2 roughness, vec2 uv ) {

		// TODO: try GGXVNDF implementation from reference [2], here. Needs to update ggxDistribution
		// function below, as well

		// Implementation from reference [1]
		// stretch view
		vec3 V = normalize( vec3( roughness * incidentDir.xy, incidentDir.z ) );

		// orthonormal basis
		vec3 T1 = ( V.z < 0.9999 ) ? normalize( cross( V, vec3( 0.0, 0.0, 1.0 ) ) ) : vec3( 1.0, 0.0, 0.0 );
		vec3 T2 = cross( T1, V );

		// sample point with polar coordinates (r, phi)
		float a = 1.0 / ( 1.0 + V.z );
		float r = sqrt( uv.x );
		float phi = ( uv.y < a ) ? uv.y / a * PI : PI + ( uv.y - a ) / ( 1.0 - a ) * PI;
		float P1 = r * cos( phi );
		float P2 = r * sin( phi ) * ( ( uv.y < a ) ? 1.0 : V.z );

		// compute normal
		vec3 N = P1 * T1 + P2 * T2 + V * sqrt( max( 0.0, 1.0 - P1 * P1 - P2 * P2 ) );

		// unstretch
		N = normalize( vec3( roughness * N.xy, max( 0.0, N.z ) ) );

		return N;

	}

	// Below are PDF and related functions for use in a Monte Carlo path tracer
	// as specified in Appendix B of the following paper
	// See equation (34) from reference [0]
	float ggxLamda( float theta, float roughness ) {

		float tanTheta = tan( theta );
		float tanTheta2 = tanTheta * tanTheta;
		float alpha2 = roughness * roughness;

		float numerator = - 1.0 + sqrt( 1.0 + alpha2 * tanTheta2 );
		return numerator / 2.0;

	}

	// See equation (34) from reference [0]
	float ggxShadowMaskG1( float theta, float roughness ) {

		return 1.0 / ( 1.0 + ggxLamda( theta, roughness ) );

	}

	// See equation (125) from reference [4]
	float ggxShadowMaskG2( vec3 wi, vec3 wo, float roughness ) {

		float incidentTheta = acos( wi.z );
		float scatterTheta = acos( wo.z );
		return 1.0 / ( 1.0 + ggxLamda( incidentTheta, roughness ) + ggxLamda( scatterTheta, roughness ) );

	}

	// See equation (33) from reference [0]
	float ggxDistribution( vec3 halfVector, float roughness ) {

		float a2 = roughness * roughness;
		a2 = max( EPSILON, a2 );
		float cosTheta = halfVector.z;
		float cosTheta4 = pow( cosTheta, 4.0 );

		if ( cosTheta == 0.0 ) return 0.0;

		float theta = acosSafe( halfVector.z );
		float tanTheta = tan( theta );
		float tanTheta2 = pow( tanTheta, 2.0 );

		float denom = PI * cosTheta4 * pow( a2 + tanTheta2, 2.0 );
		return ( a2 / denom );

	}

	// See equation (3) from reference [2]
	float ggxPDF( vec3 wi, vec3 halfVector, float roughness ) {

		float incidentTheta = acos( wi.z );
		float D = ggxDistribution( halfVector, roughness );
		float G1 = ggxShadowMaskG1( incidentTheta, roughness );

		return D * G1 * max( 0.0, dot( wi, halfVector ) ) / wi.z;

	}

`,qa=`

	// XYZ to sRGB color space
	const mat3 XYZ_TO_REC709 = mat3(
		3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);

	vec3 fresnel0ToIor( vec3 fresnel0 ) {

		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );

	}

	// Conversion FO/IOR
	vec3 iorToFresnel0( vec3 transmittedIor, float incidentIor ) {

		return square( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );

	}

	// ior is a value between 1.0 and 3.0. 1.0 is air interface
	float iorToFresnel0( float transmittedIor, float incidentIor ) {

		return square( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ) );

	}

	// Fresnel equations for dielectric/dielectric interfaces. See https://belcour.github.io/blog/research/2017/05/01/brdf-thin-film.html
	vec3 evalSensitivity( float OPD, vec3 shift ) {

		float phase = 2.0 * PI * OPD * 1.0e-9;

		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );

		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - square( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * square( phase ) );
		xyz /= 1.0685e-7;

		vec3 srgb = XYZ_TO_REC709 * xyz;
		return srgb;

	}

	// See Section 4. Analytic Spectral Integration, A Practical Extension to Microfacet Theory for the Modeling of Varying Iridescence, https://hal.archives-ouvertes.fr/hal-01518344/document
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {

		vec3 I;

		// Force iridescenceIor -> outsideIOR when thinFilmThickness -> 0.0
		float iridescenceIor = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );

		// Evaluate the cosTheta on the base layer (Snell law)
		float sinTheta2Sq = square( outsideIOR / iridescenceIor ) * ( 1.0 - square( cosTheta1 ) );

		// Handle TIR:
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {

			return vec3( 1.0 );

		}

		float cosTheta2 = sqrt( cosTheta2Sq );

		// First interface
		float R0 = iorToFresnel0( iridescenceIor, outsideIOR );
		float R12 = schlickFresnel( cosTheta1, R0 );
		float R21 = R12;
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIor < outsideIOR ) {

			phi12 = PI;

		}

		float phi21 = PI - phi12;

		// Second interface
		vec3 baseIOR = fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) ); // guard against 1.0
		vec3 R1 = iorToFresnel0( baseIOR, iridescenceIor );
		vec3 R23 = schlickFresnel( cosTheta2, R1 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[0] < iridescenceIor ) {

			phi23[ 0 ] = PI;

		}

		if ( baseIOR[1] < iridescenceIor ) {

			phi23[ 1 ] = PI;

		}

		if ( baseIOR[2] < iridescenceIor ) {

			phi23[ 2 ] = PI;

		}

		// Phase shift
		float OPD = 2.0 * iridescenceIor * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;

		// Compound terms
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = square( T121 ) * R23 / ( vec3( 1.0 ) - R123 );

		// Reflectance term for m = 0 (DC term amplitude)
		vec3 C0 = R12 + Rs;
		I = C0;

		// Reflectance term for m > 0 (pairs of diracs)
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {

			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;

		}

		// Since out of gamut colors might be produced, negative color values are clamped to 0.
		return max( I, vec3( 0.0 ) );

	}

`,Ga=`

	// See equation (2) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
	float velvetD( float cosThetaH, float roughness ) {

		float alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		float invAlpha = 1.0 / alpha;

		float sqrCosThetaH = cosThetaH * cosThetaH;
		float sinThetaH = max( 1.0 - sqrCosThetaH, 0.001 );

		return ( 2.0 + invAlpha ) * pow( sinThetaH, 0.5 * invAlpha ) / ( 2.0 * PI );

	}

	float velvetParamsInterpolate( int i, float oneMinusAlphaSquared ) {

		const float p0[5] = float[5]( 25.3245, 3.32435, 0.16801, -1.27393, -4.85967 );
		const float p1[5] = float[5]( 21.5473, 3.82987, 0.19823, -1.97760, -4.32054 );

		return mix( p1[i], p0[i], oneMinusAlphaSquared );

	}

	float velvetL( float x, float alpha ) {

		float oneMinusAlpha = 1.0 - alpha;
		float oneMinusAlphaSquared = oneMinusAlpha * oneMinusAlpha;

		float a = velvetParamsInterpolate( 0, oneMinusAlphaSquared );
		float b = velvetParamsInterpolate( 1, oneMinusAlphaSquared );
		float c = velvetParamsInterpolate( 2, oneMinusAlphaSquared );
		float d = velvetParamsInterpolate( 3, oneMinusAlphaSquared );
		float e = velvetParamsInterpolate( 4, oneMinusAlphaSquared );

		return a / ( 1.0 + b * pow( abs( x ), c ) ) + d * x + e;

	}

	// See equation (3) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
	float velvetLambda( float cosTheta, float alpha ) {

		return abs( cosTheta ) < 0.5 ? exp( velvetL( cosTheta, alpha ) ) : exp( 2.0 * velvetL( 0.5, alpha ) - velvetL( 1.0 - cosTheta, alpha ) );

	}

	// See Section 3, Shadowing Term, in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
	float velvetG( float cosThetaO, float cosThetaI, float roughness ) {

		float alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		return 1.0 / ( 1.0 + velvetLambda( cosThetaO, alpha ) + velvetLambda( cosThetaI, alpha ) );

	}

	float directionalAlbedoSheen( float cosTheta, float alpha ) {

		cosTheta = saturate( cosTheta );

		float c = 1.0 - cosTheta;
		float c3 = c * c * c;

		return 0.65584461 * c3 + 1.0 / ( 4.16526551 + exp( -7.97291361 * sqrt( alpha ) + 6.33516894 ) );

	}

	float sheenAlbedoScaling( vec3 wo, vec3 wi, SurfaceRecord surf ) {

		float alpha = max( surf.sheenRoughness, 0.07 );
		alpha = alpha * alpha;

		float maxSheenColor = max( max( surf.sheenColor.r, surf.sheenColor.g ), surf.sheenColor.b );

		float eWo = directionalAlbedoSheen( saturateCos( wo.z ), alpha );
		float eWi = directionalAlbedoSheen( saturateCos( wi.z ), alpha );

		return min( 1.0 - maxSheenColor * eWo, 1.0 - maxSheenColor * eWi );

	}

	// See Section 5, Layering, in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
	float sheenAlbedoScaling( vec3 wo, SurfaceRecord surf ) {

		float alpha = max( surf.sheenRoughness, 0.07 );
		alpha = alpha * alpha;

		float maxSheenColor = max( max( surf.sheenColor.r, surf.sheenColor.g ), surf.sheenColor.b );

		float eWo = directionalAlbedoSheen( saturateCos( wo.z ), alpha );

		return 1.0 - maxSheenColor * eWo;

	}

`,$a=`

#ifndef FOG_CHECK_ITERATIONS
#define FOG_CHECK_ITERATIONS 30
#endif

// returns whether the given material is a fog material or not
bool isMaterialFogVolume( sampler2D materials, uint materialIndex ) {

	uint i = materialIndex * uint( MATERIAL_PIXELS );
	vec4 s14 = texelFetch1D( materials, i + 14u );
	return bool( int( s14.b ) & 4 );

}

// returns true if we're within the first fog volume we hit
bool bvhIntersectFogVolumeHit(
	vec3 rayOrigin, vec3 rayDirection,
	usampler2D materialIndexAttribute, sampler2D materials,
	inout Material material
) {

	material.fogVolume = false;

	for ( int i = 0; i < FOG_CHECK_ITERATIONS; i ++ ) {

		// find nearest hit
		uvec4 faceIndices = uvec4( 0u );
		vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
		vec3 barycoord = vec3( 0.0 );
		float side = 1.0;
		float dist = 0.0;
		bool hit = bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );
		if ( hit ) {

			// if it's a fog volume return whether we hit the front or back face
			uint materialIndex = uTexelFetch1D( materialIndexAttribute, faceIndices.x ).r;
			if ( isMaterialFogVolume( materials, materialIndex ) ) {

				material = readMaterialInfo( materials, materialIndex );
				return side == - 1.0;

			} else {

				// move the ray forward
				rayOrigin = stepRayOrigin( rayOrigin, rayDirection, - faceNormal, dist );

			}

		} else {

			return false;

		}

	}

	return false;

}

`,Ya=`

	// step through multiple surface hits and accumulate color attenuation based on transmissive surfaces
	// returns true if a solid surface was hit
	bool attenuateHit(
		RenderState state,
		Ray ray, float rayDist,
		out vec3 color
	) {

		// store the original bounce index so we can reset it after
		uint originalBounceIndex = sobolBounceIndex;

		int traversals = state.traversals;
		int transmissiveTraversals = state.transmissiveTraversals;
		bool isShadowRay = state.isShadowRay;
		Material fogMaterial = state.fogMaterial;

		vec3 startPoint = ray.origin;

		// hit results
		SurfaceHit surfaceHit;

		color = vec3( 1.0 );

		bool result = true;
		for ( int i = 0; i < traversals; i ++ ) {

			sobolBounceIndex ++;

			int hitType = traceScene( ray, fogMaterial, surfaceHit );

			if ( hitType == FOG_HIT ) {

				result = true;
				break;

			} else if ( hitType == SURFACE_HIT ) {

				float totalDist = distance( startPoint, ray.origin + ray.direction * surfaceHit.dist );
				if ( totalDist > rayDist ) {

					result = false;
					break;

				}

				// TODO: attenuate the contribution based on the PDF of the resulting ray including refraction values
				// Should be able to work using the material BSDF functions which will take into account specularity, etc.
				// TODO: should we account for emissive surfaces here?

				uint materialIndex = uTexelFetch1D( materialIndexAttribute, surfaceHit.faceIndices.x ).r;
				Material material = readMaterialInfo( materials, materialIndex );

				// adjust the ray to the new surface
				bool isEntering = surfaceHit.side == 1.0;
				ray.origin = stepRayOrigin( ray.origin, ray.direction, - surfaceHit.faceNormal, surfaceHit.dist );

				#if FEATURE_FOG

				if ( material.fogVolume ) {

					fogMaterial = material;
					fogMaterial.fogVolume = surfaceHit.side == 1.0;
					i -= sign( transmissiveTraversals );
					transmissiveTraversals --;
					continue;

				}

				#endif

				if ( ! material.castShadow && isShadowRay ) {

					continue;

				}

				vec2 uv = textureSampleBarycoord( attributesArray, ATTR_UV, surfaceHit.barycoord, surfaceHit.faceIndices.xyz ).xy;
				vec4 vertexColor = textureSampleBarycoord( attributesArray, ATTR_COLOR, surfaceHit.barycoord, surfaceHit.faceIndices.xyz );

				// albedo
				vec4 albedo = vec4( material.color, material.opacity );
				if ( material.map != - 1 ) {

					vec3 uvPrime = material.mapTransform * vec3( uv, 1 );
					albedo *= texture2D( textures, vec3( uvPrime.xy, material.map ) );

				}

				if ( material.vertexColors ) {

					albedo *= vertexColor;

				}

				// alphaMap
				if ( material.alphaMap != - 1 ) {

					vec3 uvPrime = material.alphaMapTransform * vec3( uv, 1 );
					albedo.a *= texture2D( textures, vec3( uvPrime.xy, material.alphaMap ) ).x;

				}

				// transmission
				float transmission = material.transmission;
				if ( material.transmissionMap != - 1 ) {

					vec3 uvPrime = material.transmissionMapTransform * vec3( uv, 1 );
					transmission *= texture2D( textures, vec3( uvPrime.xy, material.transmissionMap ) ).r;

				}

				// metalness
				float metalness = material.metalness;
				if ( material.metalnessMap != - 1 ) {

					vec3 uvPrime = material.metalnessMapTransform * vec3( uv, 1 );
					metalness *= texture2D( textures, vec3( uvPrime.xy, material.metalnessMap ) ).b;

				}

				float alphaTest = material.alphaTest;
				bool useAlphaTest = alphaTest != 0.0;
				float transmissionFactor = ( 1.0 - metalness ) * transmission;
				if (
					transmissionFactor < rand( 9 ) && ! (
						// material sidedness
						material.side != 0.0 && surfaceHit.side == material.side

						// alpha test
						|| useAlphaTest && albedo.a < alphaTest

						// opacity
						|| material.transparent && ! useAlphaTest && albedo.a < rand( 10 )
					)
				) {

					result = true;
					break;

				}

				if ( surfaceHit.side == 1.0 && isEntering ) {

					// only attenuate by surface color on the way in
					color *= mix( vec3( 1.0 ), albedo.rgb, transmissionFactor );

				} else if ( surfaceHit.side == - 1.0 ) {

					// attenuate by medium once we hit the opposite side of the model
					color *= transmissionAttenuation( surfaceHit.dist, material.attenuationColor, material.attenuationDistance );

				}

				bool isTransmissiveRay = dot( ray.direction, surfaceHit.faceNormal * surfaceHit.side ) < 0.0;
				if ( ( isTransmissiveRay || isEntering ) && transmissiveTraversals > 0 ) {

					i -= sign( transmissiveTraversals );
					transmissiveTraversals --;

				}

			} else {

				result = false;
				break;

			}

		}

		// reset the bounce index
		sobolBounceIndex = originalBounceIndex;
		return result;

	}

`,ja=`

	vec3 ndcToRayOrigin( vec2 coord ) {

		vec4 rayOrigin4 = cameraWorldMatrix * invProjectionMatrix * vec4( coord, - 1.0, 1.0 );
		return rayOrigin4.xyz / rayOrigin4.w;
	}

	Ray getCameraRay() {

		vec2 ssd = vec2( 1.0 ) / resolution;

		// Jitter the camera ray by finding a uv coordinate at a random sample
		// around this pixel's UV coordinate for AA
		vec2 ruv = rand2( 0 );
		vec2 jitteredUv = vUv + vec2( tentFilter( ruv.x ) * ssd.x, tentFilter( ruv.y ) * ssd.y );
		Ray ray;

		#if CAMERA_TYPE == 2

			// Equirectangular projection
			vec4 rayDirection4 = vec4( equirectUvToDirection( jitteredUv ), 0.0 );
			vec4 rayOrigin4 = vec4( 0.0, 0.0, 0.0, 1.0 );

			rayDirection4 = cameraWorldMatrix * rayDirection4;
			rayOrigin4 = cameraWorldMatrix * rayOrigin4;

			ray.direction = normalize( rayDirection4.xyz );
			ray.origin = rayOrigin4.xyz / rayOrigin4.w;

		#else

			// get [- 1, 1] normalized device coordinates
			vec2 ndc = 2.0 * jitteredUv - vec2( 1.0 );
			ray.origin = ndcToRayOrigin( ndc );

			#if CAMERA_TYPE == 1

				// Orthographic projection
				ray.direction = ( cameraWorldMatrix * vec4( 0.0, 0.0, - 1.0, 0.0 ) ).xyz;
				ray.direction = normalize( ray.direction );

			#else

				// Perspective projection
				ray.direction = normalize( mat3( cameraWorldMatrix ) * ( invProjectionMatrix * vec4( ndc, 0.0, 1.0 ) ).xyz );

			#endif

		#endif

		#if FEATURE_DOF
		{

			// depth of field
			vec3 focalPoint = ray.origin + normalize( ray.direction ) * physicalCamera.focusDistance;

			// get the aperture sample
			// if blades === 0 then we assume a circle
			vec3 shapeUVW= rand3( 1 );
			int blades = physicalCamera.apertureBlades;
			float anamorphicRatio = physicalCamera.anamorphicRatio;
			vec2 apertureSample = sampleAperture( blades, shapeUVW );
			apertureSample *= physicalCamera.bokehSize * 0.5 * 1e-3;

			// rotate the aperture shape
			apertureSample =
				rotateVector( apertureSample, physicalCamera.apertureRotation ) *
				saturate( vec2( anamorphicRatio, 1.0 / anamorphicRatio ) );

			// create the new ray
			ray.origin += ( cameraWorldMatrix * vec4( apertureSample, 0.0, 0.0 ) ).xyz;
			ray.direction = focalPoint - ray.origin;

		}
		#endif

		ray.direction = normalize( ray.direction );

		return ray;

	}

`,Xa=`

	vec3 directLightContribution( vec3 worldWo, SurfaceRecord surf, RenderState state, vec3 rayOrigin ) {

		vec3 result = vec3( 0.0 );

		// uniformly pick a light or environment map
		if( lightsDenom != 0.0 && rand( 5 ) < float( lights.count ) / lightsDenom ) {

			// sample a light or environment
			LightRecord lightRec = randomLightSample( lights.tex, iesProfiles, lights.count, rayOrigin, rand3( 6 ) );

			bool isSampleBelowSurface = ! surf.volumeParticle && dot( surf.faceNormal, lightRec.direction ) < 0.0;
			if ( isSampleBelowSurface ) {

				lightRec.pdf = 0.0;

			}

			// check if a ray could even reach the light area
			Ray lightRay;
			lightRay.origin = rayOrigin;
			lightRay.direction = lightRec.direction;
			vec3 attenuatedColor;
			if (
				lightRec.pdf > 0.0 &&
				isDirectionValid( lightRec.direction, surf.normal, surf.faceNormal ) &&
				! attenuateHit( state, lightRay, lightRec.dist, attenuatedColor )
			) {

				// get the material pdf
				vec3 sampleColor;
				float lightMaterialPdf = bsdfResult( worldWo, lightRec.direction, surf, sampleColor );
				bool isValidSampleColor = all( greaterThanEqual( sampleColor, vec3( 0.0 ) ) );
				if ( lightMaterialPdf > 0.0 && isValidSampleColor ) {

					// weight the direct light contribution
					float lightPdf = lightRec.pdf / lightsDenom;
					float misWeight = lightRec.type == SPOT_LIGHT_TYPE || lightRec.type == DIR_LIGHT_TYPE || lightRec.type == POINT_LIGHT_TYPE ? 1.0 : misHeuristic( lightPdf, lightMaterialPdf );
					result = attenuatedColor * lightRec.emission * state.throughputColor * sampleColor * misWeight / lightPdf;

				}

			}

		} else if ( envMapInfo.totalSum != 0.0 && environmentIntensity != 0.0 ) {

			// find a sample in the environment map to include in the contribution
			vec3 envColor, envDirection;
			float envPdf = sampleEquirectProbability( rand2( 7 ), envColor, envDirection );
			envDirection = invEnvRotation3x3 * envDirection;

			// this env sampling is not set up for transmissive sampling and yields overly bright
			// results so we ignore the sample in this case.
			// TODO: this should be improved but how? The env samples could traverse a few layers?
			bool isSampleBelowSurface = ! surf.volumeParticle && dot( surf.faceNormal, envDirection ) < 0.0;
			if ( isSampleBelowSurface ) {

				envPdf = 0.0;

			}

			// check if a ray could even reach the surface
			Ray envRay;
			envRay.origin = rayOrigin;
			envRay.direction = envDirection;
			vec3 attenuatedColor;
			if (
				envPdf > 0.0 &&
				isDirectionValid( envDirection, surf.normal, surf.faceNormal ) &&
				! attenuateHit( state, envRay, INFINITY, attenuatedColor )
			) {

				// get the material pdf
				vec3 sampleColor;
				float envMaterialPdf = bsdfResult( worldWo, envDirection, surf, sampleColor );
				bool isValidSampleColor = all( greaterThanEqual( sampleColor, vec3( 0.0 ) ) );
				if ( envMaterialPdf > 0.0 && isValidSampleColor ) {

					// weight the direct light contribution
					envPdf /= lightsDenom;
					float misWeight = misHeuristic( envPdf, envMaterialPdf );
					result = attenuatedColor * environmentIntensity * envColor * state.throughputColor * sampleColor * misWeight / envPdf;

				}

			}

		}

		// Function changed to have a single return statement to potentially help with crashes on Mac OS.
		// See issue #470
		return result;

	}

`,Qa=`

	#define SKIP_SURFACE 0
	#define HIT_SURFACE 1
	int getSurfaceRecord(
		Material material, SurfaceHit surfaceHit, sampler2DArray attributesArray,
		float accumulatedRoughness,
		inout SurfaceRecord surf
	) {

		if ( material.fogVolume ) {

			vec3 normal = vec3( 0, 0, 1 );

			SurfaceRecord fogSurface;
			fogSurface.volumeParticle = true;
			fogSurface.color = material.color;
			fogSurface.emission = material.emissiveIntensity * material.emissive;
			fogSurface.normal = normal;
			fogSurface.faceNormal = normal;
			fogSurface.clearcoatNormal = normal;

			surf = fogSurface;
			return HIT_SURFACE;

		}

		// uv coord for textures
		vec2 uv = textureSampleBarycoord( attributesArray, ATTR_UV, surfaceHit.barycoord, surfaceHit.faceIndices.xyz ).xy;
		vec4 vertexColor = textureSampleBarycoord( attributesArray, ATTR_COLOR, surfaceHit.barycoord, surfaceHit.faceIndices.xyz );

		// albedo
		vec4 albedo = vec4( material.color, material.opacity );
		if ( material.map != - 1 ) {

			vec3 uvPrime = material.mapTransform * vec3( uv, 1 );
			albedo *= texture2D( textures, vec3( uvPrime.xy, material.map ) );

		}

		if ( material.vertexColors ) {

			albedo *= vertexColor;

		}

		// alphaMap
		if ( material.alphaMap != - 1 ) {

			vec3 uvPrime = material.alphaMapTransform * vec3( uv, 1 );
			albedo.a *= texture2D( textures, vec3( uvPrime.xy, material.alphaMap ) ).x;

		}

		// possibly skip this sample if it's transparent, alpha test is enabled, or we hit the wrong material side
		// and it's single sided.
		// - alpha test is disabled when it === 0
		// - the material sidedness test is complicated because we want light to pass through the back side but still
		// be able to see the front side. This boolean checks if the side we hit is the front side on the first ray
		// and we're rendering the other then we skip it. Do the opposite on subsequent bounces to get incoming light.
		float alphaTest = material.alphaTest;
		bool useAlphaTest = alphaTest != 0.0;
		if (
			// material sidedness
			material.side != 0.0 && surfaceHit.side != material.side

			// alpha test
			|| useAlphaTest && albedo.a < alphaTest

			// opacity
			|| material.transparent && ! useAlphaTest && albedo.a < rand( 3 )
		) {

			return SKIP_SURFACE;

		}

		// fetch the interpolated smooth normal
		vec3 normal = normalize( textureSampleBarycoord(
			attributesArray,
			ATTR_NORMAL,
			surfaceHit.barycoord,
			surfaceHit.faceIndices.xyz
		).xyz );

		// roughness
		float roughness = material.roughness;
		if ( material.roughnessMap != - 1 ) {

			vec3 uvPrime = material.roughnessMapTransform * vec3( uv, 1 );
			roughness *= texture2D( textures, vec3( uvPrime.xy, material.roughnessMap ) ).g;

		}

		// metalness
		float metalness = material.metalness;
		if ( material.metalnessMap != - 1 ) {

			vec3 uvPrime = material.metalnessMapTransform * vec3( uv, 1 );
			metalness *= texture2D( textures, vec3( uvPrime.xy, material.metalnessMap ) ).b;

		}

		// emission
		vec3 emission = material.emissiveIntensity * material.emissive;
		if ( material.emissiveMap != - 1 ) {

			vec3 uvPrime = material.emissiveMapTransform * vec3( uv, 1 );
			emission *= texture2D( textures, vec3( uvPrime.xy, material.emissiveMap ) ).xyz;

		}

		// transmission
		float transmission = material.transmission;
		if ( material.transmissionMap != - 1 ) {

			vec3 uvPrime = material.transmissionMapTransform * vec3( uv, 1 );
			transmission *= texture2D( textures, vec3( uvPrime.xy, material.transmissionMap ) ).r;

		}

		// normal
		if ( material.flatShading ) {

			// if we're rendering a flat shaded object then use the face normals - the face normal
			// is provided based on the side the ray hits the mesh so flip it to align with the
			// interpolated vertex normals.
			normal = surfaceHit.faceNormal * surfaceHit.side;

		}

		vec3 baseNormal = normal;
		if ( material.normalMap != - 1 ) {

			vec4 tangentSample = textureSampleBarycoord(
				attributesArray,
				ATTR_TANGENT,
				surfaceHit.barycoord,
				surfaceHit.faceIndices.xyz
			);

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( tangentSample.xyz ) > 0.0 ) {

				vec3 tangent = normalize( tangentSample.xyz );
				vec3 bitangent = normalize( cross( normal, tangent ) * tangentSample.w );
				mat3 vTBN = mat3( tangent, bitangent, normal );

				vec3 uvPrime = material.normalMapTransform * vec3( uv, 1 );
				vec3 texNormal = texture2D( textures, vec3( uvPrime.xy, material.normalMap ) ).xyz * 2.0 - 1.0;
				texNormal.xy *= material.normalScale;
				normal = vTBN * texNormal;

			}

		}

		normal *= surfaceHit.side;

		// clearcoat
		float clearcoat = material.clearcoat;
		if ( material.clearcoatMap != - 1 ) {

			vec3 uvPrime = material.clearcoatMapTransform * vec3( uv, 1 );
			clearcoat *= texture2D( textures, vec3( uvPrime.xy, material.clearcoatMap ) ).r;

		}

		// clearcoatRoughness
		float clearcoatRoughness = material.clearcoatRoughness;
		if ( material.clearcoatRoughnessMap != - 1 ) {

			vec3 uvPrime = material.clearcoatRoughnessMapTransform * vec3( uv, 1 );
			clearcoatRoughness *= texture2D( textures, vec3( uvPrime.xy, material.clearcoatRoughnessMap ) ).g;

		}

		// clearcoatNormal
		vec3 clearcoatNormal = baseNormal;
		if ( material.clearcoatNormalMap != - 1 ) {

			vec4 tangentSample = textureSampleBarycoord(
				attributesArray,
				ATTR_TANGENT,
				surfaceHit.barycoord,
				surfaceHit.faceIndices.xyz
			);

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( tangentSample.xyz ) > 0.0 ) {

				vec3 tangent = normalize( tangentSample.xyz );
				vec3 bitangent = normalize( cross( clearcoatNormal, tangent ) * tangentSample.w );
				mat3 vTBN = mat3( tangent, bitangent, clearcoatNormal );

				vec3 uvPrime = material.clearcoatNormalMapTransform * vec3( uv, 1 );
				vec3 texNormal = texture2D( textures, vec3( uvPrime.xy, material.clearcoatNormalMap ) ).xyz * 2.0 - 1.0;
				texNormal.xy *= material.clearcoatNormalScale;
				clearcoatNormal = vTBN * texNormal;

			}

		}

		clearcoatNormal *= surfaceHit.side;

		// sheenColor
		vec3 sheenColor = material.sheenColor;
		if ( material.sheenColorMap != - 1 ) {

			vec3 uvPrime = material.sheenColorMapTransform * vec3( uv, 1 );
			sheenColor *= texture2D( textures, vec3( uvPrime.xy, material.sheenColorMap ) ).rgb;

		}

		// sheenRoughness
		float sheenRoughness = material.sheenRoughness;
		if ( material.sheenRoughnessMap != - 1 ) {

			vec3 uvPrime = material.sheenRoughnessMapTransform * vec3( uv, 1 );
			sheenRoughness *= texture2D( textures, vec3( uvPrime.xy, material.sheenRoughnessMap ) ).a;

		}

		// iridescence
		float iridescence = material.iridescence;
		if ( material.iridescenceMap != - 1 ) {

			vec3 uvPrime = material.iridescenceMapTransform * vec3( uv, 1 );
			iridescence *= texture2D( textures, vec3( uvPrime.xy, material.iridescenceMap ) ).r;

		}

		// iridescence thickness
		float iridescenceThickness = material.iridescenceThicknessMaximum;
		if ( material.iridescenceThicknessMap != - 1 ) {

			vec3 uvPrime = material.iridescenceThicknessMapTransform * vec3( uv, 1 );
			float iridescenceThicknessSampled = texture2D( textures, vec3( uvPrime.xy, material.iridescenceThicknessMap ) ).g;
			iridescenceThickness = mix( material.iridescenceThicknessMinimum, material.iridescenceThicknessMaximum, iridescenceThicknessSampled );

		}

		iridescence = iridescenceThickness == 0.0 ? 0.0 : iridescence;

		// specular color
		vec3 specularColor = material.specularColor;
		if ( material.specularColorMap != - 1 ) {

			vec3 uvPrime = material.specularColorMapTransform * vec3( uv, 1 );
			specularColor *= texture2D( textures, vec3( uvPrime.xy, material.specularColorMap ) ).rgb;

		}

		// specular intensity
		float specularIntensity = material.specularIntensity;
		if ( material.specularIntensityMap != - 1 ) {

			vec3 uvPrime = material.specularIntensityMapTransform * vec3( uv, 1 );
			specularIntensity *= texture2D( textures, vec3( uvPrime.xy, material.specularIntensityMap ) ).a;

		}

		surf.volumeParticle = false;

		surf.faceNormal = surfaceHit.faceNormal;
		surf.normal = normal;

		surf.metalness = metalness;
		surf.color = albedo.rgb;
		surf.emission = emission;

		surf.ior = material.ior;
		surf.transmission = transmission;
		surf.thinFilm = material.thinFilm;
		surf.attenuationColor = material.attenuationColor;
		surf.attenuationDistance = material.attenuationDistance;

		surf.clearcoatNormal = clearcoatNormal;
		surf.clearcoat = clearcoat;

		surf.sheen = material.sheen;
		surf.sheenColor = sheenColor;

		surf.iridescence = iridescence;
		surf.iridescenceIor = material.iridescenceIor;
		surf.iridescenceThickness = iridescenceThickness;

		surf.specularColor = specularColor;
		surf.specularIntensity = specularIntensity;

		// apply perceptual roughness factor from gltf. sheen perceptual roughness is
		// applied by its brdf function
		// https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#microfacet-surfaces
		surf.roughness = roughness * roughness;
		surf.clearcoatRoughness = clearcoatRoughness * clearcoatRoughness;
		surf.sheenRoughness = sheenRoughness;

		// frontFace is used to determine transmissive properties and PDF. If no transmission is used
		// then we can just always assume this is a front face.
		surf.frontFace = surfaceHit.side == 1.0 || transmission == 0.0;
		surf.eta = material.thinFilm || surf.frontFace ? 1.0 / material.ior : material.ior;
		surf.f0 = iorRatioToF0( surf.eta );

		// Compute the filtered roughness value to use during specular reflection computations.
		// The accumulated roughness value is scaled by a user setting and a "magic value" of 5.0.
		// If we're exiting something transmissive then scale the factor down significantly so we can retain
		// sharp internal reflections
		surf.filteredRoughness = applyFilteredGlossy( surf.roughness, accumulatedRoughness );
		surf.filteredClearcoatRoughness = applyFilteredGlossy( surf.clearcoatRoughness, accumulatedRoughness );

		// get the normal frames
		surf.normalBasis = getBasisFromNormal( surf.normal );
		surf.normalInvBasis = inverse( surf.normalBasis );

		surf.clearcoatBasis = getBasisFromNormal( surf.clearcoatNormal );
		surf.clearcoatInvBasis = inverse( surf.clearcoatBasis );

		return HIT_SURFACE;

	}
`,Za=`

	struct Ray {

		vec3 origin;
		vec3 direction;

	};

	struct SurfaceHit {

		uvec4 faceIndices;
		vec3 barycoord;
		vec3 faceNormal;
		float side;
		float dist;

	};

	struct RenderState {

		bool firstRay;
		bool transmissiveRay;
		bool isShadowRay;
		float accumulatedRoughness;
		int transmissiveTraversals;
		int traversals;
		uint depth;
		vec3 throughputColor;
		Material fogMaterial;

	};

	RenderState initRenderState() {

		RenderState result;
		result.firstRay = true;
		result.transmissiveRay = true;
		result.isShadowRay = false;
		result.accumulatedRoughness = 0.0;
		result.transmissiveTraversals = 0;
		result.traversals = 0;
		result.throughputColor = vec3( 1.0 );
		result.depth = 0u;
		result.fogMaterial.fogVolume = false;
		return result;

	}

`,Ka=`

	#define NO_HIT 0
	#define SURFACE_HIT 1
	#define LIGHT_HIT 2
	#define FOG_HIT 3

	// Passing the global variable 'lights' into this function caused shader program errors.
	// So global variables like 'lights' and 'bvh' were moved out of the function parameters.
	// For more information, refer to: https://github.com/gkjohnson/three-gpu-pathtracer/pull/457
	int traceScene(
		Ray ray, Material fogMaterial, inout SurfaceHit surfaceHit
	) {

		int result = NO_HIT;
		bool hit = bvhIntersectFirstHit( bvh, ray.origin, ray.direction, surfaceHit.faceIndices, surfaceHit.faceNormal, surfaceHit.barycoord, surfaceHit.side, surfaceHit.dist );

		#if FEATURE_FOG

		if ( fogMaterial.fogVolume ) {

			// offset the distance so we don't run into issues with particles on the same surface
			// as other objects
			float particleDist = intersectFogVolume( fogMaterial, rand( 1 ) );
			if ( particleDist + RAY_OFFSET < surfaceHit.dist ) {

				surfaceHit.side = 1.0;
				surfaceHit.faceNormal = normalize( - ray.direction );
				surfaceHit.dist = particleDist;
				return FOG_HIT;

			}

		}

		#endif

		if ( hit ) {

			result = SURFACE_HIT;

		}

		return result;

	}

`;class Ja extends Ti{onBeforeRender(){this.setDefine("FEATURE_DOF",this.physicalCamera.bokehSize===0?0:1),this.setDefine("FEATURE_BACKGROUND_MAP",this.backgroundMap?1:0),this.setDefine("FEATURE_FOG",this.materials.features.isUsed("FOG")?1:0)}constructor(e){super({transparent:!0,depthWrite:!1,defines:{FEATURE_MIS:1,FEATURE_RUSSIAN_ROULETTE:1,FEATURE_DOF:1,FEATURE_BACKGROUND_MAP:0,FEATURE_FOG:1,RANDOM_TYPE:2,CAMERA_TYPE:0,DEBUG_MODE:0,ATTR_NORMAL:0,ATTR_TANGENT:1,ATTR_UV:2,ATTR_COLOR:3,MATERIAL_PIXELS:Si},uniforms:{resolution:{value:new Y},opacity:{value:1},bounces:{value:10},transmissiveBounces:{value:10},filterGlossyFactor:{value:0},physicalCamera:{value:new Xn},cameraWorldMatrix:{value:new V},invProjectionMatrix:{value:new V},bvh:{value:new gn},attributesArray:{value:new oa},materialIndexAttribute:{value:new Pr},materials:{value:new da},textures:{value:new ar().texture},lights:{value:new na},iesProfiles:{value:new ar(360,180,{type:ce,wrapS:Pe,wrapT:Pe}).texture},environmentIntensity:{value:1},environmentRotation:{value:new V},envMapInfo:{value:new Kn},backgroundBlur:{value:0},backgroundMap:{value:null},backgroundAlpha:{value:1},backgroundIntensity:{value:1},backgroundRotation:{value:new V},seed:{value:0},sobolTexture:{value:null},stratifiedTexture:{value:new Ta},stratifiedOffsetTexture:{value:new Ia(64,1)}},vertexShader:`

				varying vec2 vUv;
				void main() {

					vec4 mvPosition = vec4( position, 1.0 );
					mvPosition = modelViewMatrix * mvPosition;
					gl_Position = projectionMatrix * mvPosition;

					vUv = uv;

				}

			`,fragmentShader:`
				#define RAY_OFFSET 1e-4
				#define INFINITY 1e20

				precision highp isampler2D;
				precision highp usampler2D;
				precision highp sampler2DArray;
				vec4 envMapTexelToLinear( vec4 a ) { return a; }
				#include <common>

				// bvh intersection
				${yn}
				${Tn}
				${bn}

				// uniform structs
				${Ra}
				${Ca}
				${Pa}
				${Fa}
				${Da}

				// random
				#if RANDOM_TYPE == 2 	// Stratified List

					${Ua}

				#elif RANDOM_TYPE == 1 	// Sobol

					${cr}
					${Er}
					${$n}

					#define rand(v) sobol(v)
					#define rand2(v) sobol2(v)
					#define rand3(v) sobol3(v)
					#define rand4(v) sobol4(v)

				#else 					// PCG

				${cr}

					// Using the sobol functions seems to break the the compiler on MacOS
					// - specifically the "sobolReverseBits" function.
					uint sobolPixelIndex = 0u;
					uint sobolPathIndex = 0u;
					uint sobolBounceIndex = 0u;

					#define rand(v) pcgRand()
					#define rand2(v) pcgRand2()
					#define rand3(v) pcgRand3()
					#define rand4(v) pcgRand4()

				#endif

				// common
				${La}
				${ka}
				${kr}
				${Na}
				${Oa}

				// environment
				uniform EquirectHdrInfo envMapInfo;
				uniform mat4 environmentRotation;
				uniform float environmentIntensity;

				// lighting
				uniform sampler2DArray iesProfiles;
				uniform LightsInfo lights;

				// background
				uniform float backgroundBlur;
				uniform float backgroundAlpha;
				#if FEATURE_BACKGROUND_MAP

				uniform sampler2D backgroundMap;
				uniform mat4 backgroundRotation;
				uniform float backgroundIntensity;

				#endif

				// camera
				uniform mat4 cameraWorldMatrix;
				uniform mat4 invProjectionMatrix;
				#if FEATURE_DOF

				uniform PhysicalCamera physicalCamera;

				#endif

				// geometry
				uniform sampler2DArray attributesArray;
				uniform usampler2D materialIndexAttribute;
				uniform sampler2D materials;
				uniform sampler2DArray textures;
				uniform BVH bvh;

				// path tracer
				uniform int bounces;
				uniform int transmissiveBounces;
				uniform float filterGlossyFactor;
				uniform int seed;

				// image
				uniform vec2 resolution;
				uniform float opacity;

				varying vec2 vUv;

				// globals
				mat3 envRotation3x3;
				mat3 invEnvRotation3x3;
				float lightsDenom;

				// sampling
				${za}
				${Ba}
				${Ea}

				${$a}
				${Va}
				${Ga}
				${qa}
				${Wa}
				${Ha}

				float applyFilteredGlossy( float roughness, float accumulatedRoughness ) {

					return clamp(
						max(
							roughness,
							accumulatedRoughness * filterGlossyFactor * 5.0 ),
						0.0,
						1.0
					);

				}

				vec3 sampleBackground( vec3 direction, vec2 uv ) {

					vec3 sampleDir = sampleHemisphere( direction, uv ) * 0.5 * backgroundBlur;

					#if FEATURE_BACKGROUND_MAP

					sampleDir = normalize( mat3( backgroundRotation ) * direction + sampleDir );
					return backgroundIntensity * sampleEquirectColor( backgroundMap, sampleDir );

					#else

					sampleDir = normalize( envRotation3x3 * direction + sampleDir );
					return environmentIntensity * sampleEquirectColor( envMapInfo.map, sampleDir );

					#endif

				}

				${Za}
				${ja}
				${Ka}
				${Ya}
				${Xa}
				${Qa}

				void main() {

					// init
					rng_initialize( gl_FragCoord.xy, seed );
					sobolPixelIndex = ( uint( gl_FragCoord.x ) << 16 ) | uint( gl_FragCoord.y );
					sobolPathIndex = uint( seed );

					// get camera ray
					Ray ray = getCameraRay();

					// inverse environment rotation
					envRotation3x3 = mat3( environmentRotation );
					invEnvRotation3x3 = inverse( envRotation3x3 );
					lightsDenom =
						( environmentIntensity == 0.0 || envMapInfo.totalSum == 0.0 ) && lights.count != 0u ?
							float( lights.count ) :
							float( lights.count + 1u );

					// final color
					gl_FragColor = vec4( 0, 0, 0, 1 );

					// surface results
					SurfaceHit surfaceHit;
					ScatterRecord scatterRec;

					// path tracing state
					RenderState state = initRenderState();
					state.transmissiveTraversals = transmissiveBounces;
					#if FEATURE_FOG

					state.fogMaterial.fogVolume = bvhIntersectFogVolumeHit(
						ray.origin, - ray.direction,
						materialIndexAttribute, materials,
						state.fogMaterial
					);

					#endif

					for ( int i = 0; i < bounces; i ++ ) {

						sobolBounceIndex ++;

						state.depth ++;
						state.traversals = bounces - i;
						state.firstRay = i == 0 && state.transmissiveTraversals == transmissiveBounces;

						int hitType = traceScene( ray, state.fogMaterial, surfaceHit );

						// check if we intersect any lights and accumulate the light contribution
						// TODO: we can add support for light surface rendering in the else condition if we
						// add the ability to toggle visibility of the the light
						if ( ! state.firstRay && ! state.transmissiveRay ) {

							LightRecord lightRec;
							float lightDist = hitType == NO_HIT ? INFINITY : surfaceHit.dist;
							for ( uint i = 0u; i < lights.count; i ++ ) {

								if (
									intersectLightAtIndex( lights.tex, ray.origin, ray.direction, i, lightRec ) &&
									lightRec.dist < lightDist
								) {

									#if FEATURE_MIS

									// weight the contribution
									// NOTE: Only area lights are supported for forward sampling and can be hit
									float misWeight = misHeuristic( scatterRec.pdf, lightRec.pdf / lightsDenom );
									gl_FragColor.rgb += lightRec.emission * state.throughputColor * misWeight;

									#else

									gl_FragColor.rgb += lightRec.emission * state.throughputColor;

									#endif

								}

							}

						}

						if ( hitType == NO_HIT ) {

							if ( state.firstRay || state.transmissiveRay ) {

								gl_FragColor.rgb += sampleBackground( ray.direction, rand2( 2 ) ) * state.throughputColor;
								gl_FragColor.a = backgroundAlpha;

							} else {

								#if FEATURE_MIS

								// get the PDF of the hit envmap point
								vec3 envColor;
								float envPdf = sampleEquirect( envRotation3x3 * ray.direction, envColor );
								envPdf /= lightsDenom;

								// and weight the contribution
								float misWeight = misHeuristic( scatterRec.pdf, envPdf );
								gl_FragColor.rgb += environmentIntensity * envColor * state.throughputColor * misWeight;

								#else

								gl_FragColor.rgb +=
									environmentIntensity *
									sampleEquirectColor( envMapInfo.map, envRotation3x3 * ray.direction ) *
									state.throughputColor;

								#endif

							}
							break;

						}

						uint materialIndex = uTexelFetch1D( materialIndexAttribute, surfaceHit.faceIndices.x ).r;
						Material material = readMaterialInfo( materials, materialIndex );

						#if FEATURE_FOG

						if ( hitType == FOG_HIT ) {

							material = state.fogMaterial;
							state.accumulatedRoughness += 0.2;

						} else if ( material.fogVolume ) {

							state.fogMaterial = material;
							state.fogMaterial.fogVolume = surfaceHit.side == 1.0;

							ray.origin = stepRayOrigin( ray.origin, ray.direction, - surfaceHit.faceNormal, surfaceHit.dist );

							i -= sign( state.transmissiveTraversals );
							state.transmissiveTraversals -= sign( state.transmissiveTraversals );
							continue;

						}

						#endif

						// early out if this is a matte material
						if ( material.matte && state.firstRay ) {

							gl_FragColor = vec4( 0.0 );
							break;

						}

						// if we've determined that this is a shadow ray and we've hit an item with no shadow casting
						// then skip it
						if ( ! material.castShadow && state.isShadowRay ) {

							ray.origin = stepRayOrigin( ray.origin, ray.direction, - surfaceHit.faceNormal, surfaceHit.dist );
							continue;

						}

						SurfaceRecord surf;
						if (
							getSurfaceRecord(
								material, surfaceHit, attributesArray, state.accumulatedRoughness,
								surf
							) == SKIP_SURFACE
						) {

							// only allow a limited number of transparency discards otherwise we could
							// crash the context with too long a loop.
							i -= sign( state.transmissiveTraversals );
							state.transmissiveTraversals -= sign( state.transmissiveTraversals );

							ray.origin = stepRayOrigin( ray.origin, ray.direction, - surfaceHit.faceNormal, surfaceHit.dist );
							continue;

						}

						scatterRec = bsdfSample( - ray.direction, surf );
						state.isShadowRay = scatterRec.specularPdf < rand( 4 );

						bool isBelowSurface = ! surf.volumeParticle && dot( scatterRec.direction, surf.faceNormal ) < 0.0;
						vec3 hitPoint = stepRayOrigin( ray.origin, ray.direction, isBelowSurface ? - surf.faceNormal : surf.faceNormal, surfaceHit.dist );

						// next event estimation
						#if FEATURE_MIS

						gl_FragColor.rgb += directLightContribution( - ray.direction, surf, state, hitPoint );

						#endif

						// accumulate a roughness value to offset diffuse, specular, diffuse rays that have high contribution
						// to a single pixel resulting in fireflies
						// TODO: handle transmissive surfaces
						if ( ! surf.volumeParticle && ! isBelowSurface ) {

							// determine if this is a rough normal or not by checking how far off straight up it is
							vec3 halfVector = normalize( - ray.direction + scatterRec.direction );
							state.accumulatedRoughness += max(
								sin( acosApprox( dot( halfVector, surf.normal ) ) ),
								sin( acosApprox( dot( halfVector, surf.clearcoatNormal ) ) )
							);

							state.transmissiveRay = false;

						}

						// accumulate emissive color
						gl_FragColor.rgb += ( surf.emission * state.throughputColor );

						// skip the sample if our PDF or ray is impossible
						if ( scatterRec.pdf <= 0.0 || ! isDirectionValid( scatterRec.direction, surf.normal, surf.faceNormal ) ) {

							break;

						}

						// if we're bouncing around the inside a transmissive material then decrement
						// perform this separate from a bounce
						bool isTransmissiveRay = ! surf.volumeParticle && dot( scatterRec.direction, surf.faceNormal * surfaceHit.side ) < 0.0;
						if ( ( isTransmissiveRay || isBelowSurface ) && state.transmissiveTraversals > 0 ) {

							state.transmissiveTraversals --;
							i --;

						}

						//

						// handle throughput color transformation
						// attenuate the throughput color by the medium color
						if ( ! surf.frontFace ) {

							state.throughputColor *= transmissionAttenuation( surfaceHit.dist, surf.attenuationColor, surf.attenuationDistance );

						}

						#if FEATURE_RUSSIAN_ROULETTE

						// russian roulette path termination
						// https://www.arnoldrenderer.com/research/physically_based_shader_design_in_arnold.pdf
						uint minBounces = 3u;
						float depthProb = float( state.depth < minBounces );

						float rrProb = luminance( state.throughputColor * scatterRec.color / scatterRec.pdf );
						rrProb /= luminance( state.throughputColor );
						rrProb = sqrt( rrProb );
						rrProb = max( rrProb, depthProb );
						rrProb = min( rrProb, 1.0 );
						if ( rand( 8 ) > rrProb ) {

							break;

						}

						// perform sample clamping here to avoid bright pixels
						state.throughputColor *= min( 1.0 / rrProb, 20.0 );

						#endif

						// adjust the throughput and discard and exit if we find discard the sample if there are any NaNs
						state.throughputColor *= scatterRec.color / scatterRec.pdf;
						if ( any( isnan( state.throughputColor ) ) || any( isinf( state.throughputColor ) ) ) {

							break;

						}

						//

						// prepare for next ray
						ray.direction = scatterRec.direction;
						ray.origin = hitPoint;

					}

					gl_FragColor.a *= opacity;

					#if DEBUG_MODE == 1

					// output the number of rays checked in the path and number of
					// transmissive rays encountered.
					gl_FragColor.rgb = vec3(
						float( state.depth ),
						transmissiveBounces - state.transmissiveTraversals,
						0.0
					);
					gl_FragColor.a = 1.0;

					#endif

				}

			`}),this.setValues(e)}}function*eo(){const{_renderer:n,_fsQuad:e,_blendQuad:t,_primaryTarget:i,_blendTargets:s,_sobolTarget:a,_subframe:r,alpha:c,material:l}=this,h=new Ye,f=new Ye,u=t.material;let[o,m]=s;for(;;){c?(u.opacity=this._opacityFactor/(this.samples+1),l.blending=st,l.opacity=1):(l.opacity=this._opacityFactor/(this.samples+1),l.blending=br);const[g,y,d,b]=r,p=i.width,v=i.height;l.resolution.set(p*d,v*b),l.sobolTexture=a.texture,l.stratifiedTexture.init(20,l.bounces+l.transmissiveBounces+5),l.stratifiedTexture.next(),l.seed++;const x=this.tiles.x||1,T=this.tiles.y||1,w=x*T,S=Math.ceil(p*d),M=Math.ceil(v*b),I=Math.floor(g*p),_=Math.floor(y*v),R=Math.ceil(S/x),A=Math.ceil(M/T);for(let P=0;P<T;P++)for(let C=0;C<x;C++){const D=n.getRenderTarget(),B=n.autoClear,ae=n.getScissorTest();n.getScissor(h),n.getViewport(f);let ee=C,ge=P;if(!this.stableTiles){const oe=this._currentTile%(x*T);ee=oe%x,ge=~~(oe/x),this._currentTile=oe+1}const le=T-ge-1;i.scissor.set(I+ee*R,_+le*A,Math.min(R,S-ee*R),Math.min(A,M-le*A)),i.viewport.set(I,_,S,M),n.setRenderTarget(i),n.setScissorTest(!0),n.autoClear=!1,e.render(n),n.setViewport(f),n.setScissor(h),n.setScissorTest(ae),n.setRenderTarget(D),n.autoClear=B,c&&(u.target1=o.texture,u.target2=i.texture,n.setRenderTarget(m),t.render(n),n.setRenderTarget(D)),this.samples+=1/w,C===x-1&&P===T-1&&(this.samples=Math.round(this.samples)),yield}[o,m]=[m,o]}}const lr=new yr;class ur{get material(){return this._fsQuad.material}set material(e){this._fsQuad.material.removeEventListener("recompilation",this._compileFunction),e.addEventListener("recompilation",this._compileFunction),this._fsQuad.material=e}get target(){return this._alpha?this._blendTargets[1]:this._primaryTarget}set alpha(e){this._alpha!==e&&(e||(this._blendTargets[0].dispose(),this._blendTargets[1].dispose()),this._alpha=e,this.reset())}get alpha(){return this._alpha}get isCompiling(){return!!this._compilePromise}constructor(e){this.camera=null,this.tiles=new Y(3,3),this.stableNoise=!1,this.stableTiles=!0,this.samples=0,this._subframe=new Ye(0,0,1,1),this._opacityFactor=1,this._renderer=e,this._alpha=!1,this._fsQuad=new Ce(new Ja),this._blendQuad=new Ce(new qn),this._task=null,this._currentTile=0,this._compilePromise=null,this._sobolTarget=new jn().generate(e),this._primaryTarget=new $e(1,1,{format:G,type:j,magFilter:k,minFilter:k}),this._blendTargets=[new $e(1,1,{format:G,type:j,magFilter:k,minFilter:k}),new $e(1,1,{format:G,type:j,magFilter:k,minFilter:k})],this._compileFunction=()=>{const t=this.compileMaterial(this._fsQuad._mesh);t.then(()=>{this._compilePromise===t&&(this._compilePromise=null)}),this._compilePromise=t},this.material.addEventListener("recompilation",this._compileFunction)}compileMaterial(){return this._renderer.compileAsync(this._fsQuad._mesh)}setCamera(e){const{material:t}=this;t.cameraWorldMatrix.copy(e.matrixWorld),t.invProjectionMatrix.copy(e.projectionMatrixInverse),t.physicalCamera.updateFrom(e);let i=0;e.projectionMatrix.elements[15]>0&&(i=1),e.isEquirectCamera&&(i=2),t.setDefine("CAMERA_TYPE",i),this.camera=e}setSize(e,t){e=Math.ceil(e),t=Math.ceil(t),!(this._primaryTarget.width===e&&this._primaryTarget.height===t)&&(this._primaryTarget.setSize(e,t),this._blendTargets[0].setSize(e,t),this._blendTargets[1].setSize(e,t),this.reset())}getSize(e){e.x=this._primaryTarget.width,e.y=this._primaryTarget.height}dispose(){this._primaryTarget.dispose(),this._blendTargets[0].dispose(),this._blendTargets[1].dispose(),this._sobolTarget.dispose(),this._fsQuad.dispose(),this._blendQuad.dispose(),this._task=null}reset(){const{_renderer:e,_primaryTarget:t,_blendTargets:i}=this,s=e.getRenderTarget(),a=e.getClearAlpha();e.getClearColor(lr),e.setRenderTarget(t),e.setClearColor(0,0),e.clearColor(),e.setRenderTarget(i[0]),e.setClearColor(0,0),e.clearColor(),e.setRenderTarget(i[1]),e.setClearColor(0,0),e.clearColor(),e.setClearColor(lr,a),e.setRenderTarget(s),this.samples=0,this._task=null,this.material.stratifiedTexture.stableNoise=this.stableNoise,this.stableNoise&&(this.material.seed=0,this.material.stratifiedTexture.reset())}update(){this.material.onBeforeRender(),!this.isCompiling&&(this._task||(this._task=eo.call(this)),this._task.next())}}class to extends nt{get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}constructor(e){super({uniforms:{map:{value:null},opacity:{value:1}},vertexShader:`
				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,fragmentShader:`
				uniform sampler2D map;
				uniform float opacity;
				varying vec2 vUv;

				vec4 clampedTexelFatch( sampler2D map, ivec2 px, int lod ) {

					vec4 res = texelFetch( map, ivec2( px.x, px.y ), 0 );

					#if defined( TONE_MAPPING )

					res.xyz = toneMapping( res.xyz );

					#endif

			  		return linearToOutputTexel( res );

				}

				void main() {

					vec2 size = vec2( textureSize( map, 0 ) );
					vec2 pxUv = vUv * size;
					vec2 pxCurr = floor( pxUv );
					vec2 pxFrac = fract( pxUv ) - 0.5;
					vec2 pxOffset;
					pxOffset.x = pxFrac.x > 0.0 ? 1.0 : - 1.0;
					pxOffset.y = pxFrac.y > 0.0 ? 1.0 : - 1.0;

					vec2 pxNext = clamp( pxOffset + pxCurr, vec2( 0.0 ), size - 1.0 );
					vec2 alpha = abs( pxFrac );

					vec4 p1 = mix(
						clampedTexelFatch( map, ivec2( pxCurr.x, pxCurr.y ), 0 ),
						clampedTexelFatch( map, ivec2( pxNext.x, pxCurr.y ), 0 ),
						alpha.x
					);

					vec4 p2 = mix(
						clampedTexelFatch( map, ivec2( pxCurr.x, pxNext.y ), 0 ),
						clampedTexelFatch( map, ivec2( pxNext.x, pxNext.y ), 0 ),
						alpha.x
					);

					gl_FragColor = mix( p1, p2, alpha.y );
					gl_FragColor.a *= opacity;
					#include <premultiplied_alpha_fragment>

				}
			`}),this.setValues(e)}}class io extends nt{constructor(){super({uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:`
				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`
				#define ENVMAP_TYPE_CUBE_UV

				uniform samplerCube envMap;
				uniform float flipEnvMap;
				varying vec2 vUv;

				#include <common>
				#include <cube_uv_reflection_fragment>

				${kr}

				void main() {

					vec3 rayDirection = equirectUvToDirection( vUv );
					rayDirection.x *= flipEnvMap;
					gl_FragColor = textureCube( envMap, rayDirection );

				}`}),this.depthWrite=!1,this.depthTest=!1}}class fr{constructor(e){this._renderer=e,this._quad=new Ce(new io)}generate(e,t=null,i=null){if(!e.isCubeTexture)throw new Error("CubeToEquirectMaterial: Source can only be cube textures.");const s=e.images[0],a=this._renderer,r=this._quad;t===null&&(t=4*s.height),i===null&&(i=2*s.height);const c=new $e(t,i,{type:j,colorSpace:s.colorSpace}),l=s.height,h=Math.log2(l)-2,f=1/l,u=1/(3*Math.max(Math.pow(2,h),112));r.material.defines.CUBEUV_MAX_MIP=`${h}.0`,r.material.defines.CUBEUV_TEXEL_WIDTH=u,r.material.defines.CUBEUV_TEXEL_HEIGHT=f,r.material.uniforms.envMap.value=e,r.material.uniforms.flipEnvMap.value=e.isRenderTargetTexture?1:-1,r.material.needsUpdate=!0;const o=a.getRenderTarget(),m=a.autoClear;a.autoClear=!0,a.setRenderTarget(c),r.render(a),a.setRenderTarget(o),a.autoClear=m;const g=new Uint16Array(t*i*4),y=new Float32Array(t*i*4);a.readRenderTargetPixels(c,0,0,t,i,y),c.dispose();for(let b=0,p=y.length;b<p;b++)g[b]=de.toHalfFloat(y[b]);const d=new re(g,t,i,G,ce);return d.minFilter=is,d.magFilter=fe,d.wrapS=Re,d.wrapT=Re,d.mapping=rs,d.needsUpdate=!0,d}dispose(){this._quad.dispose()}}function ro(n){return n.extensions.get("EXT_float_blend")}const We=new Y;class so{get multipleImportanceSampling(){return!!this._pathTracer.material.defines.FEATURE_MIS}set multipleImportanceSampling(e){this._pathTracer.material.setDefine("FEATURE_MIS",e?1:0)}get transmissiveBounces(){return this._pathTracer.material.transmissiveBounces}set transmissiveBounces(e){this._pathTracer.material.transmissiveBounces=e}get bounces(){return this._pathTracer.material.bounces}set bounces(e){this._pathTracer.material.bounces=e}get filterGlossyFactor(){return this._pathTracer.material.filterGlossyFactor}set filterGlossyFactor(e){this._pathTracer.material.filterGlossyFactor=e}get samples(){return this._pathTracer.samples}get target(){return this._pathTracer.target}get tiles(){return this._pathTracer.tiles}get stableNoise(){return this._pathTracer.stableNoise}set stableNoise(e){this._pathTracer.stableNoise=e}get isCompiling(){return!!this._pathTracer.isCompiling}constructor(e){this._renderer=e,this._generator=new Un,this._pathTracer=new ur(e),this._queueReset=!1,this._clock=new ss,this._compilePromise=null,this._lowResPathTracer=new ur(e),this._lowResPathTracer.tiles.set(1,1),this._quad=new Ce(new to({map:null,transparent:!0,blending:st,premultipliedAlpha:e.getContextAttributes().premultipliedAlpha})),this._materials=null,this._previousEnvironment=null,this._previousBackground=null,this._internalBackground=null,this.renderDelay=100,this.minSamples=5,this.fadeDuration=500,this.enablePathTracing=!0,this.pausePathTracing=!1,this.dynamicLowRes=!1,this.lowResScale=.25,this.renderScale=1,this.synchronizeRenderSize=!0,this.rasterizeScene=!0,this.renderToCanvas=!0,this.textureSize=new Y(1024,1024),this.rasterizeSceneCallback=(t,i)=>{this._renderer.render(t,i)},this.renderToCanvasCallback=(t,i,s)=>{const a=i.autoClear;i.autoClear=!1,s.render(i),i.autoClear=a},this.setScene(new Tr,new vr)}setBVHWorker(e){this._generator.setBVHWorker(e)}setScene(e,t,i={}){e.updateMatrixWorld(!0),t.updateMatrixWorld();const s=this._generator;if(s.setObjects(e),this._buildAsync)return s.generateAsync(i.onProgress).then(a=>this._updateFromResults(e,t,a));{const a=s.generate();return this._updateFromResults(e,t,a)}}setSceneAsync(...e){this._buildAsync=!0;const t=this.setScene(...e);return this._buildAsync=!1,t}setCamera(e){this.camera=e,this.updateCamera()}updateCamera(){const e=this.camera;e.updateMatrixWorld(),this._pathTracer.setCamera(e),this._lowResPathTracer.setCamera(e),this.reset()}updateMaterials(){const e=this._pathTracer.material,t=this._renderer,i=this._materials,s=this.textureSize,a=ua(i);e.textures.setTextures(t,a,s.x,s.y),e.materials.updateFrom(i,a),this.reset()}updateLights(){const e=this.scene,t=this._renderer,i=this._pathTracer.material,s=fa(e),a=la(s);i.lights.updateFrom(s,a),i.iesProfiles.setTextures(t,a),this.reset()}updateEnvironment(){const e=this.scene,t=this._pathTracer.material;if(this._internalBackground&&(this._internalBackground.dispose(),this._internalBackground=null),t.backgroundBlur=e.backgroundBlurriness,t.backgroundIntensity=e.backgroundIntensity??1,t.backgroundRotation.makeRotationFromEuler(e.backgroundRotation).invert(),e.background===null)t.backgroundMap=null,t.backgroundAlpha=0;else if(e.background.isColor){this._colorBackground=this._colorBackground||new ds(16);const i=this._colorBackground;i.topColor.equals(e.background)||(i.topColor.set(e.background),i.bottomColor.set(e.background),i.update()),t.backgroundMap=i,t.backgroundAlpha=1}else if(e.background.isCubeTexture){if(e.background!==this._previousBackground){const i=new fr(this._renderer).generate(e.background);this._internalBackground=i,t.backgroundMap=i,t.backgroundAlpha=1}}else t.backgroundMap=e.background,t.backgroundAlpha=1;if(t.environmentIntensity=e.environment!==null?e.environmentIntensity??1:0,t.environmentRotation.makeRotationFromEuler(e.environmentRotation).invert(),this._previousEnvironment!==e.environment&&e.environment!==null)if(e.environment.isCubeTexture){const i=new fr(this._renderer).generate(e.environment);t.envMapInfo.updateFrom(i)}else t.envMapInfo.updateFrom(e.environment);this._previousEnvironment=e.environment,this._previousBackground=e.background,this.reset()}_updateFromResults(e,t,i){const{materials:s,geometry:a,bvh:r,bvhChanged:c,needsMaterialIndexUpdate:l}=i;this._materials=s;const f=this._pathTracer.material;return c&&(f.bvh.updateFrom(r),f.attributesArray.updateFrom(a.attributes.normal,a.attributes.tangent,a.attributes.uv,a.attributes.color)),l&&f.materialIndexAttribute.updateFrom(a.attributes.materialIndex),this._previousScene=e,this.scene=e,this.camera=t,this.updateCamera(),this.updateMaterials(),this.updateEnvironment(),this.updateLights(),i}renderSample(){const e=this._lowResPathTracer,t=this._pathTracer,i=this._renderer,s=this._clock,a=this._quad;this._updateScale(),this._queueReset&&(t.reset(),e.reset(),this._queueReset=!1,a.material.opacity=0,s.start());const r=s.getDelta()*1e3,c=s.getElapsedTime()*1e3;if(!this.pausePathTracing&&this.enablePathTracing&&this.renderDelay<=c&&!this.isCompiling&&t.update(),t.alpha=t.material.backgroundAlpha!==1||!ro(i),e.alpha=t.alpha,this.renderToCanvas){const l=this._renderer,h=this.minSamples;if(c>=this.renderDelay&&this.samples>=this.minSamples&&(this.fadeDuration!==0?a.material.opacity=Math.min(a.material.opacity+r/this.fadeDuration,1):a.material.opacity=1),!this.enablePathTracing||this.samples<h||a.material.opacity<1){if(this.dynamicLowRes&&!this.isCompiling){e.samples<1&&(e.material=t.material,e.update());const f=a.material.opacity;a.material.opacity=1-a.material.opacity,a.material.map=e.target.texture,a.render(l),a.material.opacity=f}(!this.dynamicLowRes&&this.rasterizeScene||this.dynamicLowRes&&this.isCompiling)&&this.rasterizeSceneCallback(this.scene,this.camera)}this.enablePathTracing&&a.material.opacity>0&&(a.material.opacity<1&&(a.material.blending=this.dynamicLowRes?ns:br),a.material.map=t.target.texture,this.renderToCanvasCallback(t.target,l,a),a.material.blending=st)}}reset(){this._queueReset=!0,this._pathTracer.samples=0}dispose(){this._quad.dispose(),this._quad.material.dispose(),this._pathTracer.dispose()}_updateScale(){if(this.synchronizeRenderSize){this._renderer.getDrawingBufferSize(We);const e=Math.floor(this.renderScale*We.x),t=Math.floor(this.renderScale*We.y);if(this._pathTracer.getSize(We),We.x!==e||We.y!==t){const i=this.lowResScale;this._pathTracer.setSize(e,t),this._lowResPathTracer.setSize(Math.floor(e*i),Math.floor(t*i))}}}}const no=new F(0,1,0);function mo(n,e={}){const t=e.lineRadius??.006,i=e.lineMaterial??new ii({color:e.lineColor??2373039}),s=e.fillMaterial??new ii({color:e.fillColor??e.lineColor??2373039,transparent:!0,opacity:e.fillOpacity??.07,side:pi}),a=!e.lineMaterial,r=!e.fillMaterial,c=new as;let l=null,h=null;function f(){l&&(c.remove(l),l.geometry.dispose(),l=null),h&&(c.remove(h),h.geometry.dispose(),h=null)}function u(m){f();const g=Gr(qr(n,m).tau),y=Math.max(g[1],1e-9),d=g[0],b=1/Math.sqrt(y),p=[b,0],v=[d*b,y*b],x=(p[0]+v[0])/2,T=(p[1]+v[1])/2,w=[[-x,-T],[p[0]-x,p[1]-T],[p[0]+v[0]-x,p[1]+v[1]-T],[v[0]-x,v[1]-T]],S=[],M=new os(t,t,1,12,1,!1),I=new F,_=new F,R=new F,A=new F,P=new xr,C=new F,D=new V;for(let ee=0;ee<4;ee++){const ge=w[ee],le=w[(ee+1)%4];I.set(ge[0],ge[1],0),_.set(le[0],le[1],0),R.subVectors(_,I);const oe=R.length()||1e-9;R.divideScalar(oe),P.setFromUnitVectors(no,R),A.addVectors(I,_).multiplyScalar(.5),C.set(1,oe+2*t,1),D.compose(A,P,C),S.push(M.clone().applyMatrix4(D))}M.dispose();const B=ao(S);l=new Rt(B,i),c.add(l);const ae=new be;ae.setAttribute("position",new Z(new Float32Array([w[0][0],w[0][1],0,w[1][0],w[1][1],0,w[2][0],w[2][1],0,w[0][0],w[0][1],0,w[2][0],w[2][1],0,w[3][0],w[3][1],0]),3)),ae.computeVertexNormals(),h=new Rt(ae,s),c.add(h)}function o(){f(),a&&i.dispose(),r&&s.dispose()}return{group:c,draw:u,dispose:o}}function ao(n){const e=Vr(n,!1);return n.forEach(t=>t.dispose()),e.computeBoundingSphere(),e}function Kt(n,e){const t=URL.createObjectURL(n),i=document.createElement("a");i.href=t,i.download=e,i.click(),URL.revokeObjectURL(t)}class po{renderer;scene;camera;controls;pathTracer;mode;_bounces;pathTraceScale;basePixelRatio;_renderScale=1;_saveQuad;_aspect;onModeChange;lastEnvironment=null;materialsDirty=!1;_autosaveEvery=0;_autosaveNext=0;_autosaveName="render";running=!1;_exporting=!1;constructor(e={}){const t=e.container??document.body;this._bounces=e.bounces??5,this.mode=e.mode??"webgl",this.onModeChange=e.onModeChange;const i=e.pixelRatio??Math.min(window.devicePixelRatio,2);this.basePixelRatio=i,this.pathTraceScale=e.pathTraceScale??1/i,this._aspect=e.aspect,this.renderer=new cs({antialias:!0,preserveDrawingBuffer:!0}),this.renderer.setPixelRatio(i),this.renderer.toneMapping=ls,t.appendChild(this.renderer.domElement),this.applyAspectStyle(),this.scene=new Tr,this.camera=new zr(45,1,.01,100),this.camera.position.set(2.6,1.8,3),this.camera.fStop=1e5,this.applySize(),this.controls=new us(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.addEventListener("change",()=>{this.mode==="pathtracing"&&this.pathTracer?.updateCamera()}),window.addEventListener("resize",this.onResize)}add(e){this.scene.add(e),this.notifySceneChanged()}frame(e,t={}){const s=new ne().setFromObject(e).getBoundingSphere(new fs),a=s.radius||1,r=this.camera.fov*Math.PI/180,c=t.distance??a/Math.sin(r/2)*1.1,l=(t.direction?t.direction.clone():new F().subVectors(this.camera.position,this.controls.target)).normalize();this.controls.target.copy(s.center),this.camera.position.copy(s.center).addScaledVector(l,c),this.camera.updateProjectionMatrix(),this.controls.update(),this.mode==="pathtracing"&&this.pathTracer?.updateCamera()}start(){if(this.running)return;this.running=!0;const e=()=>{this.running&&(this.controls.update(),this.render(),requestAnimationFrame(e))};requestAnimationFrame(e)}stop(){this.running=!1}render(){if(!this._exporting)if(this.mode==="pathtracing"&&this.pathTracer){if(this.lastEnvironment!==this.scene.environment&&(this.pathTracer.updateEnvironment(),this.lastEnvironment=this.scene.environment,this.resetAccumulation()),this.materialsDirty&&(this.pathTracer.updateMaterials(),this.materialsDirty=!1,this.resetAccumulation()),this.pathTracer.renderSample(),this._autosaveEvery>0&&this.pathTracer.samples>=this._autosaveNext){const e=Math.floor(this.pathTracer.samples);this._autosaveNext+=this._autosaveEvery,this.screenshot(`${this._autosaveName}-${e}spp.png`)}}else this.renderer.render(this.scene,this.camera)}get samples(){return this.mode==="pathtracing"&&this.pathTracer?this.pathTracer.samples:0}get bounces(){return this._bounces}setBounces(e){this._bounces=Math.max(1,Math.round(e)),this.pathTracer&&(this.pathTracer.bounces=this._bounces,this.resetAccumulation())}get aspect(){return this._aspect}setAspect(e){this._aspect=e&&e>0?e:void 0,this.applyAspectStyle(),this.applySize(),this.mode==="pathtracing"&&this.pathTracer?.updateCamera()}applyAspectStyle(){const e=this.renderer.domElement;this._aspect?(e.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%)",document.body.style.background="#1a1a1a"):(e.style.cssText="",document.body.style.background="")}viewportSize(){const e=window.innerWidth,t=window.innerHeight;if(!this._aspect)return{w:e,h:t};let i=e,s=Math.round(e/this._aspect);return s>t&&(s=t,i=Math.round(t*this._aspect)),{w:i,h:s}}applySize(){const{w:e,h:t}=this.viewportSize();this.renderer.setSize(e,t),this.camera.aspect=e/t,this.camera.updateProjectionMatrix()}applyTiles(){if(!this.pathTracer)return;const e=new Y;this.renderer.getDrawingBufferSize(e);const t=this.pathTracer.renderScale,i=e.x*t*e.y*t,s=Math.max(1,Math.ceil(Math.sqrt(i/12e5)));this.pathTracer.tiles.set(s,s)}setResolutionScale(e){const t=this.clampMult(e);if(t<e){const i=this.predictRenderSize(e);console.warn(`[studio] ${e}× exceeds GPU limits; rendering at ${t}× (${i.width}×${i.height}) instead.`)}this._renderScale=t,this.pathTracer&&(this.pathTracer.renderScale=this.pathTraceScale*t,this.applyTiles(),this.pathTracer.reset())}clampMult(e){const t=this.renderer.capabilities.maxTextureSize||8192,{w:i,h:s}=this.viewportSize(),a=this.basePixelRatio*this.pathTraceScale,r=Math.max(i,s)*a,c=Math.floor(t/r),l=1e8,h=i*s*a*a,f=Math.floor(Math.sqrt(l/h));return Math.max(1,Math.min(e,c,f))}renderSize(){if(this.mode==="pathtracing"&&this.pathTracer){const t=this.pathTracer.target;return{width:t.width,height:t.height}}const e=new Y;return this.renderer.getDrawingBufferSize(e),{width:Math.round(e.x),height:Math.round(e.y)}}predictRenderSize(e){const t=this.clampMult(e),{w:i,h:s}=this.viewportSize(),a=this.basePixelRatio*this.pathTraceScale;return{width:Math.round(i*a*t),height:Math.round(s*a*t)}}screenshot(e="render.png"){this.mode==="pathtracing"&&this.pathTracer?this.savePathTraceTarget(e):this.renderer.domElement.toBlob(t=>t&&Kt(t,e),"image/png")}savePathTraceTarget(e){const t=this.pathTracer.target,i=t.width,s=t.height,a=this.readbackSRGB(t.texture,i,s),r=document.createElement("canvas");r.width=i,r.height=s;const c=r.getContext("2d"),l=c.createImageData(i,s),h=i*4;for(let f=0;f<s;f++)l.data.set(a.subarray((s-1-f)*h,(s-f)*h),f*h);c.putImageData(l,0,0),r.toBlob(f=>f&&Kt(f,e),"image/png")}readbackSRGB(e,t,i){const s=this._saveQuad??=new Ce(new nt({uniforms:{map:{value:null},toneMappingExposure:{value:1}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
        uniform sampler2D map; varying vec2 vUv;
        #include <tonemapping_pars_fragment>
        void main() {
          gl_FragColor = linearToOutputTexel( vec4( ACESFilmicToneMapping( texture2D( map, vUv ).rgb ), 1.0 ) );
        }`})),a=s.material;a.uniforms.map.value=e,a.uniforms.toneMappingExposure.value=this.renderer.toneMappingExposure;const r=new $e(t,i,{depthBuffer:!1,stencilBuffer:!1});r.texture.colorSpace=hs;const c=this.renderer.getRenderTarget();this.renderer.setRenderTarget(r),s.render(this.renderer),this.renderer.setRenderTarget(c);const l=new Uint8Array(t*i*4);return this.renderer.readRenderTargetPixels(r,0,0,t,i,l),r.dispose(),l}exportSize(e){const{w:t,h:i}=this.viewportSize(),s=this.basePixelRatio*this.pathTraceScale,a=Math.max(1,Math.round(e));return{width:Math.round(t*s*a),height:Math.round(i*s*a)}}async saveTiled(e){const{width:t,height:i,spp:s}=e,a=e.filename??"render.png",r=this.renderer.capabilities.maxTextureSize||8192,c=Math.max(256,Math.min(e.tile??2048,r));this.pathTracer||this.enablePathTracing();const l=this.pathTracer,h=this.renderer.getSize(new Y),f=this.renderer.getPixelRatio(),u=l.renderScale,o=l.tiles.clone(),m=this.camera.aspect,g=l.renderToCanvas,y=this.mode==="pathtracing";this._exporting=!0;try{this.mode="pathtracing",this.camera.aspect=t/i,this.renderer.setPixelRatio(1),this.renderer.setSize(c,c,!1),l.renderScale=1,l.tiles.set(1,1),l.renderToCanvas=!1,l.setScene(this.scene,this.camera);const d=document.createElement("canvas");d.width=t,d.height=i;const b=d.getContext("2d"),p=document.createElement("canvas");p.width=c,p.height=c;const v=p.getContext("2d"),x=Math.ceil(t/c),T=Math.ceil(i/c),w=x*T,S=c*4;for(let M=0;M<T;M++)for(let I=0;I<x;I++){const _=I*c,R=M*c;for(this.camera.setViewOffset(t,i,_,R,c,c),this.camera.updateProjectionMatrix(),l.updateCamera(),l.reset();l.samples<s;)l.renderSample(),Math.floor(l.samples)%8===0&&(e.onProgress?.({tile:M*x+I,tiles:w,samples:l.samples,spp:s}),await new Promise(B=>requestAnimationFrame(()=>B(null))));const A=this.readbackSRGB(l.target.texture,c,c),P=v.createImageData(c,c);for(let B=0;B<c;B++)P.data.set(A.subarray((c-1-B)*S,(c-B)*S),B*S);v.putImageData(P,0,0);const C=Math.min(c,t-_),D=Math.min(c,i-R);b.drawImage(p,0,0,C,D,_,R,C,D),e.onProgress?.({tile:M*x+I+1,tiles:w,samples:l.samples,spp:s}),await new Promise(B=>requestAnimationFrame(()=>B(null)))}await new Promise(M=>d.toBlob(I=>{I&&Kt(I,a),M()},"image/png"))}finally{this.camera.clearViewOffset(),this.camera.aspect=m,this.camera.updateProjectionMatrix(),this.renderer.setPixelRatio(f),this.renderer.setSize(h.x,h.y,!0),l.renderScale=u,l.tiles.copy(o),l.renderToCanvas=g,l.setScene(this.scene,this.camera),this._exporting=!1,y||this.enableWebGL(),this.resetAccumulation()}}enablePathTracing(){this.pathTracer||(this.pathTracer=new so(this.renderer),this.pathTracer.bounces=this._bounces),this.pathTracer.renderScale=this.pathTraceScale*this._renderScale,this.mode="pathtracing",this.pathTracer.setScene(this.scene,this.camera),this.applyTiles(),this.pathTracer.updateMaterials(),this.scene.environment&&this.pathTracer.updateEnvironment(),this.lastEnvironment=this.scene.environment,this.onModeChange?.("pathtracing")}enableWebGL(){this.mode="webgl",this.onModeChange?.("webgl")}toggleMode(){return this.mode==="pathtracing"?this.enableWebGL():this.enablePathTracing(),this.mode}isPathTracing(){return this.mode==="pathtracing"}resetAccumulation(){this.pathTracer?.reset(),this._autosaveNext=this._autosaveEvery}setAutosave(e,t="render"){this._autosaveEvery=Math.max(0,Math.floor(e)),this._autosaveName=t.replace(/\.png$/i,""),this._autosaveNext=this._autosaveEvery}notifyMaterialsChanged(){this.materialsDirty=!0}notifySceneChanged(){this.mode==="pathtracing"&&this.pathTracer&&(this.pathTracer.setScene(this.scene,this.camera),this.pathTracer.updateMaterials(),this.scene.environment&&this.pathTracer.updateEnvironment())}onResize=()=>{this.applySize(),this.mode==="pathtracing"&&(this.pathTracer?.updateCamera(),this.applyTiles())};dispose(){this.stop(),window.removeEventListener("resize",this.onResize),this.controls.dispose(),this._saveQuad?.dispose(),this.pathTracer?.dispose(),this.renderer.dispose()}}export{po as S,mo as m};
