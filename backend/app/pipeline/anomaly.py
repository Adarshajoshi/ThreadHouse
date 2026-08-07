import pandas as pd
import numpy as np
import torch
from torch import nn
from sklearn.preprocessing import RobustScaler
import os
from app.core.config import settings

class Autoencoder(nn.Module):
    def __init__(self, input_dim=8, latent_dim=2):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, latent_dim)
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim)
        )

    def forward(self, x):
        return self.decoder(self.encoder(x))


FEATURE_COLS = [
    "Recency", "Frequency", "Monetary",
    "AvgOrderValue", "TotalItems", "DistinctProducts",
    "TenureDays", "AvgItemsPerOrder"
]


def detect_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    model_path = os.path.join(settings.MODEL_DIR, "best_autoencoder.pt")

    X_raw = df[FEATURE_COLS].fillna(0).values.astype(np.float32)

    scaler   = RobustScaler()
    X_scaled = scaler.fit_transform(X_raw).astype(np.float32)

    if not os.path.exists(model_path):
        print("Autoencoder not found - using statistical anomaly detection")
        return _statistical_fallback(df)

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model  = Autoencoder(input_dim=8, latent_dim=2).to(device)
        model.load_state_dict(
            torch.load(model_path, map_location=device)
        )
        model.eval()

        X_tensor = torch.tensor(X_scaled).to(device)
        with torch.no_grad():
            X_reconstructed = model(X_tensor).cpu().numpy()

        reconstruction_errors = np.mean(
            (X_scaled - X_reconstructed) ** 2,
            axis=1
        )
    except Exception as e:
        # Autoencoder present but could not be loaded/applied (version mismatch,
        # corrupt weights, etc.). Fall back to the statistical detector.
        print(f"Autoencoder load/inference failed ({e}) - using statistical fallback")
        return _statistical_fallback(df)

    threshold_95 = np.percentile(reconstruction_errors, 95)
    threshold_99 = np.percentile(reconstruction_errors, 99)

    df["anomaly_score"]    = reconstruction_errors
    df["is_anomaly"]       = (reconstruction_errors > threshold_95).astype(int)
    df["anomaly_severity"] = "Normal"
    df.loc[reconstruction_errors > threshold_95, "anomaly_severity"] = "Suspicious"
    df.loc[reconstruction_errors > threshold_99, "anomaly_severity"] = "High Risk"

    def classify_anomaly(row):
        if row["anomaly_severity"] == "Normal":
            return "Normal"
        if row["Monetary"] == 0 or row["TotalItems"] == 0:
            return "Return Abuser"

        avg_items = df["AvgItemsPerOrder"].mean()
        if row["AvgItemsPerOrder"] > (avg_items * 3):
            return "Bulk Buyer / Reseller"

        avg_monetary = df["Monetary"].mean()
        if row["Frequency"] == 1 and row["Monetary"] > (avg_monetary * 2):
            return "One-Hit High Spender"

        avg_recency = df["Recency"].mean()
        if row["Recency"] > (avg_recency * 1.5) and row["Frequency"] <= 2:
            return "Ghost Customer"
        return "Erratic Behavior"

    df["anomaly_type"] = df.apply(classify_anomaly, axis=1)

    print(f"Anomaly detection complete - {df['is_anomaly'].sum()} flagged")
    return df


def _statistical_fallback(df: pd.DataFrame) -> pd.DataFrame:
    """
    If the autoencoder model file is missing or fails to load,
    fall back to Z-score based anomaly detection.
    """
    from scipy import stats

    X = df[FEATURE_COLS].fillna(0)
    z_scores = np.abs(stats.zscore(X))
    anomaly_scores = z_scores.max(axis=1)

    threshold = np.percentile(anomaly_scores, 95)

    df["anomaly_score"]    = anomaly_scores
    df["is_anomaly"]       = (anomaly_scores > threshold).astype(int)
    df["anomaly_severity"] = np.where(
        anomaly_scores > np.percentile(anomaly_scores, 99),
        "High Risk",
        np.where(anomaly_scores > threshold, "Suspicious", "Normal")
    )
    df["anomaly_type"] = "Erratic Behavior"

    print(f"Statistical fallback anomaly detection - {df['is_anomaly'].sum()} flagged")
    return df
