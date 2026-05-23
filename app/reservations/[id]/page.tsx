'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ReservationDetail {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  location: string;
  quantity: number;
  status: string;
  expiresAt: string;
}

function countdown(expiresAt: string) {
  const delta = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const minutes = Math.floor(delta / 60);
  const seconds = delta % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | null>(null);
  const [count, setCount] = useState('00:00');

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/reservations/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          window.localStorage.removeItem('pendingReservationId');
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'Failed to load reservation');
        }
        return res.json();
      })
      .then((data) => {
        setReservation(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params?.id]);

  useEffect(() => {
    if (!reservation) return;
    if (reservation.status !== 'PENDING') {
      window.localStorage.removeItem('pendingReservationId');
      setCount('00:00');
      return;
    }

    const tick = () => setCount(countdown(reservation.expiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [reservation]);

  useEffect(() => {
    if (!reservation || reservation.status !== 'PENDING') return;
    const expiryMs = new Date(reservation.expiresAt).getTime() - Date.now();
    if (expiryMs <= 0) {
      submitAction('release');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      submitAction('release');
    }, expiryMs);

    return () => window.clearTimeout(timeoutId);
  }, [reservation]);

  async function submitAction(action: 'confirm' | 'release') {
    if (!reservation) return;
    setError(null);
    setActionLoading(action === 'confirm' ? 'confirm' : 'cancel');

    const response = await fetch(`/api/reservations/${reservation.id}/${action}`, {
      method: 'POST'
    });

    setActionLoading(null);
    if (response.ok) {
      const data = await response.json();
      if (data?.id) {
        setReservation(data);
      } else if (action === 'release') {
        // In case release returns only a message, refresh the reservation data from API
        const refreshed = await fetch(`/api/reservations/${reservation.id}`);
        if (refreshed.ok) {
          setReservation(await refreshed.json());
        }
      }
      if (action === 'confirm') {
        router.refresh();
      }
      return;
    }

    if (response.status === 410) {
      window.localStorage.removeItem('pendingReservationId');
      setError('This reservation has expired. The hold has been released.');
      return;
    }

    const body = await response.json().catch(() => null);
    setError(body?.message || 'Unable to complete action.');
  }

  const statusLabel = useMemo(() => {
    if (!reservation) return '';
    switch (reservation.status) {
      case 'PENDING': return 'Pending';
      case 'CONFIRMED': return 'Confirmed';
      case 'RELEASED': return 'Released';
      default: return reservation.status;
    }
  }, [reservation]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <button
          type="button"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => router.push('/')}
        >
          Back to products
        </button>
        <div className="flex gap-4 flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Reservation details</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Checkout hold</h1>
            <p className="mt-2 text-sm text-slate-600">Confirm within the timer or cancel to release stock.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
            <p className="text-sm text-slate-500">Expires in</p>
            <p className="mt-1 text-2xl font-semibold">{count}</p>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3">Loading reservation...</p>
        </div>
      ) : reservation ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl bg-white p-6 shadow-card">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Product</p>
                <p className="mt-1 text-xl font-semibold">{reservation.productName}</p>
                <p className="text-sm text-slate-500">{reservation.sku}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Warehouse</p>
                <p className="mt-1 text-base font-semibold">{reservation.warehouseName}</p>
                <p className="text-sm text-slate-500">{reservation.location}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Quantity reserved</p>
                  <p className="mt-1 text-xl font-semibold">{reservation.quantity}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-1 text-xl font-semibold">{statusLabel}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-card">
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Reservation ID</p>
                <p className="mt-1 text-xs text-slate-600 break-all">{reservation.id}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => submitAction('confirm')}
                  disabled={reservation.status !== 'PENDING' || actionLoading !== null}
                >
                  {actionLoading === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm purchase
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => submitAction('release')}
                  disabled={reservation.status !== 'PENDING' || actionLoading !== null}
                >
                  {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancel reservation
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
