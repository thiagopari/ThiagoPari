"""Align each water level's COLMAP model to the clear model and export compact web files.
Writes out/<level>.bin (float32 xyz, then uint8 rgb), out/meta.json (counts, cameras).
Dense variant: points come from runs/<level>/dense/scene_dense.ply (OpenMVS DensifyPointCloud), voxel-downsampled with the
same voxel for every level (argv[1], normalized units). Normalization still uses the clear sparse model."""
import json, sys
import numpy as np
from pathlib import Path

LEVELS = ["clear", "IB", "II", "III", "1C", "3C", "5C"]
T, OUT = Path("txt"), Path("out"); OUT.mkdir(exist_ok=True)

def qrot(q):
    w, x, y, z = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

def cams(level):
    lines = [l for l in (T/level/"images.txt").read_text().splitlines() if l and l[0] != "#"]
    out = {}
    for l in lines[::2]:
        f = l.split(); R = qrot(list(map(float, f[1:5]))); t = np.array(list(map(float, f[5:8])))
        out[f[9]] = (-R.T @ t, R.T[:, 2])   # camera center, viewing axis (world)
    return out

def points(level):
    rows = [l.split() for l in (T/level/"points3D.txt").read_text().splitlines() if l and l[0] != "#"]
    a = np.array([r[1:7] for r in rows], float)
    return a[:, :3], a[:, 3:6].astype(np.uint8)

def dense(level):  # OpenMVS scene_dense.ply: binary LE, float xyz + uchar rgb
    b = Path(f"runs/{level}/dense/scene_dense.ply").read_bytes(); h = b.index(b"end_header\n") + 11
    assert b"property float32 x" in b[:h] and b"normal" not in b[:h], "unexpected PLY layout"
    a = np.frombuffer(b[h:], dtype=[("p", "<f4", 3), ("c", "u1", 3)])
    return a["p"].astype(float), a["c"]

def voxel(W, C, v):  # first point per occupied voxel
    _, i = np.unique(np.floor(W / v).astype(np.int64), axis=0, return_index=True)
    return W[i], C[i]

VOX = float(sys.argv[1]) if len(sys.argv) > 1 else 0.01

def umeyama(src, dst):  # dst ~ s R src + t
    ms, md = src.mean(0), dst.mean(0); A, B = src - ms, dst - md
    U, S, Vt = np.linalg.svd(B.T @ A / len(src)); D = np.eye(3)
    D[2, 2] = np.sign(np.linalg.det(U @ Vt)); R = U @ D @ Vt
    s = np.trace(np.diag(S) @ D) / (A**2).sum(1).mean()
    return s, R, md - s * R @ ms

ref = cams("clear"); P0, _ = points("clear")
_up = []
for l in [l for l in (T/"clear"/"images.txt").read_text().splitlines() if l and l[0] != "#"][::2]:
    _up.append(-qrot(list(map(float, l.split()[1:5]))).T[:, 1])
u = np.mean(_up, 0); u /= np.linalg.norm(u); y = np.array([0., 1., 0.]); v = np.cross(u, y)
K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
RUP = np.eye(3) + K + K @ K / (1 + u @ y)          # rotates mean camera-up onto +Y (three.js up)
center = np.median(P0, 0); scale = np.percentile(np.linalg.norm(P0 - center, axis=1), 90)
meta = {"levels": [], "note": f"COLMAP 3.9.1 CPU SIFT + exhaustive matching, then OpenMVS DensifyPointCloud (CPU) on the 800x600 viewer frames, one run per level, aligned to clear, voxel {VOX}"}
for L in LEVELS:
    c = cams(L); P, C = dense(L); shared = [k for k in c if k in ref]
    d = np.median([np.linalg.norm(ref[k][0] - ref[j][0]) for k in ref for j in ref if k < j])
    src = np.array([c[k][0] for k in shared] + [c[k][0] + c[k][1] for k in shared])
    s0 = 1.0
    if L != "clear":   # first pass fixes scale so the axis offset (1 unit) is comparable
        s, R, t = umeyama(np.array([c[k][0] for k in shared]), np.array([ref[k][0] for k in shared])) if len(shared) > 2 else (None,)*3
        s0 = s if s else np.linalg.norm(ref[shared[0]][0] - ref[shared[1]][0]) / max(np.linalg.norm(c[shared[0]][0] - c[shared[1]][0]), 1e-9)
    src = np.array([c[k][0] for k in shared] + [c[k][0] + d / s0 * c[k][1] for k in shared])
    dst = np.array([ref[k][0] for k in shared] + [ref[k][0] + d * ref[k][1] for k in shared])
    s, R, t = umeyama(src, dst)
    res = np.linalg.norm((s * (R @ src.T)).T + t - dst, axis=1).max() / scale
    W = ((s * (R @ P.T)).T + t - center) / scale          # normalized, ~unit radius
    Wc = {k: (((s * R @ c[k][0]) + t - center) / scale, R @ c[k][1]) for k in c}
    W, Wc = W @ RUP.T, {k: (RUP @ v[0], RUP @ v[1]) for k, v in Wc.items()}
    W, C = voxel(W, C, VOX)
    (OUT/f"{L}.bin").write_bytes(W.astype(np.float32).tobytes() + C.tobytes())
    meta["levels"].append({"tag": L, "points": len(W), "cameras": len(c), "align_max_err": round(float(res), 4),
        "cams": [[round(float(x), 4) for x in list(p) + list(v)] for p, v in Wc.values()]})
    print(L, len(P), "dense ->", len(W), "pts", len(c), "cams", "align err %.4f" % res)
(OUT/"meta.json").write_text(json.dumps(meta))
