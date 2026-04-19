'use client';

import type { Basket, BasketsResponse } from './types';

const CHAIN_LABEL: Record<'shufersal' | 'ramilevi' | 'mixed', string> = {
  shufersal: 'שופרסל דיל',
  ramilevi: 'רמי לוי',
  mixed: 'שני הרשתות',
};

const CHAIN_URL: Record<'shufersal' | 'ramilevi', string> = {
  shufersal: 'https://www.shufersal.co.il/online/he/A',
  ramilevi: 'https://www.rami-levy.co.il/he',
};

function BasketCard({
  basket,
  isRecommended,
  dataId,
}: {
  basket: Basket;
  isRecommended: boolean;
  dataId: string;
}) {
  const activeTab = basket.strategy === 'single_cheapest' ? 'רשת אחת (הזול ביותר)' : 'פיצול בין רשתות';
  return (
    <article
      className={`rounded-xl p-5 ${
        isRecommended
          ? 'bg-emerald-50 border-2 border-emerald-500 shadow-md'
          : 'bg-white border border-gray-200'
      }`}
      data-id={dataId}
      data-active-tab={isRecommended ? activeTab : undefined}
    >
      <header className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {basket.strategy === 'single_cheapest' ? 'רשת אחת' : 'פיצול בין רשתות'}
          </h3>
          <p className="text-sm text-gray-600">{CHAIN_LABEL[basket.chain]}</p>
        </div>
        {isRecommended && (
          <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            מומלץ
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
          <dd>₪{basket.grandTotal.toFixed(2)}</dd>
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

      {basket.chain !== 'mixed' && (
        <a
          href={CHAIN_URL[basket.chain]}
          target="_blank"
          rel="noopener noreferrer"
          data-id={`checkout-${basket.chain}`}
          className="block mt-4 text-center bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded cursor-pointer transition-colors"
        >
          המשך לאתר {CHAIN_LABEL[basket.chain]} ←
        </a>
      )}
    </article>
  );
}

export function BasketComparison({ baskets, rawText }: { baskets: BasketsResponse; rawText: string }) {
  const { singleCheapest, splitCheapest } = baskets;
  const splitSaves = singleCheapest.grandTotal - splitCheapest.grandTotal;
  const splitIsBetter = splitSaves > 0.5;

  return (
    <section className="space-y-6" data-id="basket-comparison">
      <details className="bg-gray-50 rounded border border-gray-200 p-3 text-sm" data-id="raw-text">
        <summary className="cursor-pointer text-gray-600">הרשימה המקורית</summary>
        <pre className="mt-2 whitespace-pre-wrap text-gray-700 text-xs" dir="auto">{rawText}</pre>
      </details>

      <div className="grid md:grid-cols-2 gap-4">
        <BasketCard basket={singleCheapest} isRecommended={!splitIsBetter} dataId="basket-single" />
        <BasketCard basket={splitCheapest} isRecommended={splitIsBetter} dataId="basket-split" />
      </div>

      {splitIsBetter && (
        <p className="text-center text-sm text-emerald-800 bg-emerald-50 rounded p-3" data-id="split-savings">
          פיצול בין רשתות חוסך ₪{splitSaves.toFixed(2)} אבל דורש 2 משלוחים
        </p>
      )}
    </section>
  );
}
