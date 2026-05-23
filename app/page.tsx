'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart, ShieldCheck } from 'lucide-react';

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  location: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  inventories: WarehouseStock[];
}

interface PendingReservation {
  id: string;
  expiresAt: string;
  status: string;
}

function countdown(expiresAt: string) {
  const delta = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const minutes = Math.floor(delta / 60);
  const seconds = delta % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function HomePage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveLoading, setReserveLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pendingReservation, setPendingReservation] = useState<PendingReservation | null>(null);
  const [pendingTimer, setPendingTimer] = useState('00:00');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedId = window.localStorage.getItem('pendingReservationId');
    if (!storedId) return;

    fetch(`/api/reservations/${storedId}`)
      .then(async (res) => {
        if (!res.ok) {
          window.localStorage.removeItem('pendingReservationId');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || data.status !== 'PENDING') {
          window.localStorage.removeItem('pendingReservationId');
          setPendingReservation(null);
          return;
        }

        setPendingReservation(data);
      })
      .catch(() => {
        window.localStorage.removeItem('pendingReservationId');
        setPendingReservation(null);
      });
  }, []);

  useEffect(() => {
    if (!pendingReservation) return;
    const tick = () => setPendingTimer(countdown(pendingReservation.expiresAt));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [pendingReservation]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('pageTheme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load products.');
        setLoading(false);
      });
  }, []);

  const availableCount = useMemo(() => {
    return products.reduce((sum, product) => sum + product.inventories.reduce((acc, inventory) => acc + inventory.availableUnits, 0), 0);
  }, [products]);

  const getQuantity = (key: string, available: number) => {
    if (available <= 0) {
      return 0;
    }
    const current = quantities[key];
    if (current == null) {
      return 1;
    }
    return Math.max(1, Math.min(available, current));
  };

  const setQuantity = (key: string, value: number, available: number) => {
    setQuantities((state) => ({
      ...state,
      [key]: available <= 0 ? 0 : Math.max(1, Math.min(available, value))
    }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('pageTheme', nextTheme);
  };

  const isDark = theme === 'dark';
  const pageBgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-950';
  const cardBaseClass = isDark
    ? 'border-slate-700/70 bg-slate-900/90 text-slate-100'
    : 'border-slate-200 bg-white text-slate-950';
  const inventoryCardClass = isDark
    ? 'border-slate-700/60 bg-slate-900/80'
    : 'border-slate-200 bg-slate-50';
  const buttonPrimaryClass = isDark
    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400'
    : 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500';

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-700 ${pageBgClass}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl opacity-80" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl opacity-80" />
        <div className="absolute left-1/2 bottom-0 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl opacity-70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className={`mb-8 overflow-hidden rounded-[2rem] border px-6 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl ${isDark ? 'border-slate-700/70 bg-slate-950/90' : 'border-white/80 bg-white/95'}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-700 shadow-card">
                Allo reservation studio
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Reserve stock with style</h1>
                <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Choose the quantity you want and lock inventory in a floating experience. Switch between a polished light page and a bold dark theme anytime.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={`rounded-3xl px-4 py-3 text-sm font-medium shadow-sm ${isDark ? 'bg-slate-900/80 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
                {isDark ? 'Dark mode active' : 'Light mode active'}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${isDark ? 'bg-sky-500 hover:bg-sky-400' : 'bg-slate-900 hover:bg-slate-700'}`}
              >
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className={`rounded-[2rem] border px-6 py-6 ${cardBaseClass} shadow-[0_30px_80px_rgba(15,23,42,0.08)]`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-cyan-300' : 'text-sky-600'}`}>Stock summary</p>
                <h2 className="mt-3 text-3xl font-semibold">Total available inventory</h2>
              </div>
              <div className={`rounded-3xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
                {availableCount} available
              </div>
            </div>
            <p className={`mt-5 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              The reserve hold is created instantly and can be resumed or canceled before the timer expires.
            </p>
          </article>

          {error ? (
            <article className={`rounded-[2rem] border px-6 py-6 ${cardBaseClass} border-rose-400/40 bg-rose-50/80 text-rose-700 shadow-[0_30px_80px_rgba(15,23,42,0.08)]`}>
              <p className="text-sm font-semibold">Error</p>
              <p className="mt-3 text-sm leading-7 text-rose-700">{error}</p>
            </article>
          ) : pendingReservation ? (
            <article className={`rounded-[2rem] border px-6 py-6 ${cardBaseClass} shadow-[0_30px_80px_rgba(15,23,42,0.08)]`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-cyan-300' : 'text-sky-700'}`}>Active checkout hold</p>
                  <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    You can return to confirm or cancel without resetting the timer.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Expires in {pendingTimer}</p>
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onClick={() => router.push(`/reservations/${pendingReservation.id}`)}
                  >
                    Resume checkout
                  </button>
                </div>
              </div>
            </article>
          ) : null}
        </section>

        {loading ? (
          <div className={`mt-6 rounded-[2rem] border px-6 py-10 ${cardBaseClass} text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)]`}>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm leading-7 text-slate-500">Loading products...</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className={`overflow-hidden rounded-[2rem] border p-6 ${cardBaseClass} shadow-[0_30px_80px_rgba(15,23,42,0.08)]`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{product.sku}</p>
                    <h3 className="mt-3 text-2xl font-semibold">{product.name}</h3>
                  </div>
                  <div className={`rounded-3xl px-4 py-2 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
                    {product.inventories.length} warehouses
                  </div>
                </div>
                <p className={`mt-4 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{product.description}</p>

                <div className="mt-6 space-y-4">
                  {product.inventories.map((inventory) => (
                    <div key={inventory.warehouseId} className={`rounded-[1.75rem] border p-5 ${inventoryCardClass}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{inventory.warehouseName}</p>
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{inventory.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{inventory.availableUnits} available</p>
                          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{inventory.totalUnits} total · {inventory.reservedUnits} reserved</p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <span>Qty</span>
                          <input
                            type="number"
                            min={1}
                            max={inventory.availableUnits}
                            value={getQuantity(`${product.id}:${inventory.warehouseId}`, inventory.availableUnits)}
                            disabled={inventory.availableUnits <= 0}
                            onChange={(event) => setQuantity(`${product.id}:${inventory.warehouseId}`, Number(event.target.value), inventory.availableUnits)}
                            className="w-20 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                          />
                        </label>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition ${buttonPrimaryClass} disabled:cursor-not-allowed disabled:opacity-60`}
                          onClick={() => handleReserve(product.id, inventory.warehouseId, getQuantity(`${product.id}:${inventory.warehouseId}`, inventory.availableUnits))}
                          disabled={inventory.availableUnits <= 0 || reserveLoading === `${product.id}:${inventory.warehouseId}`}
                        >
                          {reserveLoading === `${product.id}:${inventory.warehouseId}` ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Reserving...</>
                          ) : (
                            <><ShoppingCart className="h-4 w-4" /> Reserve</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
