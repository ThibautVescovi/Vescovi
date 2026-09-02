"use client";

import React, { useState, useTransition } from "react";
import { saveBaby, type SaveBabyPayload } from "./actions";
import bg from './aa5589c7223e98b6b912b5994f2fb418.jpg';

export default function BabyStandalonePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [predictedName, setPredictedName] = useState("");
  const [predictedDate, setPredictedDate] = useState("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>, setter: (v: number | "") => void) {
    const v = e.target.value;
    setter(v === "" ? "" : Number(v));
    if (status) setStatus(null);
  }

  function clearForm() {
    setFirstName("");
    setLastName("");
    setPredictedName("");
    setPredictedDate("");
    setWeight("");
    setHeight("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const payload: SaveBabyPayload = {
      first_name: firstName || null,
      last_name: lastName || null,
      predicted_name: predictedName || null,
      predicted_date: predictedDate || null,
      weight: typeof weight === "number" ? weight : null,
      height: typeof height === "number" ? height : null,
    };

    startTransition(async () => {
      const res = await saveBaby(payload);
      if (res.ok) {
        setSubmitted(true);
        setStatus(res.message);
        clearForm();
      } else {
        setStatus(res.message);
      }
    });
  }

  return (
    <div
      className="mx-auto w-full rounded-2xl p-8 backdrop-blur-md shadow-2xl border border-white/6 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(6,18,36,0.64) 0%, rgba(4,12,22,0.72) 100%), url(${bg.src})`,
        backgroundBlendMode: 'overlay',
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-3">
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="#FFDDAA" />
            <circle cx="18" cy="18" r="2.2" fill="#8B5CF6" />
            <path d="M36 24c3 4 6 6 8 8" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 36c2-3 4-5 6-6" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <h1 className="text-3xl font-serif font-extrabold text-white">Le Petit Prince</h1>
        </div>

        <p className="mb-6 max-w-xl text-sm text-white/80">Un petit questionnaire pour deviner notre bébé ✨</p>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-lg bg-emerald-700/10 border border-emerald-300/20 p-6 text-center">
          <p className="text-2xl font-semibold text-emerald-200">Merci pour ta prédiction !</p>
          <p className="mt-2 text-sm text-emerald-100/90">Ton geste est enregistré parmi les étoiles.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Prénom</label>
            <input
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); if (status) setStatus(null); }}
              placeholder="Ex. Antoine"
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Nom</label>
            <input
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); if (status) setStatus(null); }}
              placeholder="Ex. de Saint-Exupéry"
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Prénom prédit</label>
            <input
              value={predictedName}
              onChange={(e) => { setPredictedName(e.target.value); if (status) setStatus(null); }}
              placeholder="Le prénom que tu imagines..."
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Date prévue</label>
            <input
              type="date"
              value={predictedDate}
              onChange={(e) => { setPredictedDate(e.target.value); if (status) setStatus(null); }}
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Poids (kg)</label>
            <input
              type="number"
              min="0"
                          step="0.001"
              value={weight === "" ? "" : String(weight)}
              onChange={(e) => handleNumberChange(e, setWeight)}
                          placeholder="Ex. 3.452"
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">Taille (cm)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={height === "" ? "" : String(height)}
              onChange={(e) => handleNumberChange(e, setHeight)}
              placeholder="Ex. 50"
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="sm:col-span-2 mt-2 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-60"
              >
                {isPending ? "Enregistrement…" : "Envoyer ma prédiction"}
              </button>

              <button
                type="button"
                onClick={() => { clearForm(); setStatus(null); }}
                className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm text-white/90 hover:bg-white/5"
              >
                Effacer
              </button>
            </div>

            <div>
              {status ? (
                <p className={`text-sm ${submitted ? "text-emerald-300" : "text-rose-400"}`}>{status}</p>
              ) : null}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
