"use client";

import type React from "react";

import { createContext, useContext, useState, useEffect, useRef } from "react";

type CoinContextType = {
  coins: number;
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => void;
};

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export function CoinProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Load coins from localStorage on initial render
    const savedCoins = localStorage.getItem("coins");
    if (savedCoins) {
      setCoins(Number(savedCoins));
    }
    // Mark initial load complete after a tick
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    // Skip saving during initial load to prevent unnecessary writes
    if (isInitialLoadRef.current) return;

    // Debounce localStorage writes by 1 second to reduce disk I/O
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem("coins", coins.toString());
      saveTimeoutRef.current = null;
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [coins]);

  const addCoins = (amount: number) => {
    setCoins((prev) => prev + amount);
  };

  const deductCoins = (amount: number) => {
    setCoins((prev) => Math.max(0, prev - amount));
  };

  return (
    <CoinContext.Provider value={{ coins, addCoins, deductCoins }}>
      {children}
    </CoinContext.Provider>
  );
}

export const useCoin = (): CoinContextType => {
  const context = useContext(CoinContext);

  if (context === undefined) {
    throw new Error("useCoin must be used within a CoinProvider");
  }

  return context;
};
