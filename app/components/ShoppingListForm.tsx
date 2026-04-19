'use client';

import { useState } from 'react';

const EXAMPLES = [
  '2 לחמים, חלב 1%, ביצים L, יוגורט, בננות',
  'חומוס, טחינה, פיתות, עגבניות, מלפפונים, לימון',
  'קוטג\' 5%, גבינה צהובה, לחם שחור, אבוקדו, תפוחי אדמה',
];

const DEV_PRESET_LIST = 'ביצים, חלב2, יוגורטים, עוף, גבינה צהובה, גבינה לבנה, לחם, נייר טואלט, לימון, פסטה';

export function ShoppingListForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');

  function pickExample(example: string) {
    setText(example);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-id="shopping-list-form">
      <label className="block">
        <span className="block text-lg font-medium text-gray-800 mb-2">
          מה צריך השבוע?
        </span>
        <textarea
          data-id="list-input"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder="חלב, 2 לחמים, יוגורט, בננות, גבינה צהובה..."
          className="w-full rounded-lg border-2 border-emerald-200 bg-white p-3 text-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          dir="auto"
        />
      </label>

      <div className="text-sm text-gray-500">
        <span>דוגמאות: </span>
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            type="button"
            data-id={`example-${ex.slice(0, 20)}`}
            onClick={() => pickExample(ex)}
            className="ms-2 text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
          >
            {ex.slice(0, 30)}…
          </button>
        ))}
      </div>

      <button
        type="button"
        data-id="dev-fill-preset"
        onClick={() => setText(DEV_PRESET_LIST)}
        className="dev-only w-full border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium py-2 rounded-lg cursor-pointer text-sm"
      >
        מילוי רשימה לדוגמה
      </button>

      <button
        type="submit"
        disabled={text.trim().length === 0}
        data-id="submit-list"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        חישוב הסל הזול ביותר
      </button>
    </form>
  );
}
