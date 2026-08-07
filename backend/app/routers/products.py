import json
import time
import uuid
from pathlib import Path
from typing import Optional

import asyncpg
from fastapi import APIRouter, Body, Depends, File, Form, UploadFile

from app.db.asyncpg_pool import get_asyncpg_conn
from app.audit import audit

router = APIRouter()

MAX_IMAGE_BYTES = 5 * 1024 * 1024            # 5 MB cap per image
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_IMAGE_EXTS  = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "images"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


def _row_to_product(row) -> dict:
    return {
        "_id":         str(row["id"]),
        "name":        row["name"],
        "description": row["description"],
        "price":       float(row["price"]),
        "image":       row["image"] if isinstance(row["image"], list) else json.loads(row["image"] or "[]"),
        "category":    row["category"],
        "subCategory": row["sub_category"],
        "sizes":       row["sizes"] if isinstance(row["sizes"], list) else json.loads(row["sizes"] or "[]"),
        "bestseller":  bool(row["bestseller"]),
        "date":        int(row["date"]),
        "stock":       int(row["stock"]) if row.get("stock") is not None else None,
    }


@router.get("/list")
async def list_products(conn: asyncpg.Connection = Depends(get_asyncpg_conn)):
    rows = await conn.fetch("SELECT * FROM products ORDER BY date DESC")
    return {"success": True, "products": [_row_to_product(r) for r in rows]}


@router.post("/add")
async def add_product(
    name:        str = Form(...),
    description: str = Form(""),
    price:       float = Form(...),
    category:    str = Form(...),
    subCategory: str = Form(...),
    sizes:       str = Form("[]"),       # JSON-stringified list
    bestseller:  str = Form("false"),    # comes in as "true"/"false"
    image1:      Optional[UploadFile] = File(None),
    image2:      Optional[UploadFile] = File(None),
    image3:      Optional[UploadFile] = File(None),
    image4:      Optional[UploadFile] = File(None),
    conn:        asyncpg.Connection = Depends(get_asyncpg_conn),
):
    # Save uploaded images (validated)
    image_urls: list[str] = []
    from fastapi import HTTPException as _HE
    for img in (image1, image2, image3, image4):
        if img is None or not getattr(img, "filename", ""):
            continue
        ext = Path(img.filename).suffix.lower() or ".jpg"
        if ext not in ALLOWED_IMAGE_EXTS:
            raise _HE(status_code=400, detail=f"Unsupported image type: {ext}")
        if img.content_type and img.content_type not in ALLOWED_IMAGE_TYPES:
            raise _HE(status_code=400, detail=f"Unsupported MIME: {img.content_type}")
        contents = await img.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise _HE(status_code=413, detail=f"Image too large (>{MAX_IMAGE_BYTES//1024//1024} MB)")
        if not contents:
            continue
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest = STATIC_DIR / safe_name
        dest.write_bytes(contents)
        image_urls.append(f"/static/images/{safe_name}")

    try:
        sizes_list = json.loads(sizes) if sizes else []
    except json.JSONDecodeError:
        sizes_list = []

    bestseller_bool = str(bestseller).lower() in ("true", "1", "yes", "on")

    await conn.execute(
        """
        INSERT INTO products
            (name, description, price, image, category, sub_category, sizes, bestseller, date)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9)
        """,
        name,
        description,
        price,
        json.dumps(image_urls),
        category,
        subCategory,
        json.dumps(sizes_list),
        bestseller_bool,
        int(time.time() * 1000),
    )
    await audit(conn, None, "product.add", str(name), {"price": price, "category": category})
    return {"success": True, "message": "Product added"}


@router.post("/remove")
async def remove_product(
    body: dict = Body(...),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    pid = body.get("id")
    if pid is None:
        return {"success": False, "message": "Missing 'id'"}
    try:
        pid_int = int(pid)
    except (TypeError, ValueError):
        return {"success": False, "message": "Invalid 'id'"}

    result = await conn.execute("DELETE FROM products WHERE id = $1", pid_int)
    # asyncpg returns the command tag, e.g. "DELETE 1"
    if result.endswith(" 0"):
        return {"success": False, "message": "Product not found"}
    await audit(conn, None, "product.remove", str(pid_int))
    return {"success": True, "message": "Product deleted"}

# Product detail + bulk seed

import re as _re
from fastapi import HTTPException as _HTTPException


@router.get("/{product_id}")
async def get_product(
    product_id: str,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Return a single product by integer id (the value List.jsx puts in `_id`)."""
    try:
        pid = int(product_id)
    except ValueError:
        raise _HTTPException(status_code=400, detail="Invalid product id")
    row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", pid)
    if not row:
        raise _HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": _row_to_product(row)}


@router.post("/seed")
async def seed_products(
    overwrite: bool = False,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    assets_path = (
        Path(__file__).resolve().parent.parent.parent.parent
        / "frontend" / "src" / "assets" / "frontend_assets" / "assets.js"
    )
    if not assets_path.exists():
        raise _HTTPException(
            status_code=404,
            detail=f"assets.js not found at {assets_path}",
        )

    text = assets_path.read_text(encoding="utf-8")

    m = _re.search(r"export\s+const\s+products\s*=\s*", text)
    if not m:
        raise _HTTPException(status_code=500, detail="Could not find `export const products` in assets.js")
    start = text.find("[", m.end())
    if start < 0:
        raise _HTTPException(status_code=500, detail="Products array literal not found")
    depth = 0
    end = -1
    for i in range(start, len(text)):
        c = text[i]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end < 0:
        raise _HTTPException(status_code=500, detail="Products array literal not balanced")

    array_src = text[start:end]
    try:
        products = json.loads(array_src)
    except json.JSONDecodeError as e:
        raise _HTTPException(status_code=500, detail=f"Could not parse products array as JSON: {e}")

    if overwrite:
        await conn.execute("DELETE FROM products")

    inserted = 0
    skipped = 0
    for p in products:
        if not overwrite:
            exists = await conn.fetchval(
                "SELECT id FROM products WHERE name = $1", p.get("name", "")
            )
            if exists:
                skipped += 1
                continue
        await conn.execute(
            """
            INSERT INTO products
                (name, description, price, image, category, sub_category, sizes, bestseller, date)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9)
            """,
            p.get("name", ""),
            p.get("description", ""),
            float(p.get("price", 0)),
            json.dumps(p.get("image", [])),
            p.get("category"),
            p.get("subCategory"),
            json.dumps(p.get("sizes", [])),
            bool(p.get("bestseller", False)),
            int(p.get("date", 0)),
        )
        inserted += 1

    return {
        "success":  True,
        "message":  f"Seeded {inserted} product(s); {skipped} skipped (already existed).",
        "inserted": inserted,
        "skipped":  skipped,
        "total":    len(products),
    }


@router.patch("/{product_id}")
async def update_product(
    product_id: str,
    body: dict = Body(...),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    try:
        pid = int(product_id)
    except ValueError:
        return {"success": False, "message": "Invalid product id"}

    existing = await conn.fetchrow("SELECT id FROM products WHERE id = $1", pid)
    if not existing:
        return {"success": False, "message": "Product not found"}

    # Build a SQL SET clause from whichever fields the caller sent.
    field_map = {
        "name":        "name",
        "description": "description",
        "price":       "price",
        "category":    "category",
        "subCategory": "sub_category",
        "bestseller":  "bestseller",
        "stock":       "stock",
    }
    sets = []
    args = []
    i = 1
    for body_key, db_col in field_map.items():
        if body_key in body and body[body_key] is not None:
            sets.append(f"{db_col} = ${i}")
            args.append(body[body_key])
            i += 1

    # sizes is a JSON array
    if "sizes" in body and body["sizes"] is not None:
        sets.append(f"sizes = ${i}::jsonb")
        args.append(json.dumps(body["sizes"]))
        i += 1

    if not sets:
        return {"success": False, "message": "Nothing to update"}

    args.append(pid)
    sql = f"UPDATE products SET {', '.join(sets)} WHERE id = ${i}"
    await conn.execute(sql, *args)
    await audit(conn, None, "product.update", str(pid), body)
    return {"success": True, "message": "Product updated"}

