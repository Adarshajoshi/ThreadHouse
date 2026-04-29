from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import json
import os

router=APIRouter()

_PRODUCTS_PATH=os.getenv("PRODUCTS_JSON",os.path.join(os.path.dirname(__file__),"..","products.json"))

def _load_products()->list[dict]:
    if not os.path.exists(_PRODUCTS_PATH):
        return[]
    with open(_PRODUCTS_PATH,encoding="utf-8") as f:
        return json.load(f)

@router.get("/")
async def list_products(
    category:    Optional[str] = Query(None, description="Men | Women | Kids"),
    subCategory: Optional[str] = Query(None, description="Topwear | Bottomwear | ..."),
    bestseller:  Optional[bool] = Query(None),
    search:      Optional[str] = Query(None, description="Full-text search on name"),
    min_price:   Optional[float] = Query(None, ge=0),
    max_price:   Optional[float] = Query(None, ge=0),
    sort:        Optional[str] = Query(None, description="price_asc | price_desc | newest"),
    limit:       int = Query(50, ge=1, le=200),
    offset:      int = Query(0, ge=0),
):
    products=_load_products()
    
    if category:
        products=[p for p in products if p.get("category","").lower==category.lower()] 
    if subCategory:
        products=[p for p in products if p.get("subCategory","").lower==subCategory.lower()] 
    if bestseller is not None:
        products=[p for p in products if bool(p.get("bestseller")).lower==bestseller.lower()] 
    if search:
        q=search.lower()
    products=[p for p in products if q in p.get("name","").lower()]
    if min_price is not None:
        products = [p for p in products if p.get("price", 0) >= min_price]
    if max_price is not None:
        products = [p for p in products if p.get("price", 0) <= max_price]

    
    if sort=="price_asc":
        products.sort(key=lambda p:p.get("price",0))
    elif sort=="price_desc":
        products.sort(key=lambda p:p.get("price",0),reverse=True)
    elif sort=="newest":
        products.sort(key=lambda p: p.get("date", 0), reverse=True)
    
    total=len(products)
    return{
        "total":total,
        "offset":offset,
        "limit":limit,
        "products":products[offset:offset+limit]
    }


@router.get("/categories")
async def get_categories():
    products=_load_products()
    cats:dict[str,set]={}
    for p in products:
        cat=p.get("category")
        sub=p.get("subCategory")
        if cat:
            cats.setdefault(cat,set())
            if sub:
                cats[cat].add(sub)
    return {k:sorted(v) for k, v in cats.items()}

@router.get("/{products_id}")
async def get_products(product_id:str):
    products=_load_products()
    for p in products:
        if p.get("id")==product_id:
            return p
    raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")