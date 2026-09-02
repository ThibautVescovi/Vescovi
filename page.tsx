"use client";

import React, { useState, useTransition } from 'react';
import { saveBaby, type SaveBabyPayload } from './actions';

export default function BabyForm() {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [predictedName, setPredictedName] = useState<string>('');
  const [predictedDate, setPredictedDate] = useState<string>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const payload: SaveBabyPayload = {
      first_name: firstName || null,
      last_name: lastName || null,
      predicted_name: predictedName || null,
      predicted_date: predictedDate || null,
      weight: typeof weight === 'number' ? weight : null,
      height: typeof height === 'number' ? height : null,
    };

    startTransition(async () => {
      try {
        const res = await saveBaby(payload);
        if (res.ok) {
          setMessage(res.message || 'Merci !');
          setFirstName('');
          setLastName('');
          setPredictedName('');
          setPredictedDate('');
          setWeight('');
          setHeight('');
        } else {
          setError(res.message || 'Une erreur est survenue');
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white py-8 px-4">
      <header className="max-w-2xl mx-auto text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-serif text-amber-600">Le Petit Prince — Prédictions</h1>
        <p className="mt-2 text-sm text-gray-600">Partagez vos prédictions avec douceur et poésie ✨</p>
      </header>

      <main className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Prénom</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Antoine"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Nom</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: de Saint-Exupéry"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Prénom prédit</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={predictedName}
                onChange={(e) => setPredictedName(e.target.value)}
                placeholder="Le prénom que vous prédisez"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Date prévue</span>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={predictedDate}
                onChange={(e) => setPredictedDate(e.target.value)}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Poids (kg)</span>
              <input
                type="number"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={weight as any}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="3.2"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Taille (cm)</span>
              <input
                type="number"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-amber-300 focus:ring-amber-200"
                value={height as any}
                onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="50"
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? 'Envoi...' : 'Envoyer'}
            </button>

            {message && <span className="text-green-600">{message}</span>}
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </form>

        <footer className="mt-6 text-xs text-gray-500">
          <p>« On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. » — Le Petit Prince</p>
        </footer>
      </main>

      <div className="max-w-2xl mx-auto text-center mt-6 text-sm text-gray-600">
        <p>Merci de garder l'esprit du Petit Prince en partageant vos prédictions avec bienveillance.</p>
      </div>
    </div>
  );
}
