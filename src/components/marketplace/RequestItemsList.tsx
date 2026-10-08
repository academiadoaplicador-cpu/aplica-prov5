import { ServiceRequest } from '../../types';
import { formatCurrency } from '../../lib/utils';

/**
 * Itens de um pedido com mais de um item. Com proposta, mostra o material e o
 * valor que o aplicador definiu para cada item.
 */
export default function RequestItemsList({
  request,
  showProposal = false,
}: {
  request: ServiceRequest;
  showProposal?: boolean;
}) {
  if (request.requestItems.length <= 1) return null;
  const laborOnly = request.supplyMode === 'mao_de_obra';

  return (
    <ol className="rounded-xl border border-slate-800 bg-slate-950/50 divide-y divide-slate-800/80">
      {request.requestItems.map((item, index) => {
        const proposed = showProposal
          ? request.proposal?.items.find((p) => p.requestItemId === item.id)
          : undefined;
        return (
          <li key={item.id} className="flex items-start gap-3 px-3 py-2.5">
            <span className="mt-0.5 text-[10px] font-mono text-slate-600 w-4 shrink-0">
              {index + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white break-words">{item.scopeLabel}</p>
              <p className="text-[11px] text-slate-500 break-words">
                {proposed
                  ? `${proposed.product} · ${proposed.color}`
                  : laborOnly && item.clientMaterial
                    ? `Material do cliente: ${item.clientMaterial.product} · ${item.clientMaterial.color}`
                    : item.materialType}{' '}
                · {item.estimatedM2} m²
              </p>
            </div>
            <span className="shrink-0 text-xs font-mono text-slate-300">
              {proposed
                ? formatCurrency(proposed.price)
                : `${formatCurrency(item.priceMin)}–${formatCurrency(item.priceMax)}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
