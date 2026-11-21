(function () {
  try {
    const colors = ['#f4c430', '#14a098', '#e0457b'];
    const shapes = [
      '<path d="M7 24 Q5 9 17 7 L37 9 Q44 12 40 26 Q37 33 14 31 Q8 30 7 24Z"/>',
      '<path d="M8 22 Q9 13 16 13 L37 14 Q41 16 39 23 L34 27 L12 27Z"/>',
      '<path d="M8 23 Q8 8 23 7 Q39 7 41 20 Q39 30 25 31 Q11 31 8 23Z"/>',
      '<path d="M9 10 Q15 7 20 14 L25 14 Q31 7 37 10 L40 25 Q34 32 27 26 L20 26 Q14 32 8 25Z"/>',
      '<path d="M5 19 Q6 14 11 14 L35 14 Q41 14 42 19 L40 25 L8 25Z"/>'
    ];
    function svgHold(i, color) {
      return '<svg viewBox="0 0 48 38" aria-hidden="true"><defs><linearGradient id="hg' + i + '" x2="0" y2="1"><stop stop-color="' + color + '"/><stop offset="1" stop-color="' + color + '" stop-opacity=".72"/></linearGradient></defs><g fill="url(#hg' + i + ')" stroke="#15171a" stroke-width="1.4">' + shapes[i % 5] + '</g><ellipse cx="24" cy="19" rx="2.5" ry="2" fill="#17191c"/><path d="M12 12 Q22 5 34 11" fill="none" stroke="#fffefa" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>';
    }
    const wallSelectors = '.hero, .project-header';
    function overlaps(a, b, margin) {
      return a.left < b.right + margin && a.right > b.left - margin && a.top < b.bottom + margin && a.bottom > b.top - margin;
    }
    function decorateWall(wall) {
      let layer = wall.querySelector(':scope > .boulder-holds');
      if (!layer) {
        layer = document.createElement('div'); layer.className = 'boulder-holds'; layer.setAttribute('aria-hidden', 'true');
        wall.insertBefore(layer, wall.firstChild);
      }
      const w = wall.clientWidth, h = wall.clientHeight;
      const phone = innerWidth <= 390;
      const holdW = phone ? 30 : 46, holdH = phone ? 25 : 38;
      const obstacleEls = Array.from(wall.querySelectorAll('header,nav,.social-links,h1,h2,p,a,button,.tag,.meta-tag,.hero-cloud,.hero-cloud-panel,[role="button"]'));
      if (wall.classList.contains('hero')) obstacleEls.push(...document.querySelectorAll('header,nav'));
      const rail = document.querySelector('.route-rail');
      if (rail && innerWidth >= 1024 && getComputedStyle(rail).display !== 'none') obstacleEls.push(rail);
      const obstacles = Array.from(new Set(obstacleEls))
        .filter(el => !layer.contains(el)).map(el => { const rect=el.getBoundingClientRect(); if(el===rail && innerWidth>=1024)return {el,rect:{left:rect.left-16,top:rect.top-16,right:rect.right+16,bottom:rect.bottom+16}}; return {el,rect}; });
      const isHero = wall.classList.contains('hero');
      const count = phone ? 4 : innerWidth < 768 ? 5 : 10;
      const points = [];
      let tries = 0;
      if (isHero && phone) {
        const left = wall.getBoundingClientRect().left, top = wall.getBoundingClientRect().top;
        const candidates = [[4,11],[w-holdW-4,11],[Math.max(4,(w-holdW)/2),11],[Math.max(4,(w-holdW)/2),h-holdH+22],[4,h-holdH+22],[w-holdW-4,h-holdH+22]];
        candidates.forEach(([x,y],i)=>{ if(points.length>=4)return; const box={left:left+x,top:top+y,right:left+x+holdW,bottom:top+y+holdH}; if(obstacles.some(({el,rect:o})=>overlaps(box,o,el.matches('header,nav')?10:5))||points.some(p=>Math.abs(p.x-x)<holdW+5&&Math.abs(p.y-y)<holdH+4))return; points.push({x,y,color:i===0?'#f4c430':colors[i%3]}); });
      }
      if (isHero && innerWidth >= 768) {
        // Zig-zag fits the margin left of the hero copy; holds shrink a little on narrow margins.
        const wallLeft = wall.getBoundingClientRect().left;
        const contentLeft = Math.min(...obstacles.filter(({el})=>wall.contains(el)&&!el.matches('header,nav')).map(({rect})=>rect.left), wallLeft+w) - wallLeft;
        const rw = Math.min(46, contentLeft - 30), rh = Math.round(rw*38/46), amp = Math.min(16, (contentLeft - 10 - rw)/2);
        const routeCount = rw >= 30 ? 6 : 0, zig = [-1,1,-.8,1,-.9,.85], tilt = [-8,6,-4,9,-6,5];
        for (let i=0;i<routeCount;i++) {
          const x = Math.round(4 + amp + zig[i]*amp), y = h - 70 - i * Math.max(42, Math.min(58, (h-150)/routeCount));
          const box = {left:wallLeft+x,top:wall.getBoundingClientRect().top+y,right:wallLeft+x+rw,bottom:wall.getBoundingClientRect().top+y+rh};
          const blocked=obstacles.some(({el,rect:o})=>{
            if (el.matches('header,nav')) return overlaps(box,o,48);
            if (el.matches('.social-links') || el.closest('.social-links')) return box.left<o.right && box.right>o.left && box.top<o.bottom+56 && box.bottom>o.top;
            return overlaps(box,o,6);
          });
          if (!blocked) points.push({x,y,color:'#f4c430',route:true,rot:tilt[i],w:rw,h:rh});
        }
      }
      const cloud = isHero && innerWidth >= 768 ? wall.querySelector('.hero-cloud') : null;
      const maxX = cloud && cloud.offsetWidth ? cloud.getBoundingClientRect().right - wall.getBoundingClientRect().left - holdW : Infinity;
      const maxY = points.some(p=>p.route) ? Math.min(...points.filter(p=>p.route).map(p=>p.y)) - 45 : Infinity;
      const fill = maxY < Infinity ? points.length + 2 : count; // at most two off-route holds beside the yellow problem
      while (points.length < fill && tries++ < count * 100) {
        const x = 6 + Math.random() * Math.max(1, w - holdW - 12), y = 6 + Math.random() * Math.max(1, h - holdH - 12);
        const box = {left: wall.getBoundingClientRect().left + x, top: wall.getBoundingClientRect().top + y, right: wall.getBoundingClientRect().left + x + holdW, bottom: wall.getBoundingClientRect().top + y + holdH};
        if (x > maxX || y > maxY || obstacles.some(({el,rect:o}) => overlaps(box, o, el.matches('header,nav')?48:8)) || points.some(p => Math.abs(p.x-x)<55 && Math.abs(p.y-y)<45)) continue;
        points.push({x,y,color:phone && points.length===0?'#f4c430':undefined});
      }
      layer.replaceChildren();
      const groups = 3, per = Math.ceil(points.length / groups);
      points.forEach((p, i) => {
        const problem = p.route ? 0 : Math.min(groups - 1, Math.floor(i / per)), color = p.color || colors[problem];
        const el = document.createElement('span'); el.className = 'boulder-hold'; el.dataset.color=color; el.style.color=color; if(phone){el.style.width=holdW+'px';el.style.height=holdH+'px';} if(p.w){el.style.width=p.w+'px';el.style.height=p.h+'px';} if(p.rot)el.style.transform='rotate('+p.rot+'deg)'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.innerHTML = svgHold(i, color); layer.appendChild(el);
      });
      layer.querySelectorAll('.boulder-hold').forEach(hold=>{
        const box=hold.getBoundingClientRect();
        const blocked=obstacles.some(({el,rect})=>overlaps(box,rect,0));
        if(blocked) hold.remove();
      });
      layer.querySelectorAll('.boulder-hold').forEach(hold=>{
        hold.addEventListener('pointerenter',()=>layer.querySelectorAll('.boulder-hold').forEach(other=>{other.classList.toggle('is-lit',other.dataset.color===hold.dataset.color);other.classList.toggle('is-dim',other.dataset.color!==hold.dataset.color);}));
        hold.addEventListener('pointerleave',()=>layer.querySelectorAll('.boulder-hold').forEach(other=>other.classList.remove('is-lit','is-dim')));
      });
      // Tape marks anchor each color's low hold and its highest hold.
      for (let g=0; g<groups; g++) {
        const members = points.map((p,i)=>({p,i})).filter(v=>v.p.route ? g===0 : Math.min(groups-1,Math.floor(v.i/per))===g);
        if (!members.length) continue;
        const low = members.reduce((a,b)=>a.p.y>b.p.y?a:b), high = members.reduce((a,b)=>a.p.y<b.p.y?a:b);
        if (g===0 && isHero && members.some(v=>v.p.route)) { const lowRoute=members.filter(v=>v.p.route).reduce((a,b)=>a.p.y>b.p.y?a:b); [0,1].forEach(j=>{const tape=document.createElement('i');tape.className='problem-tape';tape.style.cssText='position:absolute;left:'+(lowRoute.p.x+(j?18:2))+'px;top:'+(lowRoute.p.y+34)+'px;width:16px;height:5px;background:#f4c430;transform:rotate('+(j?12:-12)+'deg)';layer.appendChild(tape);}); }
      }
    }
    function installField(wall) {
      if (wall.nextElementSibling && wall.nextElementSibling.classList.contains('climb-strip')) return;
      const strip=document.createElement('div'); strip.className='climb-strip'; strip.setAttribute('aria-hidden','true');
      strip.innerHTML=`<svg class="climb-scene" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="granite" x2=".9" y2="1"><stop stop-color="#aaa396"/><stop offset=".5" stop-color="#77746d"/><stop offset="1" stop-color="#454947"/></linearGradient><radialGradient id="lichen"><stop stop-color="#a7aa83"/><stop offset="1" stop-color="#a7aa83" stop-opacity="0"/></radialGradient></defs><path class="ground" d="M0 174Q80 166 160 174t160 0 160 0 160 0 160 0 200 0v26H0Z"/><g class="grass"><path d="M28 178l-5-17m8 17 8-13m10 13-1-19m62 17-6-12m12 12 7-18m295 18-4-16m9 16 8-13m512 13-6-18m12 18 10-14"/></g>
      <g class="rock"><path class="crag" d="M120 174 132 94 158 67 180 30 218 17 245 27 278 54 314 66 350 111 365 174Z"/><path class="facet lit" d="m132 94 26-27 22-37 38-13 27 10-18 39-40 25-48 24Z"/><path class="facet mid" d="m245 27 33 27 36 12 36 45-43-1-36-34-42-18Z"/><path class="facet shade" d="m314 66 36 45 15 63h-62l4-53-36-36Z"/><path class="facet mid" d="m180 126 48-31 42 18 39 48-1 13H165Z"/><path class="crack" d="m227 29 7 34-19 23 5 31m50-65-12 22 16 17m-90-29-7 24 14 17"/><g class="lichen"><circle cx="172" cy="84" r="18"/><circle cx="282" cy="125" r="15"/><circle cx="250" cy="49" r="10"/></g><g class="chalk-hold"><ellipse cx="181" cy="103" rx="12" ry="6"/><path d="m177 101 3-9m6 12 5-8"/><ellipse cx="230" cy="69" rx="11" ry="5"/><path d="m225 68 2-8m7 10 4-7"/><ellipse cx="277" cy="103" rx="12" ry="5"/><path d="m274 102 2-8m6 10 5-7"/><ellipse cx="326" cy="129" rx="11" ry="5"/><path d="m322 128 2-7m7 9 4-6"/></g></g>
      <g class="rock"><path class="crag" d="M550 174 562 125 590 111 614 90 652 99 680 79 714 90 737 112 777 121 795 174Z"/><path class="facet lit" d="m562 125 28-14 24-21 38 9 28-20 34 11-20 28-49 13-39 17-58 0Z"/><path class="facet shade" d="m714 90 23 22 40 9 18 53h-68l-7-40-26-16Z"/><path class="facet mid" d="m614 147 49-16 46 3 18 40H590Z"/><path class="facet shade" d="m590 111 24-21-7 57-17 27h-40l12-49Z"/><path class="crack" d="m680 81-8 29 12 18-6 28m-91-40 18 9-4 19m136-22-15 12 8 19"/><g class="lichen"><circle cx="624" cy="119" r="15"/><circle cx="745" cy="143" r="14"/><circle cx="698" cy="101" r="9"/></g><g class="chalk-hold"><ellipse cx="595" cy="143" rx="11" ry="5"/><path d="m592 142 2-7m7 9 4-6"/><ellipse cx="650" cy="120" rx="12" ry="5"/><path d="m646 119 2-8m7 9 4-6"/><ellipse cx="705" cy="137" rx="12" ry="5"/><path d="m701 136 3-8m6 10 4-6"/><ellipse cx="757" cy="132" rx="10" ry="5"/><path d="m754 131 2-7m6 9 4-6"/></g></g>
      <g class="pad"><path d="M105 169h270v20H105zM530 169h280v20H530z"/><path d="M105 170h270m-270 8h270m-270 8h270M530 170h280m-280 8h280m-280 8h280"/><path class="strap" d="M152 169v20m165-20v20m-25-20v20m-165-20v20m438-20v20m170-20v20"/></g>
      <g class="climber climber-one"><g class="person"><circle class="head" cx="192" cy="85" r="8"/><path class="torso" d="M190 94q10-2 14 7l-4 20-16-2-2-17Z"/><g class="limb arm-a"><path d="M190 99l-12 7-8-9"/><circle class="joint" cx="178" cy="106" r="2.5"/></g><g class="limb arm-b"><path d="M200 100l13-12 17-19"/><circle class="joint" cx="213" cy="88" r="2.5"/></g><g class="limb leg-a"><path d="M185 118l-12 13-1 15"/><circle class="joint" cx="173" cy="131" r="2.5"/></g><g class="limb leg-b"><path d="M198 120l12 9 8 12"/><circle class="joint" cx="210" cy="129" r="2.5"/></g><path class="waistbag" d="m202 137 4 0 0 5-4 0z"/></g></g><circle class="chalk-puff" cx="250" cy="28" r="11"/>
      <g class="climber climber-two"><g class="person"><circle class="head" cx="650" cy="121" r="7"/><path class="torso" d="M647 129q9-2 13 6l-4 18-15-2-2-15Z"/><g class="limb arm-a"><path d="M648 133l-13-7-8-10"/><circle class="joint" cx="635" cy="126" r="2.5"/></g><g class="limb arm-b"><path d="M657 134l12-8 14 11"/><circle class="joint" cx="669" cy="126" r="2.5"/></g><g class="limb leg-a"><path d="M642 150l-12 10-2 9"/><circle class="joint" cx="630" cy="160" r="2.5"/></g><g class="limb leg-b"><path d="M655 151l13 7 8 10"/><circle class="joint" cx="668" cy="158" r="2.5"/></g><path class="waistbag" d="m633 150 4 0 0 5-4 0z"/></g></g><circle class="chalk-puff second-puff" cx="726" cy="70" r="10"/><g class="climb-hits"><rect class="climb-hit" x="150" y="50" width="125" height="105"/><rect class="climb-hit" x="585" y="65" width="120" height="100"/></g></svg>`;
      const routeHolds=[[[195,113],[207,101],[219,89],[231,77]],[[626,126],[638,114],[650,102],[662,90]]];
      strip.querySelectorAll('.chalk-hold').forEach((group,index)=>{
        group.replaceChildren();
        routeHolds[index].forEach(([x,y])=>{
          const hold=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
          hold.setAttribute('cx',x);hold.setAttribute('cy',y);hold.setAttribute('rx','5');hold.setAttribute('ry','3');group.appendChild(hold);
          const tick=document.createElementNS('http://www.w3.org/2000/svg','path');
          tick.setAttribute('d',`M${x-2} ${y-1}l2-4m2 5 3-4`);group.appendChild(tick);
        });
      });
      wall.insertAdjacentElement('afterend',strip);
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const climbers=Array.from(strip.querySelectorAll('.climber'));
      const profiles=[
        {period:10000,frames:[
          {t:0,hip:[204,128],hands:[[195,113],[207,101]],feet:[[198,140],[210,140]]},
          {t:.25,hip:[216,116],hands:[[207,101],[219,89]],feet:[[210,128],[222,128]]},
          {t:.5,hip:[228,104],hands:[[219,89],[231,77]],feet:[[222,116],[234,116]]},
          {t:.75,hip:[216,116],hands:[[207,101],[219,89]],feet:[[210,128],[222,128]]},
          {t:1,hip:[204,128],hands:[[195,113],[207,101]],feet:[[198,140],[210,140]]}]},
        {period:13000,frames:[
          {t:0,hip:[635,141],hands:[[626,126],[638,114]],feet:[[629,153],[641,153]]},
          {t:.25,hip:[647,129],hands:[[638,114],[650,102]],feet:[[641,141],[653,141]]},
          {t:.5,hip:[659,117],hands:[[650,102],[662,90]],feet:[[653,129],[665,129]]},
          {t:.75,hip:[647,129],hands:[[638,114],[650,102]],feet:[[641,141],[653,141]]},
          {t:1,hip:[635,141],hands:[[626,126],[638,114]],feet:[[629,153],[641,153]]}]}
      ];
      function solve(person, hip, hands, feet) {
        const torso=person.querySelector('.torso'), head=person.querySelector('.head');
        const hx=hip[0],hy=hip[1];
        torso.setAttribute('d',`M${hx-3} ${hy-15} Q${hx} ${hy-16} ${hx+3} ${hy-15} L${hx+3} ${hy} L${hx-3} ${hy} Z`);
        head.setAttribute('cx',hx); head.setAttribute('cy',hy-21);
        const shoulders=[[hx-3,hy-15],[hx+3,hy-15]], hips=[[hx-3,hy],[hx+3,hy]];
        const waistbag=person.querySelector('.waistbag');
        waistbag.setAttribute('d',`M${hx+1} ${hy-2}h4v5h-4z`);
        function limb(group,start,end,bend) {
          const dx=end[0]-start[0],dy=end[1]-start[1],d=Math.max(1,Math.hypot(dx,dy));
          const l1=group.classList.contains('arm-a')||group.classList.contains('arm-b')?9:10;
          const l2=group.classList.contains('arm-a')||group.classList.contains('arm-b')?8:10;
          const dist=Math.max(.01,Math.min(d,l1+l2-2.1)),along=(l1*l1-l2*l2+dist*dist)/(2*dist),off=Math.sqrt(Math.max(0,l1*l1-along*along));
          const sign=bend,ex=start[0]+dx/d*along-sign*dy/d*off,ey=start[1]+dy/d*along+sign*dx/d*off;
          const path=group.querySelector('path'),joint=group.querySelector('.joint');
          path.setAttribute('d',`M${start[0]} ${start[1]} L${ex} ${ey} L${end[0]} ${end[1]}`);
          joint.setAttribute('cx',ex);joint.setAttribute('cy',ey);
        }
        const groups=Array.from(person.querySelectorAll('.limb'));
        limb(groups[0],shoulders[0],hands[0],-1); limb(groups[1],shoulders[1],hands[1],1);
        limb(groups[2],hips[0],feet[0],1); limb(groups[3],hips[1],feet[1],-1);
      }
      const SEND=1500, lerp=(a,b,f)=>{const vec=(u,v)=>[u[0]+(v[0]-u[0])*f,u[1]+(v[1]-u[1])*f];return {hip:vec(a.hip,b.hip),hands:a.hands.map((v,k)=>vec(v,b.hands[k])),feet:a.feet.map((v,k)=>vec(v,b.feet[k]))};};
      function topOut(p){const t=p.frames[2],hx=t.hip[0]+3,hy=t.hip[1]-8;return {hip:[hx,hy],hands:[[hx-8,hy-28],[hx+8,hy-28]],feet:t.feet.map(([x,y])=>[x,y-4])};}
      function draw(now) {
        climbers.forEach((climber,i)=>{
          const p=profiles[i],phase=(now%p.period)/p.period,frames=p.frames;
          let a=frames[0],b=frames[1];
          for(let n=0;n<frames.length-1;n++) if(phase>=frames[n].t&&phase<=frames[n+1].t){a=frames[n];b=frames[n+1];break;}
          let q=lerp(a,b,(phase-a.t)/(b.t-a.t||1));
          if(climber._send){const k=Math.max(0,now-climber._send);if(k>SEND)climber._send=0;else{const w=Math.min(1,k/300,(SEND-k)/350);q=lerp(q,topOut(p),w*w*(3-2*w));}}
          solve(climber.querySelector('.person'),q.hip,q.hands,q.feet);
        });
        if(!reduced && !strip.classList.contains('paused')) strip._climbFrame=requestAnimationFrame(draw);
      }
      draw(performance.now());
      // Route tags: one robotics highlight from the hero copy, one neutral bouldering note.
      const tips=[['teal','Sent','2nd place \u00d72 \u00b7 Oct 2026 hackathons'],['yellow','Beta','Read the whole problem before the first move']];
      const tip=document.createElement('div');tip.className='route-tip';strip.appendChild(tip);
      let hideTimer=0;
      const hideTip=()=>tip.classList.remove('show');
      function send(i,sticky){
        clearTimeout(hideTimer);
        const [circuit,label,text]=tips[i],b=document.createElement('b');b.textContent=label;tip.replaceChildren(b,text);tip.dataset.circuit=circuit;tip.classList.add('show');
        const r=strip.querySelectorAll('.climb-hit')[i].getBoundingClientRect(),s=strip.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
        const bag=strip.nextElementSibling,maxR=bag&&bag.classList.contains('chalk-bag')?bag.getBoundingClientRect().left-s.left-6:s.width-6; // never under the chalk bag
        let left=r.right-s.left+8; if(left+tw>maxR) left=r.left-s.left-8-tw;
        tip.style.left=Math.max(6,Math.min(maxR-tw,left))+'px'; tip.style.top=Math.max(6,Math.min(s.height-th-24,r.top-s.top-8))+'px';
        if(sticky) hideTimer=setTimeout(hideTip,2600);
        if(reduced||climbers[i]._send) return;
        climbers[i]._send=performance.now();
        const puff=strip.querySelectorAll('.chalk-puff')[i],top=topOut(profiles[i]).hip;
        if(puff&&puff.animate){puff.setAttribute('cx',top[0]);puff.setAttribute('cy',top[1]-34);puff.style.transformBox='fill-box';puff.style.transformOrigin='center';puff.animate([{opacity:0,transform:'scale(.3)'},{opacity:.8,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.9)'}],{duration:700,delay:250,easing:'ease-out'});}
      }
      strip.querySelectorAll('.climb-hit').forEach((hit,i)=>{
        hit.addEventListener('pointerenter',()=>send(i,false));
        hit.addEventListener('pointerleave',()=>{clearTimeout(hideTimer);hideTimer=setTimeout(hideTip,400);});
        hit.addEventListener('click',()=>send(i,true));
      });
      if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const obs=new IntersectionObserver(entries=>entries.forEach(e=>{strip.classList.toggle('paused',!e.isIntersecting);if(e.isIntersecting&&!strip._climbFrame)strip._climbFrame=requestAnimationFrame(draw);if(!e.isIntersecting&&strip._climbFrame){cancelAnimationFrame(strip._climbFrame);strip._climbFrame=0;}}));
        obs.observe(strip);
        document.addEventListener('visibilitychange',()=>strip.classList.toggle('paused',document.hidden || strip.getBoundingClientRect().bottom < 0 || strip.getBoundingClientRect().top > innerHeight));
      }
    }
    document.querySelectorAll(wallSelectors).forEach(w=>{ installField(w); decorateWall(w); });
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>document.querySelectorAll(wallSelectors).forEach(decorateWall)).catch(()=>{});
    document.querySelectorAll('.hero-layout, .project-header > *').forEach(el=>{el.style.position='relative';el.style.zIndex='1';});
    let resizeTimer; addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>document.querySelectorAll(wallSelectors).forEach(decorateWall),140);});
    const bag=document.createElement('button'); bag.type='button'; bag.className='chalk-bag'; bag.setAttribute('aria-label','Chalk up');
    bag.innerHTML='<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M2 28h68v7H2z" fill="#453e35"/><path d="M20 19q16 4 32 0l-3 7q8 8 7 28-1 7-20 7T17 54q-1-21 6-28z" class="bag-fabric"/><path d="M23 29v27M48 29v27" class="bag-seam"/><path d="M18 24q18 8 36 0l-2-7q-16 6-32 0z" class="bag-rim"/><path d="M22 19q14 6 28 0M23 21q13 6 26 0" fill="none" stroke="#fffefa" stroke-width="2" stroke-linecap="round"/><path d="M23 18q13 8 27 0l6 5q-18 9-39 0z" fill="#e6e0d5" stroke="#b9b4aa"/><path d="M25 18q9 5 18 1l5-10" class="bag-detail"/><rect x="46" y="7" width="5" height="7" rx="2" fill="#c6b28e" stroke="#594c3d"/><path d="M20 14V5h5v10" fill="#78634c" stroke="#493d31"/><path d="M19 6h7" stroke="#d4b98f" stroke-width="2"/><path d="M36 13l4-5 4 5" fill="none" stroke="#594c3d" stroke-width="2"/><path d="M21 40q15 6 31 0v13q-16 8-32 0z" fill="#d8d0c2" opacity=".35"/><path d="M48 22l7-2" class="bag-detail"/></svg>';
    const bagSpot=document.querySelector('.climb-strip'); bagSpot ? bagSpot.after(bag) : document.body.appendChild(bag); // sits by the boulders, never over content
    const hand='<svg viewBox="0 0 50 48" aria-hidden="true"><path fill="currentColor" d="M13 25V11q0-4 3-4t3 4v10-15q0-4 3-4t3 4v15-13q0-4 3-4t3 4v14-9q0-4 3-4t3 4v15q0 12-11 16h-7q-7-3-10-10l-4-8q-2-4 1-5t7 7z"/></svg>';
    function burst(x,y) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const haze=document.createElement('i');haze.className='chalk-haze';haze.setAttribute('aria-hidden','true');haze.style.left=(x-80)+'px';haze.style.top=(y-30)+'px';document.body.appendChild(haze);setTimeout(()=>haze.remove(),950);
      for(let i=0;i<28;i++){const p=document.createElement('i');p.className='chalk-particle';p.setAttribute('aria-hidden','true');const size=10+Math.random()*14;p.style.setProperty('--size',size+'px');p.style.width=size+'px';p.style.height=size+'px';const opacity=.55+Math.random()*.2;p.style.opacity=opacity.toFixed(2);p.style.setProperty('--opacity',opacity.toFixed(2));if(size<20)p.style.setProperty('--small','1');p.style.left=x+'px';p.style.top=y+'px';const distance=25+Math.random()*70,angle=(210+Math.random()*40)*Math.PI/180;p.style.setProperty('--dx',(Math.cos(angle)*distance)+'px');p.style.setProperty('--dy',(Math.sin(angle)*distance)+'px');document.body.appendChild(p);setTimeout(()=>p.remove(),950);}
    }
    let chalkedUntil=0;
    bag.addEventListener('click',e=>{const r=bag.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2);chalkedUntil=Date.now()+10000;bag.classList.add('chalked');setTimeout(()=>{if(Date.now()>=chalkedUntil)bag.classList.remove('chalked');},10020);});
    function printAt(x,y){if(Date.now()>chalkedUntil)return;const p=document.createElement('span');p.className='chalk-print';p.setAttribute('aria-hidden','true');p.innerHTML=hand;p.style.left=(x-25)+'px';p.style.top=(y-24)+'px';p.style.setProperty('--rot',(Math.random()*36-18)+'deg');document.body.appendChild(p);setTimeout(()=>p.remove(),4100);}
    document.addEventListener('pointerdown',e=>{if(e.target.closest('.chalk-bag'))return;printAt(e.clientX,e.clientY);});
    document.querySelectorAll('.project-card').forEach(card=>{const sm=document.createElement('span');sm.className='card-smudge';sm.setAttribute('aria-hidden','true');sm.innerHTML=hand;card.appendChild(sm);});
    // Circuit assignments are derived from existing links and labels; no page copy changes.
    const circuitMap={teal:'#14a098',yellow:'#f4c430',coral:'#e0457b',blue:'#245b9e'};
    function setCircuit(el,name,property){if(!name)return;el.dataset.circuit=name;el.style.setProperty(property,circuitMap[name]);}
    document.querySelectorAll('#experience .project-card').forEach(card=>setCircuit(card,'teal','--card-circuit'));
    const projectCircuits=[['underwater-sfm','teal'],['lidar-odometry','teal'],['ekf-localization','blue'],['When Does Convex Bundle Adjustment Fail.pdf','blue'],['skill-gate','coral'],['hyperion-fo','yellow'],['quadruped','yellow'],['craigie-bridge','teal'],['learners-permit','coral'],['mission-preflight','yellow'],['pierside','blue'],['mandate-wallet','blue'],['pulse','coral']];
    document.querySelectorAll('#projects .projects-grid > a').forEach(link=>{const href=link.getAttribute('href')||'';const hit=projectCircuits.find(([key])=>href.includes(key));if(hit){const card=link.querySelector('.project-card');if(card)setCircuit(card,hit[1],'--card-circuit');}});
    const skillMap=[['perception','teal'],['deep learning','coral'],['robotics','yellow'],['programming','blue']];
    document.querySelectorAll('.skills-grid > div').forEach(group=>{const title=(group.querySelector('h3')?.textContent||'').toLowerCase();const hit=skillMap.find(([key])=>title.includes(key));if(hit)setCircuit(group,hit[1],'--skill-circuit');});
    const tagMap=[
      [/(slam|sfm|colmap|lidar|point clouds|kiss-icp|gicp)/,'teal'],
      [/(ros 2|isaac sim|gazebo|mujoco)/,'yellow'],
      [/(pytorch|segmentation|computer vision)/,'coral'],
      [/(c\+\+|python|ekf|ukf|estimation)/,'blue']
    ];
    document.querySelectorAll('.tag').forEach(tag=>{const label=(tag.textContent||'').trim().toLowerCase();const hit=tagMap.find(([re])=>re.test(label));if(hit)setCircuit(tag,hit[1],'--tag-circuit');});
    if(document.getElementById('experience')&&document.getElementById('skills')){
      const rail=document.createElement('nav');rail.className='route-rail';rail.setAttribute('aria-label','Page sections');
      const routes=[['Top',null],['Experience','experience'],['Projects','projects'],['Skills','skills'],['Contact','contact']];
      routes.forEach(([label,id],index)=>{const a=document.createElement('a');a.href=id?'#'+id:'#';a.title=label;a.setAttribute('aria-label',label);a.dataset.route=id||'top';if(index===0)a.setAttribute('aria-current','location');rail.appendChild(a);a.addEventListener('click',event=>{event.preventDefault();const target=id?document.getElementById(id):null;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(target)target.scrollIntoView({behavior:reduce?'instant':'smooth'});else window.scrollTo({top:0,behavior:reduce?'instant':'smooth'});});});document.body.appendChild(rail);
      document.querySelectorAll(wallSelectors).forEach(decorateWall);
      const targets=['experience','projects','skills','contact'].map(id=>document.getElementById(id)).filter(Boolean);
      if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){rail.querySelectorAll('a').forEach(a=>a.removeAttribute('aria-current'));rail.querySelector('[data-route="'+visible.target.id+'"]').setAttribute('aria-current','location');}else if(window.scrollY<innerHeight/2){rail.querySelectorAll('a').forEach(a=>a.removeAttribute('aria-current'));rail.querySelector('[data-route="top"]').setAttribute('aria-current','location');}},{rootMargin:'-15% 0px -55% 0px',threshold:[0,.1,.25,.5]});targets.forEach(target=>observer.observe(target));}
    }
  } catch (_) { /* Theme enhancements must never interrupt the page. */ }
})();
