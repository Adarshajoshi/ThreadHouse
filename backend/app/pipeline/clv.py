import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore")
from lifetimes import BetaGeoFitter, GammaGammaFitter
from lifetimes.utils import summary_data_from_transaction_data

def compute_clv(df_raw: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """
    Takes raw transaction dataframe and column mapping,
    returns CLV predictions per customer.
    """
    try:
        df = df_raw.rename(columns={
            mapping["customer_id"]["column"]: "CustomerID",
            mapping["date"]["column"]:        "Date",
            mapping["amount"]["column"]:      "Amount",
            mapping["quantity"]["column"]:    "Quantity",
            mapping["invoice_id"]["column"]:  "InvoiceID",
        }).copy()

        df["Date"]      = pd.to_datetime(df["Date"], infer_datetime_format=True)
        df              = df[df["Quantity"] > 0]
        df              = df[df["Amount"] > 0]
        df["LineTotal"] = df["Quantity"] * df["Amount"]
        df              = df.dropna(subset=["CustomerID"])

        observation_date = df["Date"].max()

        rfm_summary = summary_data_from_transaction_data(
            df,
            customer_id_col  = "CustomerID",
            datetime_col     = "Date",
            monetary_value_col = "LineTotal",
            observation_period_end = observation_date,
            freq = "D"
        )

        rfm_repeat = rfm_summary[rfm_summary["frequency"] > 0].copy()

        if len(rfm_repeat) < 50:
            print("Not enough repeat purchasers for BG/NBD — returning null CLV")
            return pd.DataFrame(columns=[
                "CustomerID", "clv_12months", "clv_segment",
                "prob_alive", "predicted_purchases_90d"
            ])

        bgf = BetaGeoFitter(penalizer_coef=0.01)
        bgf.fit(
            rfm_repeat["frequency"],
            rfm_repeat["recency"],
            rfm_repeat["T"]
        )

        ggf = GammaGammaFitter(penalizer_coef=0.01)
        ggf.fit(
            rfm_repeat["frequency"],
            rfm_repeat["monetary_value"]
        )

        rfm_repeat["predicted_purchases_90d"] = bgf.conditional_expected_number_of_purchases_up_to_time(
            90,
            rfm_repeat["frequency"],
            rfm_repeat["recency"],
            rfm_repeat["T"]
        )

        rfm_repeat["prob_alive"] = bgf.conditional_probability_alive(
            rfm_repeat["frequency"],
            rfm_repeat["recency"],
            rfm_repeat["T"]
        )

        rfm_repeat["clv_12months"] = ggf.customer_lifetime_value(
            bgf,
            rfm_repeat["frequency"],
            rfm_repeat["recency"],
            rfm_repeat["T"],
            rfm_repeat["monetary_value"],
            time          = 12,
            freq          = "D",
            discount_rate = 0.01
        )

        # Robust CLV bucketing: with very few or near-identical CLV values
        # pd.qcut(q=4) raises "Bin labels must be one fewer than the number
        # of bin edges". Fall back to as many buckets as we can form.
        _clv_labels = ["Low CLV", "Medium CLV", "High CLV", "Premium CLV"]
        _vals = rfm_repeat["clv_12months"]
        _n_unique = _vals.nunique(dropna=True)
        if _n_unique < 2:
            rfm_repeat["clv_segment"] = "Low CLV"
        else:
            _q = min(4, int(_n_unique))
            try:
                rfm_repeat["clv_segment"] = pd.qcut(
                    _vals.rank(method="first"),
                    q          = _q,
                    labels     = _clv_labels[:_q],
                    duplicates = "drop",
                ).astype(str)
            except (ValueError, TypeError):
                rfm_repeat["clv_segment"] = "Low CLV"

        result = rfm_repeat[[
            "clv_12months", "clv_segment",
            "prob_alive", "predicted_purchases_90d"
        ]].reset_index()

        result = result.rename(columns={"CustomerID": "CustomerID"})
        result["CustomerID"] = result["CustomerID"].astype(str).str.strip().str.replace(".0", "", regex = False)

        print(f"CLV computed for {len(result)} repeat customers")
        return result

    except Exception as e:
        print(f"CLV computation failed: {e}")
        return pd.DataFrame(columns=[
            "CustomerID", "clv_12months", "clv_segment",
            "prob_alive", "predicted_purchases_90d"
        ])