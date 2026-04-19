'use client';

import { useState } from 'react';
import { ShoppingListForm } from './components/ShoppingListForm';
import { ParsedItemsPanel } from './components/ParsedItemsPanel';
import { BasketComparison } from './components/BasketComparison';
import type { ParsedItem, BasketsResponse } from './components/types';

export default function Home() {
  const [stage, setStage] = useState<'input' | 'parsing' | 'clarifying' | 'computing' | 'done' | 'error'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [baskets, setBaskets] = useState<BasketsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(text: string) {
    setRawText(text);
    setStage('parsing');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/parse-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה בפענוח הרשימה');
      const { items } = (await res.json()) as { items: ParsedItem[] };
      setParsedItems(items);

      const needsClarify = items.some(it => it.clarify_needed);
      if (needsClarify) {
        setStage('clarifying');
      } else {
        await computeBaskets(items);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }

  async function computeBaskets(items: ParsedItem[]) {
    setStage('computing');
    try {
      const res = await fetch('/api/basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה בחישוב הסל');
      const data = (await res.json()) as BasketsResponse;
      setBaskets(data);
      setStage('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }

  function handleClarifyDone(refined: ParsedItem[]) {
    setParsedItems(refined);
    void computeBaskets(refined);
  }

  function handleReset() {
    setStage('input');
    setBaskets(null);
    setParsedItems([]);
    setErrorMsg(null);
  }

  return (
    <main className="mx-auto max-w-4xl p-6" data-id="home-page">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-emerald-800">פשוט להזמין</h1>
        <p className="mt-2 text-gray-600">
          כותבים רשימת קניות, מקבלים את הסל הכי זול בין רמי לוי ושופרסל
        </p>
      </header>

      {stage === 'input' && <ShoppingListForm onSubmit={handleSubmit} />}

      {stage === 'parsing' && (
        <div className="text-center py-12 text-gray-600" data-id="parsing-indicator">
          מפענח את הרשימה…
        </div>
      )}

      {stage === 'clarifying' && (
        <ParsedItemsPanel
          items={parsedItems}
          onConfirm={handleClarifyDone}
          onBack={handleReset}
        />
      )}

      {stage === 'computing' && (
        <div className="text-center py-12 text-gray-600" data-id="computing-indicator">
          מחשב סלים…
        </div>
      )}

      {stage === 'done' && baskets && (
        <div>
          <BasketComparison baskets={baskets} rawText={rawText} />
          <div className="mt-6 text-center">
            <button
              data-id="start-over"
              onClick={handleReset}
              className="text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
            >
              להתחיל מחדש
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-800" data-id="error-panel">
          <p className="font-medium">משהו השתבש</p>
          <p className="mt-1 text-sm">{errorMsg}</p>
          <button
            data-id="error-reset"
            onClick={handleReset}
            className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 rounded cursor-pointer text-sm"
          >
            לנסות שוב
          </button>
        </div>
      )}
    </main>
  );
}
