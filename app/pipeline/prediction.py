import pandas as pd
import numpy as np
import joblib
from app.core.config import settings
import os

def predict_hvr(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    model_path   = os.path.join(settings.MODEL_DIR, "hvr_model.pkl")
    scaler_path  = os.path.join(settings.MODEL_DIR, "hvr_scaler.pkl")
    feature_path = os.path.join(settings.MODEL_DIR, "hvr_features.pkl")

    if not all(os.path.exists(p) for p in [model_path, scaler_path, feature_path]):
        print("HVR model files not found — skipping prediction")
        df["hvr_probability"] = None
        df["hvr_potential"]   = None
        return df

    model        = joblib.load(model_path)
    scaler       = joblib.load(scaler_path)
    feature_cols = joblib.load(feature_path)

    df["monetary_per_day"] = df["Monetary"] / (df["TenureDays"] + 1)
    df["orders_per_day"]   = df["Frequency"] / (df["TenureDays"] + 1)
    df["avg_gap"]          = df["TenureDays"] / (df["Frequency"].clip(lower=1))
    df["spend_diversity"]  = df["Monetary"] / (df["DistinctProducts"] + 1)
    df["basket_value"]     = df["Monetary"] / (df["TotalItems"] + 1)

    X = df[feature_cols].copy()
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    for col in X.columns:
        upper    = X[col].quantile(0.999)
        X[col]   = X[col].clip(upper=upper)

    X_scaled = scaler.transform(X)

    df["hvr_probability"] = model.predict_proba(X_scaled)[:, 1]
    df["hvr_potential"]   = pd.cut(
        df["hvr_probability"],
        bins=[0, 0.33, 0.66, 1.0],
        labels=["Low Potential", "Medium Potential", "High Potential"]
    ).astype(str)

    return df