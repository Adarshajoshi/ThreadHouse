import pandas as pd
import numpy as np

def extract_rfm(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    df = df.rename(columns={
        mapping["customer_id"]["column"]: "CustomerID",
        mapping["date"]["column"]:        "Date",
        mapping["amount"]["column"]:      "Amount",
        mapping["quantity"]["column"]:    "Quantity",
        mapping["invoice_id"]["column"]:  "InvoiceID",
    })

    df["Date"]      = pd.to_datetime(df["Date"], infer_datetime_format=True)
    df              = df[df["Quantity"] > 0]
    df              = df[df["Amount"] > 0]
    df["LineTotal"] = df["Quantity"] * df["Amount"]
    df              = df.dropna(subset=["CustomerID"])
    df["CustomerID"] = df["CustomerID"].astype(str).str.strip().str.replace(".0", "", regex=False)


    reference_date = df["Date"].max() + pd.Timedelta(days=1)

    rfm = df.groupby("CustomerID").agg(
        Recency          = ("Date",      lambda x: (reference_date - x.max()).days),
        Frequency        = ("InvoiceID", "nunique"),
        Monetary         = ("LineTotal", "sum"),
        AvgOrderValue    = ("LineTotal", "mean"),
        TotalItems       = ("Quantity",  "sum"),
        DistinctProducts = ("StockCode", "nunique") if "StockCode" in df.columns else ("InvoiceID", "nunique"),
        TenureDays       = ("Date",      lambda x: (x.max() - x.min()).days),
        AvgItemsPerOrder = ("Quantity",  "mean"),
    ).reset_index()

    return rfm