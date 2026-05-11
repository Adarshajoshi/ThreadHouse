import pandas as pd
import numpy as np


def _safe_score(series: pd.Series, ascending: bool = True, default: int = 3) -> pd.Series:
    """
    Map a numeric series to a 1-5 score, robust to small / degenerate samples.

    pd.qcut(q=5, labels=[1..5]) crashes with
        "Bin labels must be one fewer than the number of bin edges"
    when there aren't enough unique values to form 5 quintiles. With <5 unique
    values, we fall back to as many bins as there are unique values, and if
    everything is identical we return `default` for every row.

    ascending=True  -> higher value gets higher score (used for F, M)
    ascending=False -> lower  value gets higher score (used for R)
    """
    s = series.astype(float)
    if s.empty:
        return pd.Series([], dtype=int, index=s.index)

    n_unique = s.nunique(dropna=True)
    if n_unique < 2:
        return pd.Series([default] * len(s), index=s.index, dtype=int)

    q = min(5, int(n_unique))
    labels = list(range(1, q + 1))
    if not ascending:
        labels = labels[::-1]

    try:
        ranked = s.rank(method="first")
        scored = pd.qcut(ranked, q=q, labels=labels, duplicates="drop")
        # If duplicates="drop" still cut bins below the label count, pandas
        # would have raised - so a successful return here is safe to .astype(int).
        return scored.astype(int)
    except (ValueError, TypeError):
        # Last-resort: rank into 5 equal-population buckets manually.
        ranks = s.rank(method="first", ascending=ascending)
        buckets = pd.cut(
            ranks,
            bins=np.linspace(0, len(s), 6),
            labels=[1, 2, 3, 4, 5],
            include_lowest=True,
        )
        return buckets.fillna(default).astype(int)


def score_and_segment(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["is_suspicious"] = ((df["Monetary"] == 0) | (df["TotalItems"] == 0)).astype(int)

    df_clean = df[df["is_suspicious"] == 0].copy()
    df_susp  = df[df["is_suspicious"] == 1].copy()

    if not df_clean.empty:
        df_clean["R_score"]   = _safe_score(df_clean["Recency"],   ascending=False)
        df_clean["F_score"]   = _safe_score(df_clean["Frequency"], ascending=True)
        df_clean["M_score"]   = _safe_score(df_clean["Monetary"],  ascending=True)
        df_clean["RFM_Total"] = df_clean["R_score"] + df_clean["F_score"] + df_clean["M_score"]

        def assign_segment(row):
            r, f, m = row["R_score"], row["F_score"], row["M_score"]
            if r >= 4 and f >= 4 and m >= 4:   return "Champion"
            elif r >= 3 and f >= 4:            return "Loyal Customer"
            elif r >= 4 and f <= 2 and m <= 2: return "New Customer"
            elif r >= 3 and f >= 2 and m >= 3: return "Potential Loyalist"
            elif r >= 4 and m >= 3:            return "Promising"
            elif r <= 2 and f >= 3 and m >= 3: return "At Risk"
            elif r <= 2 and f >= 4 and m >= 4: return "Can't Lose Them"
            elif r <= 2 and f <= 2 and m <= 2: return "Lost Customer"
            elif r == 3 and f <= 2:            return "About to Sleep"
            else:                              return "Needs Attention"

        df_clean["Segment"] = df_clean.apply(assign_segment, axis=1)

    for col in ["R_score", "F_score", "M_score", "RFM_Total"]:
        df_susp[col] = 0
    df_susp["Segment"] = "Anomalous"

    return pd.concat([df_clean, df_susp], ignore_index=True)
