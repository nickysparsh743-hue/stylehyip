'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        if (typeof window === 'undefined') {
            return [];
        }

        const saved = window.localStorage.getItem('stylehyip-cart');
        if (!saved) {
            return [];
        }

        try {
            return JSON.parse(saved);
        } catch (error) {
            console.error('Failed to parse cart data', error);
            return [];
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('stylehyip-cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (product, quantity = 1) => {
        setItems((currentItems) => {
            const existingItem = currentItems.find((item) => item.id === product.id);
            if (existingItem) {
                return currentItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...currentItems, { ...product, quantity }];
        });
    };

    const updateQuantity = (productId, quantity) => {
        setItems((currentItems) => {
            if (quantity <= 0) {
                return currentItems.filter((item) => item.id !== productId);
            }
            return currentItems.map((item) =>
                item.id === productId ? { ...item, quantity } : item
            );
        });
    };

    const removeFromCart = (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
    };

    const clearCart = () => setItems([]);

    const subtotal = useMemo(
        () => items.reduce((total, item) => total + item.price * item.quantity, 0),
        [items]
    );

    const itemCount = useMemo(() => items.reduce((count, item) => count + item.quantity, 0), [items]);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                subtotal,
                itemCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
