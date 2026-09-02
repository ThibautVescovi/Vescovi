"use client";

import React, { useState, useTransition } from "react";
import { saveBaby, type SaveBabyPayload } from "./actions";

export default function BabyPage() {
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

  function onSubmit(e: React.FormEvent) {
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
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <section className="rounded-[1.5rem] border border-white/8 bg-gradient-to-b from-amber-50/60 to-white/40 p-6 shadow-lg">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-serif font-extrabold text-amber-700">Le Petit Prince — Pronostic Bébé</h1>
          <p className="mt-2 text-sm text-amber-600">Laisse une petite prédiction, que les étoiles veillent sur elle/ lui ✨</p>
        </header>

        {submitted ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-6 text-center">
            <p className="text-lg font-bold text-emerald-800">Merci !</p>
            <p className="mt-2 text-sm text-emerald-700">Ta prédiction a bien été enregistrée.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-amber-700">Prénom</label>
              <input
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); if (status) setStatus(null); }}
                placeholder="Ex. Antoine"
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-700">Nom</label>
              <input
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); if (status) setStatus(null); }}
                placeholder="Ex. de Saint-Exupéry"
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-amber-700">Prénom prédit</label>
              <input
                value={predictedName}
                onChange={(e) => { setPredictedName(e.target.value); if (status) setStatus(null); }}
                placeholder="Le prénom que tu imagines..."
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-700">Date prévue</label>
              <input
                type="date"
                value={predictedDate}
                onChange={(e) => { setPredictedDate(e.target.value); if (status) setStatus(null); }}
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-700">Poids (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weight === "" ? "" : String(weight)}
                onChange={(e) => handleNumberChange(e, setWeight)}
                placeholder="Ex. 3.2"
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-700">Taille (cm)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={height === "" ? "" : String(height)}
                onChange={(e) => handleNumberChange(e, setHeight)}
                placeholder="Ex. 50"
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between">
              <div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-amber-950 shadow transition hover:bg-amber-500 disabled:opacity-50"
                >
                  {isPending ? "Enregistrement…" : "Enregistrer ma prédiction"}
                </button>
              </div>

              <div>
                {status ? (
                  <p className={`text-sm ${submitted ? "text-emerald-700" : "text-rose-600"}`}>{status}</p>
                ) : null}
              </div>
            </div>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-amber-600 italic">Un clin d'œil au Petit Prince — que les étoiles protègent les tout-petits ✨</p>
      </section>
    </main>
  );
}
