import { writeFileSync } from 'node:fs';
const P = {
  A:{xy:[0,0], v:1}, B:{xy:[1,0], v:4},            // pinned
  C:{xy:[0.30,1.70], v:3}, D:{xy:[1.95,0.75], v:6} // free (clearly different slopes)
};
P.E={xy:[(P.A.xy[0]+P.C.xy[0])/2,(P.A.xy[1]+P.C.xy[1])/2],v:2};
P.F={xy:[(P.B.xy[0]+P.D.xy[0])/2,(P.B.xy[1]+P.D.xy[1])/2],v:5};
const s=180, ox=92, oy=372, W=772, H=470;
const X=mx=>ox+s*mx, Y=my=>oy-s*my;
const sx=p=>X(p.xy[0]).toFixed(1), sy=p=>Y(p.xy[1]).toFixed(1);
const BLUE="#1f5fd0", ORANGE="#d04f1f", RED="#c0392b", BLACK="#111";
let o=[];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">`);
o.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
o.push(`<line x1="${X(-0.35)}" y1="${Y(0)}" x2="${X(2.05)}" y2="${Y(0)}" stroke="#c9ced9" stroke-width="1.6" stroke-dasharray="6 6"/>`);
const seg=(p,q,col)=>o.push(`<line x1="${sx(p)}" y1="${sy(p)}" x2="${sx(q)}" y2="${sy(q)}" stroke="${col}" stroke-width="3.6" stroke-linecap="round"/>`);
seg(P.A,P.C,BLUE); seg(P.B,P.D,ORANGE);
const pinned=p=>o.push(`<circle cx="${sx(p)}" cy="${sy(p)}" r="15" fill="${BLACK}" stroke="#fff" stroke-width="2"/><text x="${sx(p)}" y="${sy(p)}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${p.v}</text>`);
const free=p=>o.push(`<circle cx="${sx(p)}" cy="${sy(p)}" r="13" fill="${RED}" stroke="#fff" stroke-width="2"/><text x="${sx(p)}" y="${sy(p)}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${p.v}</text>`);
const mid=(p,col)=>o.push(`<circle cx="${sx(p)}" cy="${sy(p)}" r="11" fill="#fff" stroke="${col}" stroke-width="3"/><text x="${sx(p)}" y="${sy(p)}" font-size="13" font-weight="700" fill="${col}" text-anchor="middle" dominant-baseline="central">${p.v}</text>`);
mid(P.E,BLUE); mid(P.F,ORANGE); pinned(P.A); pinned(P.B); free(P.C); free(P.D);
o.push(`<text x="${X(0)}" y="${Y(0)+30}" font-size="13" fill="#333" text-anchor="middle">(0, 0)</text>`);
o.push(`<text x="${X(1)}" y="${Y(0)+30}" font-size="13" fill="#333" text-anchor="middle">(1, 0)</text>`);
o.push(`<text x="40" y="26" font-size="15" fill="#333">Planar base of the tent scaffold (type 7): two pinned–free segments split at their midpoints.</text>`);
const lx=520; let yy=150;
const row=(draw,txt)=>{o.push(draw); o.push(`<text x="${lx+22}" y="${yy}" font-size="12.5" fill="#333" dominant-baseline="central">${txt}</text>`); yy+=27;};
row(`<circle cx="${lx}" cy="${yy}" r="8" fill="${BLACK}" stroke="#fff" stroke-width="1.6"/>`,`pinned&#160;&#160;v1, v4&#160;&#160;(fixed)`);
row(`<circle cx="${lx}" cy="${yy}" r="8" fill="${RED}" stroke="#fff" stroke-width="1.6"/>`,`free&#160;&#160;v3, v6&#160;&#160;(2 params each)`);
row(`<circle cx="${lx}" cy="${yy}" r="7" fill="#fff" stroke="#777" stroke-width="2.4"/>`,`midpoint&#160;&#160;v2, v5&#160;&#160;(determined)`);
o.push(`<text x="${lx-8}" y="${yy+4}" font-size="12" fill="#777" dominant-baseline="central">+ tent poles v0, v7 lift out of plane (z &#8800; 0)</text>`);
o.push(`</svg>`);
writeFileSync('docs/figures/ds-base-config.svg', o.join('\n'));
console.log('wrote docs/figures/ds-base-config.svg');
