/**
 * LIGHTVERSE: SYSTEM 3000 (TURKISH FINAL)
 */

const App = {
    view: 'home',
    init: () => {
        // SETTINGS LOAD
        Settings.load();

        // MONITOOR BOOT SEQUENCE
        const screen = document.getElementById('intro-screen');
        setTimeout(() => {
            screen.style.transition = 'opacity 0.8s ease';
            screen.style.opacity = 0;
            setTimeout(() => {
                screen.style.display = 'none';
                App.go('home');
                Audio.play('startup');
            }, 800);
        }, 3200);

        Lab.init();
        Audio.init();

        document.addEventListener('click', () => Audio.play('click'));
        document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => App.go(btn.dataset.nav)));

        App.loop();
    },
    go: (id) => {
        // Transition effect
        document.querySelectorAll('.view-section').forEach(el => {
            el.style.opacity = 0;
            setTimeout(() => {
                el.classList.add('hidden');
                el.classList.remove('grid', 'flex');
            }, 300);
        });

        setTimeout(() => {
            const t = document.getElementById(`view-${id}`);
            if (t) {
                t.classList.remove('hidden');
                if (id === 'home') t.classList.add('grid'); else t.classList.add('flex');

                // Trigger reflow
                void t.offsetWidth;
                t.style.opacity = 1;

                App.view = id;
                if (id === 'lab') Lab.resize();
                if (id === 'quiz') Quiz.init();
            }
        }, 300);
    },
    loop: () => {
        requestAnimationFrame(App.loop);
        if (App.view === 'lab') Lab.render();
    }
};

const Settings = {
    state: {
        theme: 'default',
        quality: 1 // 0: Low, 1: Medium, 2: Ultra
    },
    load: () => {
        const s = localStorage.getItem('lightverse_settings');
        if (s) Settings.state = JSON.parse(s);
        Settings.apply();
        // Update input
        document.querySelector(`#settings-modal input[type=range]`).value = Settings.state.quality;
    },
    save: () => {
        localStorage.setItem('lightverse_settings', JSON.stringify(Settings.state));
    },
    apply: () => {
        document.body.setAttribute('data-theme', Settings.state.theme);
        // Canvas pixel ratio adjustment based on quality could go here
    },
    toggle: () => {
        document.getElementById('settings-modal').classList.toggle('open');
    },
    setTheme: (t) => {
        Settings.state.theme = t;
        Settings.apply();
        Settings.save();
        Audio.play('hover');
    },
    setQuality: (q) => {
        Settings.state.quality = parseInt(q);
        Settings.save();
    }
};

const Audio = {
    ctx: null,
    init: () => { try { const A = window.AudioContext || window.webkitAudioContext; Audio.ctx = new A(); } catch (e) { } },
    play: (t) => {
        if (!Audio.ctx) return;
        const c = Audio.ctx, n = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        if (t === 'click') {
            o.frequency.setValueAtTime(800, n);
            g.gain.setValueAtTime(0.05, n);
            o.start(n); o.stop(n + 0.05);
        }
        if (t === 'hover') {
            o.frequency.setValueAtTime(300, n);
            g.gain.setValueAtTime(0.02, n);
            o.start(n); o.stop(n + 0.05);
        }
        if (t === 'startup') {
            o.frequency.setValueAtTime(200, n); o.frequency.exponentialRampToValueAtTime(800, n + 0.5);
            g.gain.setValueAtTime(0.1, n); g.gain.linearRampToValueAtTime(0, n + 1.5);
            o.start(n); o.stop(n + 1.5);
        }
    }
};

const Lab = {
    canvas: null, ctx: null, mode: 'absorption', state: {}, drag: null,
    init: () => {
        Lab.canvas = document.getElementById('lab-canvas'); Lab.ctx = Lab.canvas.getContext('2d');
        const cvs = Lab.canvas;
        const pos = e => { const r = cvs.getBoundingClientRect(); return { x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top } };

        cvs.addEventListener('mousedown', e => { Lab.down(pos(e)); Audio.play('hover'); });
        cvs.addEventListener('touchstart', e => { e.preventDefault(); Lab.down(pos(e)); Audio.play('hover'); }, { passive: false });

        window.addEventListener('mousemove', e => { if (Lab.drag) Lab.move(pos(e)) });
        window.addEventListener('touchmove', e => { if (Lab.drag) { e.preventDefault(); Lab.move(pos(e)) } }, { passive: false });

        window.addEventListener('mouseup', () => Lab.drag = null);
        window.addEventListener('touchend', () => Lab.drag = null);

        // Window resize handler
        window.addEventListener('resize', Lab.resize);

        Lab.setMode('absorption');
    },
    resize: () => {
        if (Lab.canvas && Lab.canvas.parentElement) {
            Lab.canvas.width = Lab.canvas.parentElement.clientWidth;
            Lab.canvas.height = Lab.canvas.parentElement.clientHeight;
        }
    },
    reset: () => {
        Lab.setMode(Lab.mode); // Re-init current mode to defaults
        Audio.play('click');
    },
    snapshot: () => {
        const link = document.createElement('a');
        link.download = `Lightverse_Lab_${Date.now()}.png`;
        link.href = Lab.canvas.toDataURL();
        link.click();
    },
    setMode: (m) => {
        Lab.mode = m;
        const w = Lab.canvas.width;
        const h = Lab.canvas.height;
        const cx = w / 2; const cy = h / 2;

        // LOCALIZED UI LABELS & DEFAULTS
        if (m === 'absorption') {
            Lab.state = { sx: 100, sy: cy, bx: cx, by: cy - 50, pow: 80, temp: 20, col: '#1e293b' };
            Lab.buildUI([
                { type: 'slider', l: 'IŞIK ŞİDDETİ', k: 'pow', min: 0, max: 100 },
                { type: 'select', l: 'MALZEME RENGİ', k: 'col', o: [{ l: 'SİYAH (Mat)', v: '#020617' }, { l: 'GRİ', v: '#475569' }, { l: 'BEYAZ (Yansıtıcı)', v: '#ffffff' }, { l: 'KIRMIZI', v: '#ef4444' }, { l: 'MAVİ', v: '#3b82f6' }] }
            ]);
        }
        if (m === 'mirrors') {
            Lab.state = { lx: 100, ly: cy, mx: cx + 100, type: 'plane', rot: 0 };
            Lab.buildUI([
                { type: 'btn', l: 'AYNA TİPİ', k: 'type', o: [{ l: 'DÜZ', v: 'plane' }, { l: 'ÇUKUR', v: 'concave' }, { l: 'TÜMSEK', v: 'convex' }] },
                { type: 'slider', l: 'DÖNDÜRME AÇISI', k: 'rot', min: -45, max: 45 }
            ]);
        }
        if (m === 'lenses') {
            Lab.state = { lx: 100, ly: cy, mx: cx, type: 'thin' };
            Lab.buildUI([
                { type: 'btn', l: 'MERCEK TİPİ', k: 'type', o: [{ l: 'İNCE KENAR', v: 'thin' }, { l: 'KALIN KENAR', v: 'thick' }] }
            ]);
        }
        if (m === 'prism') { Lab.state = { lx: 100, ly: cy, px: cx, py: cy }; Lab.buildUI([]); }
        if (m === 'shadows') { Lab.state = { lx: 100, ly: cy, ox: cx, oy: cy, d: 50 }; Lab.buildUI([{ type: 'slider', l: 'CİSİM BOYUTU', k: 'd', min: 20, max: 100 }]); }
        if (m === 'mixing') { Lab.state = { r: 255, g: 0, b: 0 }; Lab.buildUI([{ type: 'slider', l: 'KIRMIZI', k: 'r', min: 0, max: 255 }, { type: 'slider', l: 'YEŞİL', k: 'g', min: 0, max: 255 }, { type: 'slider', l: 'MAVİ', k: 'b', min: 0, max: 255 }]); }

        document.querySelectorAll('.lab-btn').forEach(b => {
            if (b.dataset.mode === m) b.classList.add('active'); else b.classList.remove('active');
        });
    },
    buildUI: (cfg) => {
        const p = document.getElementById('lab-controls'); p.innerHTML = '';
        cfg.forEach(c => {
            const w = document.createElement('div'); w.className = 'mb-6';

            // Label
            w.innerHTML = `
                <div class="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest mb-3 opacity-60">
                    <span>${c.l}</span>
                    <span id="v-${c.k}" class="text-sky-500">${Lab.state[c.k] !== undefined && !String(Lab.state[c.k]).startsWith('#') ? Lab.state[c.k] : ''}</span>
                </div>`;

            if (c.type === 'slider') {
                const i = document.createElement('input'); i.type = 'range'; i.min = c.min; i.max = c.max; i.value = Lab.state[c.k]; i.className = 'w-full';
                i.oninput = e => {
                    Lab.state[c.k] = Number(e.target.value);
                    const valDisplay = document.getElementById(`v-${c.k}`);
                    if (valDisplay) valDisplay.innerText = e.target.value;
                };
                w.appendChild(i);
            }
            if (c.type === 'btn') {
                const g = document.createElement('div'); g.className = 'flex flex-wrap gap-2';
                c.o.forEach(o => {
                    const b = document.createElement('button');
                    b.innerText = o.l;
                    b.className = `flex-1 py-3 px-2 border border-slate-500/30 text-[9px] font-bold opacity-70 hover:opacity-100 hover:bg-white/5 hover:border-sky-500/50 transition rounded ${Lab.state[c.k] === o.v ? 'bg-white/10 border-sky-500 text-sky-400' : ''}`;
                    b.onclick = (e) => {
                        // Visual update
                        Array.from(g.children).forEach(btn => btn.className = btn.className.replace('bg-white/10 border-sky-500 text-sky-400', ''));
                        e.target.classList.add('bg-white/10', 'border-sky-500', 'text-sky-400');
                        Lab.state[c.k] = o.v
                    };
                    g.appendChild(b);
                });
                w.appendChild(g);
            }
            if (c.type === 'select') {
                const s = document.createElement('select'); s.className = 'w-full bg-white/5 border border-slate-500/30 text-xs p-3 rounded font-bold opacity-80 outline-none focus:border-sky-500 transition cursor-pointer';
                c.o.forEach(o => { const opt = document.createElement('option'); opt.value = o.v; opt.innerText = o.l; opt.className = 'text-black'; s.appendChild(opt); });
                s.value = Lab.state[c.k];
                s.onchange = e => Lab.state[c.k] = e.target.value;
                w.appendChild(s);
            }
            p.appendChild(w);
        });
    },
    render: () => {
        const c = Lab.ctx, w = Lab.canvas.width, h = Lab.canvas.height;
        c.clearRect(0, 0, w, h);

        // Get computed styles for dynamic colors
        const style = getComputedStyle(document.body);
        const gridCol = style.getPropertyValue('--grid-color').trim();
        const textMain = style.getPropertyValue('--text-main').trim();
        const brand = style.getPropertyValue('--brand-primary').trim();

        // Grid
        c.strokeStyle = gridCol;
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < w; i += 50) { c.moveTo(i, 0); c.lineTo(i, h); }
        for (let i = 0; i < h; i += 50) { c.moveTo(0, i); c.lineTo(w, i); }
        c.stroke();

        const s = Lab.state;

        if (Lab.mode === 'absorption') {
            const heat = (1 - (parseInt(s.col.substring(1), 16) / 0xFFFFFF)) * (s.pow / 100);
            s.temp = Math.max(20, Math.min(100, s.temp + heat - ((s.temp - 20) * 0.05)));

            Draw.beam(c, s.sx, s.sy, s.bx + 50, s.by + 50, `rgba(245, 158, 11, ${s.pow / 100})`);
            Draw.dev(c, s.sx, s.sy, '#f59e0b');

            c.fillStyle = s.col;
            c.fillRect(s.bx, s.by, 100, 100);
            c.strokeStyle = textMain; c.lineWidth = 2;
            c.strokeRect(s.bx, s.by, 100, 100);

            // Heat indicator
            Draw.txt(c, s.bx + 50, s.by - 20, `${s.temp.toFixed(1)}°C`);
            const heatColor = s.temp > 50 ? '#ef4444' : '#10b981';
            c.fillStyle = heatColor;
            c.fillRect(s.bx, s.by + 105, (s.temp - 20) * 1.25, 4);
        }
        else if (Lab.mode === 'prism') {
            Draw.dev(c, s.lx, s.ly, textMain);
            c.strokeStyle = textMain; c.lineWidth = 2; c.beginPath(); c.moveTo(s.lx, s.ly); c.lineTo(s.px, s.ly); c.stroke();
            const cl = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
            cl.forEach((co, i) => {
                c.strokeStyle = co; c.lineWidth = 3; c.beginPath();
                c.moveTo(s.px, s.ly);
                c.lineTo(w, (s.ly - 100) + (i * 60));
                c.stroke();
            });
            c.fillStyle = 'rgba(255, 255, 255, 0.1)'; c.strokeStyle = brand; c.lineWidth = 2;
            c.beginPath(); c.moveTo(s.px, s.ly - 70); c.lineTo(s.px + 70, s.ly + 70); c.lineTo(s.px - 70, s.ly + 70); c.fill(); c.stroke();
        }
        else if (Lab.mode === 'shadows') {
            Draw.dev(c, s.lx, s.ly, '#f59e0b');

            // Object
            c.fillStyle = textMain; c.beginPath(); c.arc(s.ox, s.oy, s.d || 50, 0, 7); c.fill();

            // Screen
            c.fillStyle = '#000'; c.fillRect(w - 20, 0, 20, h);

            const sc = (w - 20 - s.lx) / (s.ox - s.lx);
            const hS = (s.d || 50) * 2 * sc;
            const yS = s.ly + (s.oy - s.ly) * sc;

            // Shadow on screen
            c.fillStyle = 'rgba(0,0,0,0.8)';
            c.fillRect(w - 20, yS - hS / 2, 20, hS);

            // Rays
            c.strokeStyle = 'rgba(255, 255, 255, 0.2)'; c.lineWidth = 1; c.setLineDash([5, 5]);
            c.beginPath();
            c.moveTo(s.lx, s.ly); c.lineTo(w - 20, yS - hS / 2);
            c.moveTo(s.lx, s.ly); c.lineTo(w - 20, yS + hS / 2);
            c.stroke();
            c.setLineDash([]);
        }
        else if (Lab.mode === 'mixing') {
            const mx = w / 2; const my = h / 2;
            c.fillStyle = '#111'; c.fillRect(mx - 250, my - 200, 500, 400);
            c.globalCompositeOperation = 'screen';
            const sp = (x, y, cl) => { const g = c.createRadialGradient(x, y, 0, x, y, 150); g.addColorStop(0, cl); g.addColorStop(1, '#000'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 150, 0, 7); c.fill(); }
            sp(mx, my - 50, `rgb(${s.r},0,0)`); sp(mx - 60, my + 60, `rgb(0,${s.g},0)`); sp(mx + 60, my + 60, `rgb(0,0,${s.b})`);
            c.globalCompositeOperation = 'source-over';
        }
        else {
            // Mirrors & Lenses
            const col = Lab.mode === 'mirrors' ? '#ef4444' : '#10b981';
            const cy = h / 2;

            Draw.dev(c, s.lx, s.ly, col);
            c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(s.lx, s.ly); c.lineTo(s.mx, s.ly);

            if (Lab.mode === 'mirrors') {
                if (s.type === 'plane') {
                    // Reflection logic simplified
                    const dy = cy - s.ly;
                    c.lineTo(0, s.ly + dy * 2);
                } else if (s.type === 'concave') {
                    c.lineTo(0, cy + (cy - s.ly) * -0.5);
                } else {
                    c.lineTo(0, cy + (cy - s.ly) * -2);
                }
            } else {
                // Lens refraction logic simplified
                if (s.type === 'thin') c.lineTo(w, cy + (cy - s.ly) * -0.8);
                else c.lineTo(w, s.ly + (s.ly - cy) * 1.5);
            }
            c.stroke();

            if (Lab.mode === 'mirrors') Draw.mir(c, s.mx, cy, s.type, s.rot); else Draw.lens(c, s.mx, cy, s.type);
        }
    },
    down: ({ x, y }) => {
        const s = Lab.state, h = (X, Y) => Math.hypot(x - X, y - Y) < 60;
        if (Lab.mode === 'absorption') { if (h(s.sx, s.sy)) Lab.drag = 's'; if (h(s.bx + 50, s.by + 50)) Lab.drag = 'b'; }
        else if (Lab.mode === 'mirrors') { if (h(s.lx, s.ly)) Lab.drag = 'l'; if (h(s.mx, Lab.canvas.height / 2)) Lab.drag = 'm'; }
        else if (Lab.mode === 'lenses') { if (h(s.lx, s.ly)) Lab.drag = 'l'; if (h(s.mx, Lab.canvas.height / 2)) Lab.drag = 'm'; }
        else if (Lab.mode === 'prism') { if (h(s.lx, s.ly)) Lab.drag = 'l'; if (h(s.px, s.py)) Lab.drag = 'p'; }
        else if (Lab.mode === 'shadows') { if (h(s.lx, s.ly)) Lab.drag = 'l'; if (h(s.ox, s.oy)) Lab.drag = 'o'; }
    },
    move: ({ x, y }) => {
        const s = Lab.state;
        if (Lab.drag === 's') { s.sx = x; s.sy = y }
        if (Lab.drag === 'l') { s.lx = x; s.ly = y }
        if (Lab.drag === 'm') s.mx = x;
        if (Lab.drag === 'p') { s.px = x; s.py = y }
        if (Lab.drag === 'b') { s.bx = x - 50; s.by = y - 50 }
        if (Lab.drag === 'o') { s.ox = x; s.oy = y }
    }
};

const Quiz = {
    init: () => { Quiz.curr = 0; Quiz.score = 0; Quiz.render(); },
    curr: 0, score: 0,
    // Expanded Question Pool
    data: [
        { q: "Işık enerjisi madde ile etkileşince neye dönüşür?", o: ["Isı Enerjisi", "Ses Enerjisi", "Hareket Enerjisi", "Nükleer Enerji"], a: 0 },
        { q: "Kışın neden koyu renkli kıyafetler tercih edilir?", o: ["Güzel göründüğü için", "Işığı yansıttığı için", "Işığı soğurup ısındığı için", "Daha ucuz olduğu için"], a: 2 },
        { q: "Açık renkli cisimler ışığı ne yapar?", o: ["Soğurur", "Yansıtır", "Kırar", "Odaklar"], a: 1 },
        { q: "Görüntünün düz ve cisimle aynı boyda olduğu ayna hangisidir?", o: ["Çukur Ayna", "Tümsek Ayna", "Düzlem Ayna", "Mercek"], a: 2 },
        { q: "Diş hekimleri ağız içini görmek için hangi aynayı kullanır?", o: ["Düzlem Ayna", "Çukur Ayna", "Tümsek Ayna", "Prizma"], a: 1 },
        { q: "Mağazalarda güvenlik kamerası yerine kullanılan ayna türü nedir?", o: ["Tümsek Ayna", "Çukur Ayna", "Düzlem Ayna", "Hiçbiri"], a: 0 }
    ],
    render: () => {
        const c = document.getElementById('quiz-mount');
        // Certificate Screen
        if (Quiz.curr >= Quiz.data.length) {
            const dStr = new Date().toLocaleDateString('tr-TR');
            c.innerHTML = `
            <div class="cert-box text-center bg-white p-12 shadow-2xl relative max-w-2xl w-full border-4 border-slate-900">
                <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMCwwLDAsMC4wMykiIHN0cm9rZS13aWR0aD0iMSI+PHBhdGggZD0iTTAgMEw0MCA0ME00MCAwTDAgNDAiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>
                <div class="relative z-10">
                     <div class="flex justify-center mb-6 text-red-600 text-6xl">
                         <i class="fa-solid fa-ribbon drop-shadow-lg"></i>
                     </div>
                     <div class="font-mono text-[10px] tracking-[0.4em] text-slate-400 mb-2 uppercase">RESMİ BELGE NO: TR-${Math.floor(Math.random() * 10000)}</div>
                     <h1 class="text-5xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tighter">SİMÜLASYON</h1>
                     <h2 class="text-xl font-light text-slate-500 tracking-[0.3em] mb-10 uppercase">BAŞARI SERTİFİKASI</h2>
                     
                     <p class="text-base text-slate-700 max-w-lg mx-auto mb-10 leading-relaxed font-serif italic">
                         Bu belge, <strong class="text-black not-italic">Lightverse Eğitim Sistemleri</strong> tarafından düzenlenen 7. Sınıf Fizik Simülasyon Programı'nı başarıyla tamamlayan öğrenciye verilmiştir.
                     </p>
                     
                     <div class="grid grid-cols-2 gap-8 border-t-2 border-slate-900 pt-8 mt-8 text-left">
                         <div>
                             <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">BAŞARI PUANI</div>
                             <div class="text-6xl font-black text-slate-900">${Math.min(100, Math.round((Quiz.score / 25) * 100 / 6))}</div>
                         </div>
                         <div class="text-right">
                              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ONAY TARİHİ</div>
                              <div class="text-xl font-bold text-slate-900 uppercase">${dStr}</div>
                              <div class="w-24 h-px bg-slate-900 ml-auto mt-8"></div>
                              <div class="text-[8px] uppercase mt-1 text-slate-400">YETKİLİ İMZA</div>
                         </div>
                     </div>
                     <button onclick="App.go('home')" class="mt-12 px-10 py-4 bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-lg">SİSTEMİ KAPAT</button>
                </div>
            </div>`;
            return;
        }

        // Question Screen
        const d = Quiz.data[Quiz.curr];
        c.innerHTML = `
        <div class="glass-panel w-full max-w-3xl p-10 rounded-2xl shadow-xl animate-fade-in">
             <div class="flex justify-between items-end border-b border-slate-500/20 pb-4 mb-8">
                 <div class="font-mono text-xs font-bold opacity-50 uppercase tracking-widest">SORU ${Quiz.curr + 1} / ${Quiz.data.length}</div>
                 <div class="font-black text-xl text-sky-500">${Quiz.score} PUAN</div>
             </div>
             <h2 class="text-3xl font-bold mb-10 leading-tight">${d.q}</h2>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 ${d.o.map((o, i) => `
                 <button onclick="Quiz.check(${i},this)" class="p-5 border border-slate-500/20 bg-white/5 hover:bg-sky-500/10 hover:border-sky-500 transition text-left text-sm font-bold opacity-80 hover:opacity-100 uppercase tracking-wide rounded-lg flex items-center">
                    <span class="w-6 h-6 rounded-full border border-slate-500/50 mr-3 flex items-center justify-center text-[10px]">${String.fromCharCode(65 + i)}</span>
                    ${o}
                 </button>`).join('')}
             </div>
        </div>`;
    },
    check: (i, b) => {
        const d = Quiz.data[Quiz.curr];
        const allBtns = b.parentElement.children;
        Array.from(allBtns).forEach(btn => btn.disabled = true);

        if (i === d.a) {
            b.classList.remove('bg-white/5', 'border-slate-500/20');
            b.classList.add('bg-green-500/20', 'border-green-500', 'text-green-500');
            b.querySelector('span').classList.add('bg-green-500', 'text-white', 'border-transparent');
            Quiz.score += 25;
            Audio.play('success'); // Placeholder if sound existed
        } else {
            b.classList.remove('bg-white/5', 'border-slate-500/20');
            b.classList.add('bg-red-500/20', 'border-red-500', 'text-red-500');
            b.querySelector('span').classList.add('bg-red-500', 'text-white', 'border-transparent');

            // Highlight correct answer
            const correctBtn = allBtns[d.a];
            correctBtn.classList.add('bg-green-500/20', 'border-green-500', 'text-green-500');
        }
        setTimeout(() => { Quiz.curr++; Quiz.render(); }, 1200);
    }
}

const Draw = {
    txt: (c, x, y, t) => {
        c.font = "bold 11px 'JetBrains Mono'";
        c.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
        c.textAlign = 'center';
        c.fillText(t, x, y);
    },
    dev: (c, x, y, col) => {
        c.save(); c.translate(x, y);
        c.fillStyle = '#334155';
        c.fillRect(-12, -10, 24, 20); // Device box
        c.fillStyle = col;
        c.beginPath(); c.arc(12, 0, 4, 0, 7); c.fill(); // Emitter dot
        c.restore();
    },
    beam: (c, ax, ay, bx, by, col) => {
        c.save();
        c.strokeStyle = col;
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.shadowBlur = 10;
        c.shadowColor = col;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.restore();
    },
    mir: (c, x, y, t, r) => {
        c.save(); c.translate(x, y); c.rotate(r * Math.PI / 180);
        // Mirror body
        c.fillStyle = 'rgba(148, 163, 184, 0.3)';
        c.fillRect(-4, -70, 8, 140);
        // Reflective surface
        c.strokeStyle = '#38bdf8'; c.lineWidth = 3; c.shadowBlur = 15; c.shadowColor = '#38bdf8';
        c.beginPath();
        if (t === 'plane') { c.moveTo(0, -60); c.lineTo(0, 60); }
        else if (t === 'concave') { c.arc(-40, 0, 70, -0.6, 0.6); }
        else { c.arc(40, 0, 70, Math.PI - 0.6, Math.PI + 0.6); }
        c.stroke(); c.restore();
    },
    lens: (c, x, y, t) => {
        c.save();
        c.fillStyle = 'rgba(14, 165, 233, 0.15)';
        c.strokeStyle = '#0ea5e9'; c.lineWidth = 2;
        c.shadowBlur = 10; c.shadowColor = 'rgba(14, 165, 233, 0.5)';
        c.beginPath();
        if (t === 'thin') c.ellipse(x, y, 8, 70, 0, 0, 7);
        else {
            c.moveTo(x, y - 70);
            c.quadraticCurveTo(x - 25, y, x, y + 70);
            c.quadraticCurveTo(x + 25, y, x, y - 70);
        }
        c.fill(); c.stroke();
        c.restore();
    }
};

window.onload = App.init;
