import pandas as pd
import json
from rapidfuzz import fuzz
from groq import Groq
from decouple import config
from app.core.config import get_groq_key

SECRET_KEY = config("SECRET_KEY", default="")

# Lazy Groq client - instantiate on first use so an empty/unset
# GROQ_API_KEY does not break app import.
_groq_client = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = get_groq_key()
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not configured")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


MODEL  = "llama-3.3-70b-versatile"

COLUMN_PATTERNS = {
    "customer_id": [
        "customerid", "customer_id", "clientid", "client_id",
        "userid", "user_id", "custid", "cust_id", "memberid",
        "member_id", "accountid", "account_id", "buyerid",
    ],
    "date": [
        "invoicedate", "invoice_date", "orderdate", "order_date",
        "transactiondate", "transaction_date", "purchasedate",
        "purchase_date", "date", "datetime", "timestamp", "saledate",
    ],
    "amount": [
        "unitprice", "unit_price", "price", "amount", "revenue",
        "sales", "total", "value", "cost", "spend", "monetary",
        "totalprice", "total_price", "saleamount", "sale_amount",
        "unitcost", "unit_cost", "itemcost", "item_cost", "itemprice",
        "item_price", "rate", "sellingprice", "listprice",
    ],
    "quantity": [
        "quantity", "qty", "units", "count", "items",
        "numberofitems", "num_items", "volume", "pieces",
        "qtyordered", "quantityordered", "noofitems",
    ],
    "invoice_id": [
        "invoiceno", "invoice_no", "invoice_id", "invoiceid",
        "orderid", "order_id", "transactionid", "transaction_id",
        "receiptid", "receipt_id", "saleid", "sale_id", "orderno",
        "order_no", "referenceid", "ref_id", "ticketid",
    ]
}

REQUIRED_FIELDS = ["customer_id", "date", "amount", "quantity", "invoice_id"]


def _fuzzy_detect(df: pd.DataFrame, threshold: int = 75) -> dict:
    detected = {}

    df_cols_normalized = {
        col.lower().replace(" ", "").replace("_", ""): col
        for col in df.columns
    }

    for field, patterns in COLUMN_PATTERNS.items():
        best_match = None
        best_score = 0

        for pattern in patterns:
            for col_normalized, col_original in df_cols_normalized.items():

                if col_normalized == pattern:
                    best_match = col_original
                    best_score = 100
                    break

                score = fuzz.ratio(col_normalized, pattern)
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = col_original

            if best_score == 100:
                break

        if best_match:
            detected[field] = {
                "column":     best_match,
                "confidence": best_score,
                "method":     "exact" if best_score == 100 else "fuzzy"
            }

    return detected


def _llm_detect(df: pd.DataFrame) -> dict:
    sample  = df.head(5).to_string()
    columns = list(df.columns)

    prompt = f"""
I have a transactional dataset with these columns:
{columns}

Here are the first 5 rows:
{sample}

Identify which column corresponds to each field:
- customer_id: unique identifier per customer
- date: transaction or invoice date
- amount: monetary value per unit (unit price or item price)
- quantity: number of items purchased
- invoice_id: unique identifier per transaction

Respond ONLY with valid JSON. No markdown. No explanation.
Start with {{ and end with }}.

Format:
{{
    "customer_id": "actual_column_name or null",
    "date": "actual_column_name or null",
    "amount": "actual_column_name or null",
    "quantity": "actual_column_name or null",
    "invoice_id": "actual_column_name or null"
}}
"""

    try:
        response = _get_groq_client().chat.completions.create(
            model    = MODEL,
            messages = [
                {
                    "role":    "system",
                    "content": "You are a JSON-only response bot. Output only valid JSON."
                },
                {
                    "role":    "user",
                    "content": prompt
                }
            ],
            temperature = 0.1,
            max_tokens  = 300
        )

        raw = response.choices[0].message.content.strip()

        # Clean markdown if present
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        # Find JSON boundaries
        if not raw.startswith("{"):
            start = raw.find("{")
            end   = raw.rfind("}") + 1
            if start != -1 and end > start:
                raw = raw[start:end]

        result   = json.loads(raw)
        detected = {}

        for field, col in result.items():
            if col is not None and col in df.columns:
                detected[field] = {
                    "column":     col,
                    "confidence": 90,
                    "method":     "llm"
                }

        return detected

    except Exception as e:
        print(f"LLM schema detection failed: {e}")
        return {}


def detect_schema(df: pd.DataFrame) -> dict:
    """
    Three-tier schema detection:
    Tier 1 — Exact match
    Tier 2 — Fuzzy match
    Tier 3 — LLM fallback

    Returns:
    {
        "mapping": {
            "customer_id": {"column": "CustomerID", "confidence": 100, "method": "exact"},
            ...
        },
        "missing": [],
        "success": True
    }
    """

    print("Running schema detection...")

    mapping = _fuzzy_detect(df)

    detected_fields  = list(mapping.keys())
    missing_fields   = [f for f in REQUIRED_FIELDS if f not in mapping]

    print(f"  Fuzzy detection: found {detected_fields}")

    if missing_fields:
        print(f"  Missing fields: {missing_fields} — trying LLM detection")
        llm_mapping = _llm_detect(df)

        for field in missing_fields:
            if field in llm_mapping:
                mapping[field] = llm_mapping[field]

    still_missing = [f for f in REQUIRED_FIELDS if f not in mapping]

    print("\nSchema Detection Results:")
    for field, info in mapping.items():
        print(
            f"  {field:15} → '{info['column']}' "
            f"(confidence: {info['confidence']}%, "
            f"method: {info['method']})"
        )

    if still_missing:
        print(f"\nWARNING: Could not detect: {still_missing}")
    else:
        print("\nAll required fields detected successfully!")

    return {
        "mapping": mapping,
        "missing": still_missing,
        "success": len(still_missing) == 0
    }