import pandas as pd

def score_and_segment(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["is_suspicious"] = ((df["Monetary"] == 0) | (df["TotalItems"] == 0)).astype(int)

    df_clean = df[df["is_suspicious"] == 0].copy()
    df_susp  = df[df["is_suspicious"] == 1].copy()

    df_clean["R_score"] = pd.qcut(df_clean["Recency"], q=5, labels=[5,4,3,2,1], duplicates="drop").astype(int)
    df_clean["F_score"] = pd.qcut(df_clean["Frequency"].rank(method="first"), q=5, labels=[1,2,3,4,5], duplicates="drop").astype(int)
    df_clean["M_score"] = pd.qcut(df_clean["Monetary"].rank(method="first"), q=5, labels=[1,2,3,4,5], duplicates="drop").astype(int)
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