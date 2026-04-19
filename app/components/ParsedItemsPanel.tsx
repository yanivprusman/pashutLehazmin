'use client';

import { useState } from 'react';
import type { ParsedItem } from './types';

export function ParsedItemsPanel({
  items,
  onConfirm,
  onBack,
}: {
  items: ParsedItem[];
  onConfirm: (refined: ParsedItem[]) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  function refine(): ParsedItem[] {
    return items.map((it, i) => {
      if (!it.clarify_needed) return it;
      const answer = answers[i]?.trim();
      if (!answer) return it;
      return {
        ...it,
        query: `${it.query} ${answer}`.trim(),
        clarify_needed: undefined,
        clarify_options: undefined,
        notes: answer,
      };
    });
  }

  return (
    <section className="space-y-4" data-id="parsed-items-panel">
      <h2 className="text-xl font-semibold text-emerald-800">כמה הבהרות זריזות</h2>
      <p className="text-sm text-gray-600">
        כדי למצוא את המוצר המתאים, צריך קצת יותר מידע על הפריטים הבאים:
      </p>

      <ul className="space-y-3">
        {items.map((it, i) => {
          const qtyLabel = it.quantity && it.quantity > 1 ? ` × ${it.quantity}` : '';
          const selected = answers[i] ?? '';
          const options = it.clarify_options ?? [];
          return (
            <li
              key={i}
              className="bg-white rounded-lg border border-emerald-100 p-3"
              data-id={`parsed-item-${i}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{it.query}{qtyLabel}</span>
                {!it.clarify_needed && (
                  <span className="text-emerald-600 text-sm">✓</span>
                )}
              </div>
              {it.clarify_needed && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-700">{it.clarify_needed}</p>
                  {options.length > 0 ? (
                    <div className="flex flex-wrap gap-2" data-id={`clarify-options-${i}`}>
                      {options.map((opt, j) => {
                        const isSelected = selected === opt;
                        return (
                          <button
                            key={j}
                            type="button"
                            data-id={`clarify-${i}-option-${j}`}
                            onClick={() =>
                              setAnswers(a => ({
                                ...a,
                                [i]: isSelected ? '' : opt,
                              }))
                            }
                            className={
                              'px-3 py-1 rounded-full border text-sm cursor-pointer transition-colors ' +
                              (isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50')
                            }
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      data-id={`clarify-${i}`}
                      type="text"
                      value={selected}
                      onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                      placeholder="התשובה שלך…"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                      dir="auto"
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-3 pt-2">
        <button
          data-id="confirm-clarifications"
          onClick={() => onConfirm(refine())}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded cursor-pointer transition-colors"
        >
          המשך לחישוב הסל
        </button>
        <button
          data-id="back-to-input"
          onClick={onBack}
          className="px-4 py-2 text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
        >
          חזרה
        </button>
      </div>
    </section>
  );
}
