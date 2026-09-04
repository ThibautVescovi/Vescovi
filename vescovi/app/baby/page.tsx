"use client";

import React, { useState, useTransition } from "react";
import { saveBaby, type SaveBabyPayload } from "./actions";

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
  const birthListUrl = "https://www.mesenvies.fr/liste-naissance?r=27&aid=2636957&lid=4756017#127624940";

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
    <div className="mx-auto w-full rounded-2xl p-8 shadow-lg border border-slate-100 bg-gradient-to-br from-[#FFF9EE] via-[#FFFDF9] to-[#EAF6FF]">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-3xl font-serif font-extrabold text-slate-900">Le Petit Prince ✨</h1>
        </div>
        <p className="mb-6 max-w-xl text-sm text-slate-700">
          Notre petit bébé arrive bientôt… 👶🍼<br/>
          À vous de deviner son prénom, sa date de naissance, son poids et sa taille !<br/>
          Le meilleur pronostic remportera un super cadeau 🎁✨<br/>
        </p>

      </div>

      {submitted ? (
        <div className="mt-4 rounded-lg bg-[#F0FFF4] border border-slate-200 p-6 text-center">
          <p className="text-2xl font-semibold text-slate-900">Merci pour ta prédiction !</p>
          <p className="mt-2 text-sm text-slate-700">Ta prédiction a bien été enregistrée.</p>
          <p className="mt-3 text-sm text-slate-700">
            Tu peux aussi consulter notre{' '}
            <a
              href={birthListUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline decoration-2 underline-offset-2 text-slate-900 hover:text-slate-700"
            >
              liste de naissance
            </a>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Ton prénom</label>
            <input
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); if (status) setStatus(null); }}
              placeholder="Ex. Pauline"
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Ton nom</label>
            <input
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); if (status) setStatus(null); }}
              placeholder="Ex. Ox"
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Le prénom que tu prédis</label>
            <input
              value={predictedName}
              onChange={(e) => { setPredictedName(e.target.value); if (status) setStatus(null); }}
              placeholder="Ex. Abdel-Rachid"
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">La date de naissance ? (Terme théorique le 27/10/2026)</label>
            <input
              type="date"
              value={predictedDate}
              onChange={(e) => { setPredictedDate(e.target.value); if (status) setStatus(null); }}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Le poids (kg)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={weight === "" ? "" : String(weight)}
              onChange={(e) => handleNumberChange(e, setWeight)}
              placeholder="Ex. 7.852"
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">La taille (cm)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={height === "" ? "" : String(height)}
              onChange={(e) => handleNumberChange(e, setHeight)}
              placeholder="Ex. 182"
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className="sm:col-span-2 mt-2 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-amber-300 px-5 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-amber-400 disabled:opacity-60"
              >
                {isPending ? "Enregistrement…" : "Envoyer ma prédiction"}
              </button>

              <button
                type="button"
                onClick={() => { clearForm(); setStatus(null); }}
                className="rounded-full border border-slate-200 bg-transparent px-4 py-2 text-sm text-slate-900 hover:bg-slate-50"
              >
                Effacer
              </button>
            </div>

            <div>
              {status ? (
                <p className={`text-sm ${submitted ? "text-emerald-700" : "text-rose-600"}`}>{status}</p>
              ) : null}
            </div>
          </div>

          <div className="sm:col-span-2 mt-1 text-center">
            <a
              href={birthListUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[14px] text-slate-500 underline decoration-slate-400 underline-offset-2 transition hover:text-slate-700"
            >
              Consulter notre liste de naissance
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
