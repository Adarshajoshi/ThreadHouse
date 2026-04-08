import json
import pandas as pd
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
MODEL  = "qwen/qwen3-32b"


def _call_llm(prompt: str, max_tokens: int = 600, json_mode: bool = False) -> str:
    """Central LLM call with error handling"""
    try:
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [
                {
                    "role": "system",
                    "content": "You are a customer analytics expert. Be concise and specific." +
                               (" Respond only with valid JSON." if json_mode else "")
                },
                {"role": "user", "content": prompt}
            ],
            temperature = 0.2,
            max_tokens  = max_tokens
        )
        raw = response.choices[0].message.content.strip()

        import re
        raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()

        return raw

    except Exception as e:
        print(f"LLM call failed: {e}")
        return ""


def _parse_json(raw: str) -> dict:
    """Safely parse JSON from LLM response"""
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    if not raw.startswith("{"):
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

    try:
        return json.loads(raw)
    except Exception:
        return {}


def generate_all_insights(df: pd.DataFrame) -> dict:
    """
    Master function — runs all insight generation
    and returns structured dict ready for database storage
    """

    summary = _build_summary(df)

    insights = {}

    exec_summary = _executive_summary(summary)
    insights["executive_summary"] = {
        "title":    "Executive Summary",
        "body":     exec_summary,
        "priority": 1
    }

    recs = _segment_recommendations(summary)
    insights["segment_recommendations"] = {
        "title":    "Segment Recommendations",
        "body":     json.dumps(recs),
        "priority": 2
    }

    anomaly_text = _anomaly_insights(summary, df)
    insights["anomaly_insights"] = {
        "title":    "Anomaly Report",
        "body":     anomaly_text,
        "priority": 2
    }

    alerts = _generate_alerts(df)
    insights["alerts"] = {
        "title":    "Priority Alerts",
        "body":     json.dumps(alerts),
        "priority": 1
    }

    return insights


def _build_summary(df: pd.DataFrame) -> dict:
    segment_summary = df.groupby("Segment").agg(
        count        = ("CustomerID", "count"),
        avg_recency  = ("Recency",    "mean"),
        avg_frequency= ("Frequency",  "mean"),
        avg_monetary = ("Monetary",   "mean"),
        avg_clv      = ("clv_12months","mean") if "clv_12months" in df.columns else ("Monetary", "mean")
    ).round(2)

    anomaly_summary = df[df["is_anomaly"] == 1]["anomaly_type"].value_counts().to_dict() \
                      if "is_anomaly" in df.columns else {}

    return {
        "total_customers":  len(df),
        "total_revenue":    round(df["Monetary"].sum(), 2),
        "segment_summary":  segment_summary.to_dict(),
        "anomaly_summary":  anomaly_summary,
    }


def _executive_summary(summary: dict) -> str:
    prompt = f"""
Analyze this customer data and write a 3 paragraph executive summary.
Highlight opportunities, risks, and key findings.
Write in business prose, no bullet points.

Total customers: {summary['total_customers']}
Total revenue: £{summary['total_revenue']:,.2f}
Segments: {json.dumps(summary['segment_summary']['count'])}
Anomalies: {json.dumps(summary['anomaly_summary'])}
"""
    result = _call_llm(prompt, max_tokens=500)
    return result if result else "Executive summary unavailable."


def _segment_recommendations(summary: dict) -> dict:
    prompt = f"""
Generate recommendations for each customer segment.
Respond ONLY with valid JSON. No markdown. No explanation.
Start with {{ and end with }}.

Segment monetary values: {json.dumps(summary['segment_summary']['avg_monetary'])}
Segment frequencies: {json.dumps(summary['segment_summary']['avg_frequency'])}
Segment recencies: {json.dumps(summary['segment_summary']['avg_recency'])}

Format:
{{
  "SegmentName": {{
    "description": "one line who they are",
    "action": "most important action",
    "campaign": "specific campaign idea",
    "priority": "Critical|High|Medium|Low"
  }}
}}
"""
    raw    = _call_llm(prompt, max_tokens=1000, json_mode=True)
    result = _parse_json(raw)

    if not result:
        result = _rule_based_recommendations()

    return result


def _anomaly_insights(summary: dict, df: pd.DataFrame) -> str:
    top_anomalies = []
    if "is_anomaly" in df.columns:
        top_anomalies = df[df["is_anomaly"] == 1].nlargest(5, "anomaly_score")[
            ["CustomerID", "Monetary", "Frequency", "anomaly_score", "anomaly_type"]
        ].to_dict(orient="records")

    prompt = f"""
Write a brief anomaly report for a business analyst.
3 paragraphs. Business language, not technical.

Anomaly types found: {json.dumps(summary['anomaly_summary'])}
Top anomalous customers: {json.dumps(top_anomalies)}
Total customers: {summary['total_customers']}
"""
    result = _call_llm(prompt, max_tokens=400)
    return result if result else "Anomaly report unavailable."


def _generate_alerts(df: pd.DataFrame) -> list:
    """Rule-based alerts — no LLM needed, always reliable"""
    alerts = []

    # At Risk
    at_risk = df[df["Segment"] == "At Risk"]
    if len(at_risk) > 0:
        clv_sum = at_risk["clv_12months"].sum() if "clv_12months" in df.columns else at_risk["Monetary"].sum()
        alerts.append({
            "priority": "Critical",
            "type":     "Revenue at Risk",
            "title":    f"{len(at_risk)} At-Risk customers identified",
            "metric":   f"£{clv_sum:,.0f} CLV at risk",
            "action":   "Launch win-back campaign immediately"
        })

    # Champions churning
    champions = df[df["Segment"] == "Champion"]
    if "prob_alive" in df.columns:
        champ_low = champions[champions["prob_alive"] < 0.5]
        if len(champ_low) > 0:
            alerts.append({
                "priority": "Critical",
                "type":     "Champion Churn Risk",
                "title":    f"{len(champ_low)} Champions showing churn signals",
                "metric":   f"£{champ_low['clv_12months'].sum():,.0f} CLV at risk",
                "action":   "Personal outreach with exclusive loyalty offer"
            })

    # Promising
    promising = df[df["Segment"] == "Promising"]
    if len(promising) > 0:
        alerts.append({
            "priority": "High",
            "type":     "Growth Opportunity",
            "title":    f"{len(promising)} Promising customers ready to convert",
            "metric":   f"Avg order £{promising['AvgOrderValue'].mean():,.0f}",
            "action":   "Fast-track loyalty onboarding within 7 days"
        })

    if "anomaly_type" in df.columns:
        bulk = df[df["anomaly_type"] == "Bulk Buyer / Reseller"]
        if len(bulk) > 0:
            alerts.append({
                "priority": "High",
                "type":     "Wholesale Opportunity",
                "title":    f"{len(bulk)} potential wholesale accounts detected",
                "metric":   f"Combined spend £{bulk['Monetary'].sum():,.0f}",
                "action":   "Move to B2B track with dedicated account manager"
            })

    return sorted(
        alerts,
        key=lambda x: {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}[x["priority"]]
    )


def _rule_based_recommendations() -> dict:
    """Fallback if LLM fails"""
    return {
        "Champion":          {"description": "Best customers", "action": "Reward loyalty", "campaign": "VIP early access", "priority": "High"},
        "Loyal Customer":    {"description": "Consistent buyers", "action": "Upsell premium products", "campaign": "Exclusive member pricing", "priority": "High"},
        "At Risk":           {"description": "Going quiet", "action": "Win-back campaign", "campaign": "Personalised re-engagement discount", "priority": "Critical"},
        "Lost Customer":     {"description": "Inactive", "action": "Last chance offer", "campaign": "One-time steep discount", "priority": "Medium"},
        "New Customer":      {"description": "First-time buyers", "action": "Drive second purchase", "campaign": "Welcome series with incentive", "priority": "High"},
        "Promising":         {"description": "High first order", "action": "Fast-track loyalty", "campaign": "Personal follow-up within 7 days", "priority": "High"},
        "Potential Loyalist":{"description": "Showing loyalty signs", "action": "Nurture toward loyalty", "campaign": "Points-based rewards", "priority": "Medium"},
        "Needs Attention":   {"description": "Below average RFM", "action": "Re-engage", "campaign": "Category-specific promotion", "priority": "Medium"},
        "About to Sleep":    {"description": "Declining engagement", "action": "Wake-up campaign", "campaign": "Limited time offer", "priority": "High"},
        "Anomalous":         {"description": "Unusual behavior", "action": "Manual review", "campaign": "No automated campaign", "priority": "Low"},
    }