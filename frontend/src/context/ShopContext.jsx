import { createContext, useEffect, useState } from "react";
import { products } from "../assets/frontend_assets/assets"
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { trackAddToCart, trackCheckoutStart, trackPurchase, trackLogout, trackEvent } from "../hooks/useAnalytics";

export const ShopContext = createContext();

const CART_STORAGE_KEY   = 'th_cart';
const ORDERS_STORAGE_KEY = 'th_orders';

const ShopContextProvider = (props) => {

    const API_BASE    = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const currency    = '$';
    const delivery_fee = 10;
    const [search, setSearch]         = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const navigate = useNavigate();

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('th_user')) || null
        } catch { return null }
        })

        const isLoggedIn = !!user

        const logout = () => {
        trackLogout()
        setUser(null)
        localStorage.removeItem('th_token')
        localStorage.removeItem('th_user')
        localStorage.removeItem(ORDERS_STORAGE_KEY)   // clear any legacy shared order cache
        setOrders([])                                 // don't leak orders to the next account
        toast.success('Logged out successfully')
        navigate('/login')
        }

    const [cartItems, setCartItems] = useState(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    useEffect(() => {
        try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }
        catch { }
    }, [cartItems]);

    // Order history is fetched per-user from the backend (GET /api/orders/me),
    // which returns ONLY the logged-in user's orders. It is intentionally not
    // cached in a shared localStorage key — doing so previously leaked one
    // account's orders to another account on the same browser.
    const [orders, setOrders] = useState([]);

    const _parseJSON = (v, fallback) => {
        if (v == null) return fallback;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
        return v;
    };

    const fetchMyOrders = async () => {
        const token = localStorage.getItem('th_token');
        if (!token) { setOrders([]); return; }
        try {
            const res = await fetch(`${API_BASE}/api/orders/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) { setOrders([]); return; }
            const data = await res.json();
            const list = data.orders || [];
            setOrders(list.map(o => ({
                orderId:       o.order_id,
                items:         _parseJSON(o.items, []),
                deliveryInfo:  _parseJSON(o.delivery_info, {}),
                paymentMethod: o.payment_method,
                status:        o.status || 'Order Placed',
                total:         o.total,
                date:          o.created_at
                    ? new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '',
            })));
        } catch {
            setOrders([]);
        }
    };

    // Reload orders whenever the logged-in user changes (login / logout / account switch).
    useEffect(() => {
        fetchMyOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // ---- Wishlist (favorites) ----
    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('th_wishlist')) || []; }
        catch { return []; }
    });
    useEffect(() => {
        try { localStorage.setItem('th_wishlist', JSON.stringify(wishlist)); } catch {}
    }, [wishlist]);

    const toggleWishlist = (productId) => {
        const product = products.find(p => p._id === productId);
        const isAdding = !wishlist.includes(productId);
        setWishlist(w => isAdding ? [...w, productId] : w.filter(id => id !== productId));
        trackEvent(isAdding ? 'wishlist_add' : 'wishlist_remove', {
            element: `product:${productId}`,
            value:   String(productId),
            monetary_value: product?.price ?? null,
            page:    window.location.pathname,
        });
        toast.success(isAdding ? 'Added to wishlist' : 'Removed from wishlist');
    };
    const isWishlisted = (id) => wishlist.includes(id);

    const placeOrder = async(deliveryInfo, paymentMethod) => {
        const cartProductList = [];
        for (const itemId in cartItems) {
            for (const size in cartItems[itemId]) {
                if (cartItems[itemId][size] > 0) {
                    const product = products.find(p => p._id === itemId);
                    if (product) {
                        cartProductList.push({
                            _id:      itemId,
                            name:     product.name,
                            price:    product.price,
                            image:    product.image,
                            size,
                            quantity: cartItems[itemId][size],
                        });
                    }
                }
            }
        }

        if (cartProductList.length === 0) return;

        const newOrder = {
            orderId: 'TH-' + Date.now(),
            items: cartProductList,
            deliveryInfo,
            paymentMethod,
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'Order Placed',
            total: getCartAmount() + delivery_fee,
        };

        // RFM: checkout intent
        const itemCount = cartProductList.reduce((n, p) => n + (p.quantity || 0), 0);
        trackCheckoutStart(newOrder.total, itemCount);

        const token = localStorage.getItem('th_token');
        let serverOk = false;
        try {
            const res = await fetch(`${API_BASE}/api/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    order_id:       newOrder.orderId,
                    items:          cartProductList,
                    delivery_info:  deliveryInfo,
                    payment_method: paymentMethod,
                    total:          newOrder.total,
                }),
            });
            serverOk = res.ok;
        } catch {
            toast.error('Order saved locally only — server unavailable');
        }

        // RFM: purchase event (always fired, even if server save failed,
        // so the analytics_events table still records it)
        trackPurchase(newOrder.orderId, newOrder.total, itemCount);

        setOrders(prev => [newOrder, ...prev]);
        setCartItems({});
        localStorage.removeItem(CART_STORAGE_KEY);
        toast.success('Order placed successfully!');
        navigate('/orders');
    };

    const addToCart = (itemId, size) => {
        if (!size) { toast.error('Select Product Size'); return; }
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId][size] = (cartData[itemId][size] || 0) + 1;
        } else {
            cartData[itemId] = { [size]: 1 };
        }
        setCartItems(cartData);

        // RFM tracking - record price so the backend can score Monetary
        const product = products.find(p => p._id === itemId);
        trackAddToCart(itemId, product?.price ?? null, size);

        toast.success('Item added to cart!');
    };

    const getCartCount = () => {
        let total = 0;
        for (const id in cartItems)
            for (const size in cartItems[id])
                if (cartItems[id][size] > 0) total += cartItems[id][size];
        return total;
    };

    const updateQuantity = (itemId, size, quantity) => {
        let cartData = structuredClone(cartItems);
        cartData[itemId][size] = quantity;
        setCartItems(cartData);
    };

    const getCartAmount = () => {
        let total = 0;
        for (const id in cartItems) {
            const info = products.find(p => p._id === id);
            if (!info) continue;
            for (const size in cartItems[id])
                if (cartItems[id][size] > 0) total += info.price * cartItems[id][size];
        }
        return total;
    };

    const clearCart = () => {
        setCartItems({});
        localStorage.removeItem(CART_STORAGE_KEY);
    };

    const value = {
        products, currency, delivery_fee,
        search, setSearch, showSearch, setShowSearch,
        cartItems, addToCart, getCartCount, updateQuantity, getCartAmount, clearCart,
        orders, placeOrder,
        wishlist, toggleWishlist, isWishlisted,
        navigate,
        user,setUser, isLoggedIn, logout,
    };

    return (
        <ShopContext.Provider value={value}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
