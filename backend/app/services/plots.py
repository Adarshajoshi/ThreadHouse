"""
Chart data + local chart image generation for a completed intelligence job.

`build_plot_data` returns the JSON shapes the frontend Recharts components expect
(GET /api/results/{job_id}/plots). `save_plots` renders the same charts with
matplotlib and saves them as PNG files under `backend/static/plots/<job_id>/`,
which are served at /static/plots/<job_id>/<name>.png.
"""
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]   # app/services -> app -> backend
STATIC_DIR = BACKEND_DIR / "static"
PLOTS_SUBDIR = "plots"


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def build_plot_data(profiles) -> dict:
    """Build the six chart datasets consumed by the Intel dashboard."""
    # Segment distribution
    seg = defaultdict(int)
    for p in profiles:
        seg[p.segment or "Unknown"] += 1
    segment_distribution = [
        {"segment": s, "count": n}
        for s, n in sorted(seg.items(), key=lambda x: -x[1])
    ]

    # RFM scatter (cap the number of points sent to the browser)
    pts = [
        {
            "segment": p.segment or "Unknown",
            "recency": _num(p.recency) or 0,
            "monetary": _num(p.monetary) or 0,
        }
        for p in profiles
    ]
    if len(pts) > 600:
        step = len(pts) // 600 + 1
        pts = pts[::step]
    rfm_scatter = pts

    # Average 12-month CLV by segment (non-null only)
    clv_sum = defaultdict(float)
    clv_cnt = defaultdict(int)
    for p in profiles:
        c = _num(p.clv_12months)
        if c is not None:
            clv_sum[p.segment or "Unknown"] += c
            clv_cnt[p.segment or "Unknown"] += 1
    clv_by_segment = [
        {"segment": s, "avg_clv": round(clv_sum[s] / clv_cnt[s], 2)}
        for s in clv_sum if clv_cnt[s] > 0
    ]
    clv_by_segment.sort(key=lambda x: -x["avg_clv"])

    # HVR potential breakdown
    hvr = defaultdict(int)
    for p in profiles:
        if p.hvr_potential:
            hvr[p.hvr_potential] += 1
    hvr_order = {"High Potential": 0, "Medium Potential": 1, "Low Potential": 2}
    hvr_potential = [
        {"potential": k, "count": v}
        for k, v in sorted(hvr.items(), key=lambda x: hvr_order.get(x[0], 9))
    ]

    # Anomaly type breakdown (includes Normal)
    an = defaultdict(int)
    for p in profiles:
        an[p.anomaly_type or "Normal"] += 1
    anomaly_breakdown = [
        {"type": t, "count": n}
        for t, n in sorted(an.items(), key=lambda x: -x[1])
    ]

    # Probability-alive distribution (10 buckets over 0..1)
    buckets = [0] * 10
    for p in profiles:
        pa = _num(p.prob_alive)
        if pa is None:
            continue
        idx = min(int(max(pa, 0.0) * 10), 9)
        buckets[idx] += 1
    prob_alive_distribution = [
        {"range": f"{i / 10:.1f}-{(i + 1) / 10:.1f}", "count": buckets[i]}
        for i in range(10)
    ]

    return {
        "segment_distribution": segment_distribution,
        "rfm_scatter": rfm_scatter,
        "clv_by_segment": clv_by_segment,
        "hvr_potential": hvr_potential,
        "anomaly_breakdown": anomaly_breakdown,
        "prob_alive_distribution": prob_alive_distribution,
    }


def save_plots(job_id, profiles, data=None) -> list:
    """
    Render the charts with matplotlib and save PNGs under
    static/plots/<job_id>/. Returns a list of /static-relative URLs.
    Safe to call in a background task; requires matplotlib.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    if data is None:
        data = build_plot_data(profiles)

    out_dir = STATIC_DIR / PLOTS_SUBDIR / str(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = []

    def _save(fig, name):
        fig.savefig(out_dir / name, dpi=120, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        saved.append(f"/static/{PLOTS_SUBDIR}/{job_id}/{name}")

    # 1. Segment distribution (bar)
    sd = data["segment_distribution"]
    if sd:
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.bar([d["segment"] for d in sd], [d["count"] for d in sd], color="#3b82f6")
        ax.set_title("Customer Segment Distribution")
        ax.set_ylabel("Customers")
        plt.setp(ax.get_xticklabels(), rotation=35, ha="right", fontsize=8)
        _save(fig, "segment_distribution.png")

    # 2. RFM scatter (recency vs monetary, coloured by segment)
    rs = data["rfm_scatter"]
    if rs:
        fig, ax = plt.subplots(figsize=(7, 5))
        grouped = defaultdict(list)
        for pt in rs:
            grouped[pt["segment"]].append((pt["recency"], pt["monetary"]))
        cmap = plt.get_cmap("tab10")
        for i, (seg, vals) in enumerate(list(grouped.items())[:10]):
            ax.scatter([v[0] for v in vals], [v[1] for v in vals],
                       s=12, alpha=0.6, label=seg, color=cmap(i % 10))
        ax.set_xlabel("Recency (days)")
        ax.set_ylabel("Monetary (GBP)")
        ax.set_title("RFM Scatter (Recency vs Monetary)")
        ax.legend(fontsize=7, markerscale=1.5)
        _save(fig, "rfm_scatter.png")

    # 3. Average CLV by segment (bar)
    cs = data["clv_by_segment"]
    if cs:
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.bar([d["segment"] for d in cs], [d["avg_clv"] for d in cs], color="#10b981")
        ax.set_title("Average 12-Month CLV by Segment")
        ax.set_ylabel("Avg CLV (GBP)")
        plt.setp(ax.get_xticklabels(), rotation=35, ha="right", fontsize=8)
        _save(fig, "clv_by_segment.png")

    # 4. HVR potential (pie)
    hp = data["hvr_potential"]
    if hp:
        fig, ax = plt.subplots(figsize=(5, 5))
        ax.pie([d["count"] for d in hp], labels=[d["potential"] for d in hp],
               autopct="%1.0f%%", colors=["#22c55e", "#eab308", "#ef4444"])
        ax.set_title("HVR Potential")
        _save(fig, "hvr_potential.png")

    # 5. Anomaly type breakdown (pie)
    ab = data["anomaly_breakdown"]
    if ab:
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.pie([d["count"] for d in ab], labels=[d["type"] for d in ab], autopct="%1.0f%%")
        ax.set_title("Anomaly Type Breakdown")
        _save(fig, "anomaly_breakdown.png")

    # 6. Probability-alive distribution (area)
    pad = data["prob_alive_distribution"]
    if pad and any(d["count"] for d in pad):
        fig, ax = plt.subplots(figsize=(8, 4))
        xs = [d["range"] for d in pad]
        ys = [d["count"] for d in pad]
        ax.fill_between(xs, ys, color="#3b82f6", alpha=0.35)
        ax.plot(xs, ys, color="#3b82f6", linewidth=2)
        ax.set_title("Probability-Alive Distribution")
        ax.set_ylabel("Customers")
        plt.setp(ax.get_xticklabels(), rotation=35, ha="right", fontsize=8)
        _save(fig, "prob_alive_distribution.png")

    return saved
