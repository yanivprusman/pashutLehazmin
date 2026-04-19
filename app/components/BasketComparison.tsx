'use client';

import type { Basket, BasketsResponse, Chain } from './types';

const CHAIN_LABEL: Record<Chain, string> = {
  shufersal: 'שופרסל דיל',
  ramilevi: 'רמי לוי',
};

const CHAIN_URL: Record<Chain, string> = {
  shufersal: 'https://www.shufersal.co.il/online/he/A',
  ramilevi: 'https://www.rami-levy.co.il/he',
};

function BasketCard({
  basket,
  isCheaper,
  savings,
  dataId,
}: {
  basket: Basket;
  isCheaper: boolean;
  savings: number;
  dataId: string;
}) {
  return (
    <article
      className="rounded-xl p-5 bg-white border border-gray-200"
      data-id={dataId}
    >
      <header className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {CHAIN_LABEL[basket.chain]}
        </h3>
        {isCheaper && savings > 0.5 && (
          <span
            className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
            data-id="cheaper-badge"
          >
            זול יותר ב-₪{savings.toFixed(2)}
          </span>
        )}
      </header>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-600">סך פריטים</dt>
          <dd>₪{basket.itemsTotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-600">משלוח</dt>
          <dd>₪{basket.deliveryFee.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
          <dt>סך הכול</dt>
          <dd className={isCheaper && savings > 0.5 ? 'text-emerald-700' : undefined}>
            ₪{basket.grandTotal.toFixed(2)}
          </dd>
        </div>
      </dl>

      {basket.belowMinimum.length > 0 && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded p-2 space-y-1">
          {basket.belowMinimum.map(info => (
            <p key={info.chain}>
              ⚠ {info.chainLabel}: מתחת למינימום למשלוח (₪{info.minimum.toFixed(2)}) — חסרים עוד ₪{info.shortfall.toFixed(2)}, ייתכן תעריף גבוה יותר
            </p>
          ))}
        </div>
      )}
      {basket.unmatchedCount > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {basket.unmatchedCount} פריטים לא נמצאו — נוספו ידנית בצ'קאאוט
        </p>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-emerald-700 hover:text-emerald-900">
          פירוט הסל ({basket.lines.length} פריטים)
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-gray-700">
          {basket.lines.map((line, i) => (
            <li key={i} className="flex justify-between border-b border-gray-100 py-1" data-id={`line-${i}`}>
              <span className="flex-1">
                <span className="font-medium">{line.requested.query}</span>
                {line.matched ? (
                  <span className="text-gray-500"> → {line.matched.item_name}</span>
                ) : (
                  <span className="text-red-600"> → לא נמצא</span>
                )}
              </span>
              {line.matched && (
                <span>₪{line.effectivePrice.toFixed(2)}</span>
              )}
            </li>
          ))}
        </ul>
      </details>

      <a
        href={CHAIN_URL[basket.chain]}
        target="_blank"
        rel="noopener noreferrer"
        data-id={`checkout-${basket.chain}`}
        className="block mt-4 text-center bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded cursor-pointer transition-colors"
      >
        המשך לאתר {CHAIN_LABEL[basket.chain]} ←
      </a>
    </article>
  );
}

export function BasketComparison({ baskets, rawText }: { baskets: BasketsResponse; rawText: string }) {
  const { shufersal, ramilevi } = baskets;
  const diff = shufersal.grandTotal - ramilevi.grandTotal;
  const ramileviIsCheaper = diff > 0;
  const savings = Math.abs(diff);

  return (
    <section className="space-y-6" data-id="basket-comparison">
      <details className="bg-gray-50 rounded border border-gray-200 p-3 text-sm" data-id="raw-text">
        <summary className="cursor-pointer text-gray-600">הרשימה המקורית</summary>
        <pre className="mt-2 whitespace-pre-wrap text-gray-700 text-xs" dir="auto">{rawText}</pre>
      </details>

      <div className="grid md:grid-cols-2 gap-4">
        <BasketCard
          basket={shufersal}
          isCheaper={!ramileviIsCheaper}
          savings={savings}
          dataId="basket-shufersal"
        />
        <BasketCard
          basket={ramilevi}
          isCheaper={ramileviIsCheaper}
          savings={savings}
          dataId="basket-ramilevi"
        />
      </div>
    </section>
  );
}
