import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const tags = ['clear', 'IB', 'II', 'III', '1C', '3C', '5C'];
const CROP = 1.8;   // drop stray far points; same cut for every level so they stay comparable (clear: ~1% cut)
const SWAY = .6;    // auto-rotate sways ±35° around the photographers' view instead of spinning to the back
const SIZE = .032;  // ~2.5 px points for the ~5k-point clouds; retune when denser clouds arrive

let disc;
const dot = () => disc ??= (() => { // round points instead of squares
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 15, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
})();

export async function mountCloud(target, { level = 'clear', autoRotate = false, cameras = false } = {}) {
    try {
        const host = typeof target === 'string' ? document.querySelector(target) : target;
        if (!host || !window.WebGLRenderingContext) return null;
        const fallback = host.querySelector('img');
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x101923, 1);
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D point cloud; drag to orbit');
        host.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x101923);
        const camera = new THREE.PerspectiveCamera(42, 1, .01, 100);
        camera.position.set(1.9, 1.2, 2.3);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = .06;
        controls.enablePan = false;
        controls.minDistance = 1.2;
        controls.maxDistance = 8;
        controls.autoRotate = autoRotate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (matchMedia('(pointer: coarse)').matches) { controls.enabled = false; renderer.domElement.style.touchAction = 'pan-y'; } // touch screens: let the page scroll, cloud just auto-rotates
        controls.autoRotateSpeed = .5;
        let base = null;
        const group = new THREE.Group();
        scene.add(group);
        const geometries = new Map();
        const materials = new Map();
        const objects = new Map();
        let active = level;
        let visible = true;
        let disposed = false;
        const resize = () => {
            const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
            renderer.setSize(w, h, false);
            camera.aspect = w / h; camera.updateProjectionMatrix();
        };
        const makeLevel = async (tag) => {
            if (objects.has(tag)) return objects.get(tag);
            const metaRes = await fetch(new URL('meta.json', import.meta.url));
            const meta = await metaRes.json();
            const info = meta.levels.find(x => x.tag === tag);
            if (!info) throw new Error('Unknown cloud level');
            const res = await fetch(new URL(`${tag}.bin`, import.meta.url));
            if (!res.ok) throw new Error('Cloud data unavailable');
            const buffer = await res.arrayBuffer();
            const n = info.points;
            if (buffer.byteLength !== n * 15) throw new Error('Invalid cloud data');
            const floats = new Float32Array(buffer, 0, n * 3);
            const colors = new Uint8Array(buffer, n * 12, n * 3);
            const position = new Float32Array(n * 3), color = new Float32Array(n * 3), mean = new THREE.Vector3();
            let k = 0;
            for (let i = 0; i < n; i++) {
                const x = floats[i * 3], y = floats[i * 3 + 1], z = floats[i * 3 + 2];
                if (x * x + y * y + z * z > CROP * CROP) continue;
                position[k * 3] = x; position[k * 3 + 1] = y; position[k * 3 + 2] = z; mean.x += x; mean.y += y; mean.z += z;
                color[k * 3] = colors[i * 3] / 255; color[k * 3 + 1] = colors[i * 3 + 1] / 255; color[k * 3 + 2] = colors[i * 3 + 2] / 255;
                k++;
            }
            if (base === null && k) { // first level sets the view: look at the cloud from behind its cameras, slightly above
                mean.divideScalar(k);
                const axis = new THREE.Vector3();
                for (const c of info.cams || []) axis.add(new THREE.Vector3(c[3], c[4], c[5]));
                const dir = axis.lengthSq() ? axis.normalize().negate() : new THREE.Vector3(0, 0, 1);
                dir.y += .45;
                camera.position.copy(mean).addScaledVector(dir.normalize(), 3.2);
                controls.target.copy(mean); controls.update(); base = controls.getAzimuthalAngle();
            }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(position.subarray(0, k * 3), 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(color.subarray(0, k * 3), 3));
            const material = new THREE.PointsMaterial({ size: SIZE, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, map: dot(), alphaTest: .5 });
            const points = new THREE.Points(geometry, material);
            const g = new THREE.Group(); g.add(points);
            if (cameras) {
                const vertices = [];
                for (const c of info.cams || []) {
                    const p = new THREE.Vector3(c[0], c[1], c[2]);
                    const d = new THREE.Vector3(c[3], c[4], c[5]).normalize();
                    const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0));
                    if (side.lengthSq() < .01) side.set(1, 0, 0); side.normalize().multiplyScalar(.024);
                    const up = new THREE.Vector3().crossVectors(side, d).normalize().multiplyScalar(.017);
                    const tip = p.clone().addScaledVector(d, .055), a = p.clone().add(side).add(up), b = p.clone().sub(side).add(up), c2 = p.clone().sub(side).sub(up), e = p.clone().add(side).sub(up);
                    for (const q of [[p,a],[p,b],[p,c2],[p,e],[a,b],[b,c2],[c2,e],[e,a],[a,tip],[b,tip],[c2,tip],[e,tip]]) vertices.push(...q[0].toArray(), ...q[1].toArray());
                }
                const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                g.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x55b6ff, transparent: true, opacity: 0 })));
            }
            geometries.set(tag, geometry); materials.set(tag, material); objects.set(tag, g); group.add(g);
            return g;
        };
        await makeLevel(level);
        materials.get(level).opacity = 1;
        for (const child of objects.get(level).children) if (child.material !== materials.get(level)) child.material.opacity = 1;
        if (fallback) fallback.style.display = 'none';
        resize();
        const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0 }) : null;
        if (observer) observer.observe(host);
        let animation;
        const render = () => {
            if (disposed) return;
            animation = requestAnimationFrame(render);
            if (visible) {
                if (controls.autoRotate && base !== null) {
                    const d = controls.getAzimuthalAngle() - base, a = Math.atan2(Math.sin(d), Math.cos(d));
                    if (a > SWAY) controls.autoRotateSpeed = Math.abs(controls.autoRotateSpeed); else if (a < -SWAY) controls.autoRotateSpeed = -Math.abs(controls.autoRotateSpeed);
                }
                controls.update(); renderer.render(scene, camera);
            }
        };
        render();
        const setLevel = async (next) => {
            if (!tags.includes(next) || disposed) return;
            try {
                await makeLevel(next);
                const start = performance.now();
                for (const [tag, mat] of materials) if (tag !== next) mat.opacity = 0;
                for (const [tag, obj] of objects) if (tag !== next) for (const child of obj.children) if (child.material !== materials.get(tag)) child.material.opacity = 0;
                const mat = materials.get(next), obj = objects.get(next);
                for (const child of obj.children) if (child.material !== mat) child.material.opacity = 0;
                active = next;
                const tick = (now) => {
                    const t = Math.min(1, (now - start) / 400); mat.opacity = t;
                    for (const child of obj.children) if (child.material !== mat) child.material.opacity = t;
                    if (t < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            } catch (_) { /* Keep the static fallback if a level cannot load. */ }
        };
        window.addEventListener('resize', resize);
        return { setLevel, dispose() { disposed = true; cancelAnimationFrame(animation); observer?.disconnect(); window.removeEventListener('resize', resize); renderer.dispose(); for (const g of geometries.values()) g.dispose(); for (const m of materials.values()) m.dispose(); host.removeChild(renderer.domElement); } };
    } catch (_) { return null; }
}
