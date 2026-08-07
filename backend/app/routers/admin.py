
from fastapi import APIRouter
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from app.core.config import settings
from app.auth_deps import get_current_admin
from fastapi import Depends

router = APIRouter()

@router.post("/admin/train")
def train_models(_admin: int = Depends(get_current_admin)):
    """
    Training and saving HVR model directly on the server.
    Call once after deployment to generate compatible model files.
    """
    try:      
        data_path = os.path.join(settings.MODEL_DIR, "train_data.csv")

        if not os.path.exists(data_path):
            return {
                "status": "error",
                "message": f"Training data not found at {data_path}. Upload train_data.csv to the models/ folder first."
            }

        raw = pd.read_csv(data_path)
        raw.columns = raw.columns.str.strip()
        raw["InvoiceDate"] = pd.to_datetime(raw["InvoiceDate"], dayfirst=True)
        raw = raw[raw["Quantity"] > 0]
        raw = raw[raw["UnitPrice"] > 0]
        raw["LineTotal"] = raw["Quantity"] * raw["UnitPrice"]
        raw = raw.dropna(subset=["CustomerID"])
        raw["CustomerID"] = raw["CustomerID"].astype(int)

        split_date = raw["InvoiceDate"].min() + pd.DateOffset(months=8)

        train_raw   = raw[raw["InvoiceDate"] <  split_date]
        predict_raw = raw[raw["InvoiceDate"] >= split_date]

        def compute_features(df, reference_date):
            return df.groupby("CustomerID").agg(
                Recency          = ("InvoiceDate", lambda x: (reference_date - x.max()).days),
                Frequency        = ("InvoiceNo",   "nunique"),
                Monetary         = ("LineTotal",   "sum"),
                AvgOrderValue    = ("LineTotal",   "mean"),
                TotalItems       = ("Quantity",    "sum"),
                DistinctProducts = ("StockCode",   "nunique"),
                TenureDays       = ("InvoiceDate", lambda x: (x.max() - x.min()).days),
                AvgItemsPerOrder = ("Quantity",    "mean"),
            ).reset_index()

        train_features = compute_features(train_raw, split_date)

        predict_summary = predict_raw.groupby("CustomerID").agg(
            future_monetary  = ("LineTotal", "sum"),
            future_frequency = ("InvoiceNo", "nunique"),
        ).reset_index()

        monetary_threshold  = predict_summary["future_monetary"].quantile(0.60)
        predict_summary["is_high_value_future"] = (
            (predict_summary["future_monetary"]  >= monetary_threshold) &
            (predict_summary["future_frequency"] >= 2)
        ).astype(int)

        df_model = train_features.merge(
            predict_summary[["CustomerID", "is_high_value_future"]],
            on="CustomerID", how="inner"
        )

        df_model["monetary_per_day"] = df_model["Monetary"] / (df_model["TenureDays"] + 1)
        df_model["orders_per_day"]   = df_model["Frequency"] / (df_model["TenureDays"] + 1)
        df_model["avg_gap"]          = df_model["TenureDays"] / (df_model["Frequency"].clip(lower=1))
        df_model["spend_diversity"]  = df_model["Monetary"] / (df_model["DistinctProducts"] + 1)
        df_model["basket_value"]     = df_model["Monetary"] / (df_model["TotalItems"] + 1)

        feature_cols = [
            "Recency", "Frequency", "Monetary",
            "AvgOrderValue", "TotalItems", "DistinctProducts",
            "TenureDays", "AvgItemsPerOrder",
            "monetary_per_day", "orders_per_day",
            "avg_gap", "spend_diversity", "basket_value"
        ]

        X = df_model[feature_cols].replace([np.inf, -np.inf], np.nan).fillna(0)
        for col in X.columns:
            X[col] = X[col].clip(upper=X[col].quantile(0.999))

        y = df_model["is_high_value_future"]

        customer_first_date = train_raw.groupby("CustomerID")["InvoiceDate"].min()
        df_model["first_purchase"] = df_model["CustomerID"].map(customer_first_date)
        temporal_split = df_model["first_purchase"].quantile(0.80)

        train_mask = df_model["first_purchase"] <= temporal_split
        X_train    = X[train_mask]
        X_test     = X[~train_mask]
        y_train    = y[train_mask]
        y_test     = y[~train_mask]

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

        weights = np.where(y_train == 1, 2.0, 1.0)

        model = GradientBoostingClassifier(
            n_estimators    = 200,
            learning_rate   = 0.05,
            max_depth       = 3,
            min_samples_leaf= 20,
            subsample       = 0.8,
            random_state    = 42
        )
        model.fit(X_train_scaled, y_train, sample_weight=weights)

        from sklearn.metrics import (
            roc_auc_score, accuracy_score, precision_score,
            recall_score, f1_score, confusion_matrix,
        )
        y_prob = model.predict_proba(X_test_scaled)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        auc       = roc_auc_score(y_test, y_prob) if y_test.nunique() > 1 else None
        accuracy  = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall    = recall_score(y_test, y_pred, zero_division=0)
        f1        = f1_score(y_test, y_pred, zero_division=0)
        cm        = confusion_matrix(y_test, y_pred).tolist()   # [[TN, FP], [FN, TP]]

        os.makedirs(settings.MODEL_DIR, exist_ok=True)

        joblib.dump(model,       os.path.join(settings.MODEL_DIR, "hvr_model.pkl"))
        joblib.dump(scaler,      os.path.join(settings.MODEL_DIR, "hvr_scaler.pkl"))
        joblib.dump(feature_cols,os.path.join(settings.MODEL_DIR, "hvr_features.pkl"))

        # Save a confusion-matrix image under static/plots/hvr/
        cm_image = None
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            from app.services.plots import STATIC_DIR
            out_dir = STATIC_DIR / "plots" / "hvr"
            out_dir.mkdir(parents=True, exist_ok=True)
            fig, ax = plt.subplots(figsize=(5.0, 4.4))
            ax.imshow(cm, cmap="Greys", vmin=0, vmax=max(max(r) for r in cm) or 1)
            ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
            ax.set_xticklabels(["Predicted: Not HVR", "Predicted: HVR"])
            ax.set_yticklabels(["Actual: Not HVR", "Actual: HVR"])
            for i in range(2):
                for j in range(2):
                    ax.text(j, i, str(cm[i][j]), ha="center", va="center", fontsize=16)
            ax.set_title("HVR Classifier - Confusion Matrix")
            plt.setp(ax.get_xticklabels(), rotation=15, ha="right")
            fig.tight_layout()
            fig.savefig(out_dir / "confusion_matrix.png", dpi=150, facecolor="white")
            plt.close(fig)
            cm_image = "/static/plots/hvr/confusion_matrix.png"
        except Exception as e:
            print(f"Confusion-matrix image not saved: {e}")

        return {
            "status":            "success",
            "metrics": {
                "auc":       round(auc, 4) if auc is not None else None,
                "accuracy":  round(accuracy, 4),
                "precision": round(precision, 4),
                "recall":    round(recall, 4),
                "f1_score":  round(f1, 4),
                "confusion_matrix": cm,
            },
            "confusion_matrix_image": cm_image,
            "train_size":   int(train_mask.sum()),
            "test_size":    int((~train_mask).sum()),
            "features":     feature_cols,
            "model_dir":    settings.MODEL_DIR,
            "message":      "Models trained and saved successfully. Pipeline is ready."
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}