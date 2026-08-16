const cursor = document.getElementById('cursor');
let mx=0,my=0,cx=0,cy=0;
window.addEventListener('mousemove',(e)=>{mx=e.clientX;my=e.clientY;});
function loop(){
    cx += (mx-cx)*.2;
    cy += (my-cy)*.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
}
loop();

document.querySelectorAll('a, button, .field, .tab-btn').forEach(el=>{
    el.addEventListener('mouseenter',()=>cursor.classList.add('hover'));
    el.addEventListener('mouseleave',()=>cursor.classList.remove('hover'));
});

window.addEventListener('load', ()=>{
    setTimeout(()=>{
    document.getElementById('intro').classList.add('hide');
    document.querySelector('.lanyard').classList.add('drop-in');
    },900);
});

const typedPhrases = ["Junior Developer", "Fresh Graduate", "Happy coding!"];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typedLine = document.getElementById('typedLine');

function typeLoop(){
    const currentPhrase = typedPhrases[phraseIndex];

    charIndex += isDeleting ? -1 : 1;
    typedLine.innerHTML = currentPhrase.slice(0, charIndex) + '<span class="cur"></span>';

    let delay = isDeleting ? 40 : 70;

    if(!isDeleting && charIndex === currentPhrase.length){
        isDeleting = true;
        delay = 1200; // pause here so it's readable before erasing
    } else if(isDeleting && charIndex === 0){
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % typedPhrases.length;
        delay = 300; // small breath before the next word starts typing
    }

    setTimeout(typeLoop, delay);
}

setTimeout(typeLoop, 1200);

const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
        const delay = Number(entry.target.dataset.delay)||0;
        if(entry.isIntersecting){
            setTimeout(()=>entry.target.classList.add('active'),delay);
        }
    });
},{threshold:.2});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn=>{
    btn.addEventListener('click',()=>{
        tabBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
        document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
});

/*==========================
CLOTH LANYARD SIMULATION
==========================*/

const canvas = document.getElementById('clothCanvas');
const ctx = canvas.getContext('2d');
const idCard = document.getElementById('idCard');

// build one small tile of a diagonal weave pattern, then repeat it like real fabric
const strapImg = new Image();
strapImg.src = 'images/strap.jpg'; // your real strap photo goes here
let weavePattern = null;
strapImg.onload = () => {
    weavePattern = ctx.createPattern(strapImg, 'repeat');
};

const COLS = 2;           // strap width = 2 points wide
const ROWS = 26;          // strap length = 24 points tall
const SPACING = 16;       // rest distance between rows (px)
const GRAVITY = 0.4;
const DAMPING = 0.90;
const CONSTRAINT_ITER = 12; // how many times per frame we resolve the cloth — higher = stiffer fabric

const anchorX = canvas.width / 2;
const anchorY = 4;

// the canvas just got much bigger so it can contain the full drag range —
// this shifts it left so the anchor still lands at the same on-screen spot as before
const anchorVisualX = 70; // where the anchor used to sit when canvas was 140px wide
const CANVAS_OFFSET_X = anchorVisualX - anchorX;
canvas.style.left = CANVAS_OFFSET_X + 'px';

let points = [];
let constraints = [];

// build the grid of points
for(let row=0; row<ROWS; row++){
    for(let col=0; col<COLS; col++){
        points.push({
            x: anchorX + (col===0 ? -17 : 17),
            y: anchorY + row*SPACING,
            oldx: anchorX + (col===0 ? -17 : 17),
            oldy: anchorY + row*SPACING,
            pinned: row===0   // top row is pinned in place — that's the clip
        });
    }
}

function idx(col,row){ return row*COLS+col; }

// connect points with constraints (this is what makes it behave like fabric, not a loose swarm of dots)
for(let row=0; row<ROWS; row++){
    for(let col=0; col<COLS; col++){
        if(row<ROWS-1) constraints.push({a:idx(col,row), b:idx(col,row+1), len:SPACING, stiffness:1});
        if(col<COLS-1) constraints.push({a:idx(col,row), b:idx(col+1,row), len:34, stiffness:1});
    }
}
for(let row=0; row<ROWS-1; row++){
    constraints.push({a:idx(0,row), b:idx(1,row+1), len:Math.hypot(34,SPACING)});
    constraints.push({a:idx(1,row), b:idx(0,row+1), len:Math.hypot(34,SPACING)});
}

// bending constraints — link every point to the one two rows below it.
// this is what stops sharp accordion-folds; a plain structural constraint
// only cares about immediate neighbors, so it has no opinion about a sudden kink.
for(let row=0; row<ROWS-2; row++){
    constraints.push({a:idx(0,row), b:idx(0,row+2), len:SPACING*2, stiffness:0.5});
    constraints.push({a:idx(1,row), b:idx(1,row+2), len:SPACING*2, stiffness:0.5});
}

let dragging = false;
let dragX = 0, dragY = 0;

function updatePoints(){
    const MAX_SPEED = 20; // px per frame — caps how fast any single point can move
    points.forEach(p=>{
        if(p.pinned) return;
        let vx = (p.x - p.oldx) * DAMPING;
        let vy = (p.y - p.oldy) * DAMPING;
        const speed = Math.hypot(vx,vy);
        if(speed > MAX_SPEED){
            vx = (vx/speed) * MAX_SPEED;
            vy = (vy/speed) * MAX_SPEED;
        }
        p.oldx = p.x;
        p.oldy = p.y;
        p.x += vx;
        p.y += vy + GRAVITY;
    });
}

function satisfyConstraints(){
    for(let n=0; n<CONSTRAINT_ITER; n++){
        constraints.forEach(c=>{
            const p1 = points[c.a], p2 = points[c.b];
            const dx = p2.x-p1.x, dy = p2.y-p1.y;
            const dist = Math.hypot(dx,dy) || 0.0001;
            const diff = ((dist - c.len) / dist) * (c.stiffness || 1);
            const offX = dx*0.5*diff, offY = dy*0.5*diff;
            if(!p1.pinned){ p1.x += offX; p1.y += offY; }
            if(!p2.pinned){ p2.x -= offX; p2.y -= offY; }
        });
        if(dragging){
            const bl = points[idx(0,ROWS-1)], br = points[idx(1,ROWS-1)];
            bl.x = dragX-17; bl.y = dragY;
            br.x = dragX+17; br.y = dragY;
        }
    }
}

function lerp(a,b,t){
    return { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t };
}

function drawCloth(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!weavePattern) return; // image hasn't loaded yet — skip this frame rather than crash
    

    for(let row=0; row<ROWS-1; row++){
        const p1=points[idx(0,row)], p2=points[idx(1,row)], p3=points[idx(1,row+1)], p4=points[idx(0,row+1)];

        // clip to just this segment, so the fills below only paint inside it
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y);
        ctx.closePath();
        ctx.clip();

        // woven fabric texture
        ctx.fillStyle = weavePattern;
        ctx.fillRect(0,0,canvas.width,canvas.height);

        // sheen: shadow at the edges, light down the middle
        const grad = ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);
        grad.addColorStop(0,   'rgba(0,0,0,.45)');
        grad.addColorStop(0.5, 'rgba(255,255,255,.15)');
        grad.addColorStop(1,   'rgba(0,0,0,.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,canvas.width,canvas.height);

        ctx.restore(); // lifts the clip

        // stitched edges
        ctx.setLineDash([2,3]);
        ctx.strokeStyle = 'rgba(255,255,255,.2)';
        ctx.lineWidth = 1;
        const s1 = lerp(p1,p2,0.15), e1 = lerp(p4,p3,0.15);
        ctx.beginPath(); ctx.moveTo(s1.x,s1.y); ctx.lineTo(e1.x,e1.y); ctx.stroke();
        const s2 = lerp(p1,p2,0.85), e2 = lerp(p4,p3,0.85);
        ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.lineTo(e2.x,e2.y); ctx.stroke();
        ctx.setLineDash([]);
    }

    // printed label running down the strap
    ctx.fillStyle = 'rgba(230,225,215,.5)';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for(let row=1; row<ROWS-1; row+=3){
        const left = points[idx(0,row)], right = points[idx(1,row)], next = points[idx(0,row+1)];
        const cx = (left.x+right.x)/2, cy = (left.y+right.y)/2;
        const angle = Math.atan2(next.y-left.y, next.x-left.x) + Math.PI/2;
        ctx.save();
        ctx.translate(cx,cy);
        ctx.rotate(angle);
        ctx.fillText('DEV', 0, 0);
        ctx.restore();
    }
}

function getCardAngle(){
    const bl = points[idx(0,ROWS-1)], br = points[idx(1,ROWS-1)];
    let angle = Math.atan2(br.y-bl.y, br.x-bl.x);
    const MAX_TILT = 1.0; // radians, ~57° each direction — swaying, never flipping
    return Math.max(-MAX_TILT, Math.min(MAX_TILT, angle));
}

function positionCard(){
    const bl = points[idx(0,ROWS-1)], br = points[idx(1,ROWS-1)];
    const cx = (bl.x+br.x)/2, cy = (bl.y+br.y)/2;
    const angle = getCardAngle();
    idCard.style.transform = `translate(${cx+CANVAS_OFFSET_X-idCard.offsetWidth/2}px, ${cy}px) rotate(${angle}rad)`;
}

function loopCloth(){
    updatePoints();
    satisfyConstraints();
    drawCloth();
    drawClip();
    positionCard();
    requestAnimationFrame(loopCloth);
}
loopCloth();

function drawClip(){
    const bl = points[idx(0,ROWS-1)], br = points[idx(1,ROWS-1)];
    const cx = (bl.x+br.x)/2, cy = (bl.y+br.y)/2;
    const angle = getCardAngle();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // metal body — a small gradient rectangle for a brushed-metal look
    const grad = ctx.createLinearGradient(-9, 0, 9, 0);
    grad.addColorStop(0, '#2e2e2e');
    grad.addColorStop(0.5, '#9a9a9a');
    grad.addColorStop(1, '#2e2e2e');
    ctx.fillStyle = grad;
    ctx.fillRect(-9, -8, 18, 16);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-9, -8, 18, 16);

    // the ring loop, sitting just above the clip body
    ctx.beginPath();
    ctx.arc(0, -11, 5, 0, Math.PI*2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a7a7a';
    ctx.stroke();

    ctx.restore();
}

// dragging — grab the card itself, works with mouse and touch
function getXY(e){
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX-rect.left, y: t.clientY-rect.top };
}
function startDrag(e){
    dragging = true;
    idCard.classList.add('dragging');
    const p = getXY(e); dragX=p.x; dragY=p.y;
    e.preventDefault();
}
function moveDrag(e){
    if(!dragging) return;
    const p = getXY(e);

    // clamp how far the card can be pulled from the anchor point —
    // this is what stops it stretching infinitely
    const dx = p.x - anchorX;
    const dy = p.y - anchorY;
    const dist = Math.hypot(dx,dy);
    const maxReach = (ROWS-1)*SPACING + 40; // full strap length + a little give

    if(dist > maxReach){
        const scale = maxReach/dist;
        dragX = anchorX + dx*scale;
        dragY = anchorY + dy*scale;
    } else {
        dragX = p.x;
        dragY = p.y;
    }
}
function endDrag(){
    dragging = false;
    idCard.classList.remove('dragging');
}
idCard.addEventListener('mousedown', startDrag);
idCard.addEventListener('touchstart', startDrag, {passive:false});
window.addEventListener('mousemove', moveDrag);
window.addEventListener('touchmove', moveDrag, {passive:false});
window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click',()=>{
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menuToggle.classList.remove('open');
    navLinks.classList.remove('open');
}));

const sections = document.querySelectorAll('section[id]');
const navA = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll',()=>{
    let current='';
    sections.forEach(s=>{
        const top = s.offsetTop-140;
        if(window.scrollY>=top && window.scrollY<top+s.offsetHeight) current = s.id;
    });
    navA.forEach(a=>{
        a.classList.toggle('active', a.getAttribute('href')===`#${current}`);
    });
    const stb = document.getElementById('scrollTopBtn');
    stb.classList.toggle('show', window.scrollY>500);
});

document.getElementById('scrollTopBtn').addEventListener('click',()=>{
    window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cName').value;
    const email = document.getElementById('cEmail').value;
    const msg = document.getElementById('cMessage').value;
    const statusEl = document.getElementById('formStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    try {
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                access_key: 'b55eadcf-284e-434e-8b39-97d9db894f21',
                name, email, message: msg,
                subject: `Portfolio inquiry from ${name}`
            })
        });
        const data = await res.json();
        if (data.success) {
            statusEl.textContent = "Message sent — I'll get back to you soon.";
            statusEl.classList.add('success');
            e.target.reset();
        } else {
            throw new Error(data.message || 'Something went wrong');
        }
    } catch (err) {
        statusEl.textContent = "Couldn't send that — try emailing me directly instead.";
        statusEl.classList.add('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
    }
});

/* ============================================
   THEME TOGGLE
   ============================================ */
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const htmlEl      = document.documentElement;

function applyTheme(theme){
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeIcon.textContent = theme === 'light' ? '☀' : '☾';
}

themeToggle.addEventListener('click', (e) => {
    const next = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';

    // fallback for browsers without View Transitions (e.g. older Safari/Firefox)
    if(!document.startViewTransition){
        document.body.classList.add('theme-fade-fallback');
        applyTheme(next);
        return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        applyTheme(next);
    });

    transition.ready.then(() => {
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`
                ]
            },
            {
                duration: 650,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    });
});

/* ============================================
   PROJECTS SLIDER
   ============================================ */
const slides       = document.querySelectorAll('#projectsSlider .slide');
const prevBtn      = document.getElementById('prevProject');
const nextBtn      = document.getElementById('nextProject');
const currentEl    = document.getElementById('currentSlide');
const totalEl      = document.getElementById('totalSlides');
const dotsContainer= document.getElementById('sliderDots');

let currentIndex = 0;
const totalSlides = slides.length;

totalEl.textContent = String(totalSlides).padStart(2,'0');

// Build dots
slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to project ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll('.slider-dot');

function updateSlider(){
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentIndex);
    });
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });
    currentEl.textContent = String(currentIndex + 1).padStart(2,'0');
    
    // Optional: disable buttons at ends (remove if you want infinite loop)
    // prevBtn.disabled = currentIndex === 0;
    // nextBtn.disabled = currentIndex === totalSlides - 1;
}

function nextSlide(){
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider();
}

function prevSlide(){
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateSlider();
}

function goToSlide(index){
    currentIndex = index;
    updateSlider();
}

nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if(!document.getElementById('tab-projects').classList.contains('active')) return;
    if(e.key === 'ArrowRight') nextSlide();
    if(e.key === 'ArrowLeft') prevSlide();
});