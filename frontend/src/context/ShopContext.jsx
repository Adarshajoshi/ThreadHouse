import { createContext, useEffect, useState } from "react";
import { products } from "../assets/frontend_assets/assets"
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const ShopContext = createContext();

const CART_STORAGE_KEY   = 'th_cart';
const ORDERS_STORAGE_KEY = 'th_orders';

const ShopContextProvider = (props) => {

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
        setUser(null)
        localStorage.removeItem('th_token')
        localStorage.removeItem('th_user')
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

    const [orders, setOrders] = useState(() => {
        try {
            const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); }
        catch { }
    }, [orders]);

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

        try {
            await fetch(`${API_BASE}/api/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id:       newOrder.orderId,
                items:          cartProductList,
                delivery_info:  deliveryInfo,
                payment_method: paymentMethod,
                total:          newOrder.total,
            }),
            })
        } catch {
            toast.error('Order saved locally only — server unavailable')
        }

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
