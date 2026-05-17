export function groupSlipItems(items) {
  return items.reduce((map, item) => {
    map[item.product_id] = (map[item.product_id] || 0) + Number(item.quantity || 0);
    return map;
  }, {});
}

export function buildStockMap(rows) {
  return (rows || []).reduce((map, row) => {
    const productId = row.product_id;
    const quantity = Number(row.remaining_quantity || 0);
    const purchasePrice = Number(row.purchase_price || 0);

    if (!map[productId]) {
      map[productId] = {
        quantity: 0,
        value: 0
      };
    }

    map[productId].quantity += quantity;
    map[productId].value += quantity * purchasePrice;
    return map;
  }, {});
}

export function getWeightedAverageCost(stockMap, productId) {
  const stock = stockMap[productId];
  if (!stock || stock.quantity <= 0) return 0;
  return stock.value / stock.quantity;
}

export function checkStockAvailability(items, stockMap) {
  const grouped = groupSlipItems(items);
  const issues = [];

  Object.entries(grouped).forEach(([productId, requiredQty]) => {
    const availableQty = Number(stockMap[productId]?.quantity || 0);
    if (requiredQty > availableQty) {
      issues.push({
        productId,
        requiredQty,
        availableQty
      });
    }
  });

  return issues;
}
