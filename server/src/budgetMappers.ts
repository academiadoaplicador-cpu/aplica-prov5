function num(value: unknown): number {
  return Number(value);
}

export function mapFinancial(row: Record<string, unknown>) {
  return {
    hourlyRate: num(row.hourly_rate),
    profitMarginPercentage: num(row.profit_margin_percentage),
    taxPercentage: num(row.tax_percentage),
    fixedCosts: num(row.fixed_costs),
  };
}

export function mapBudget(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    vehicleModel: (row.vehicle_model as string) || undefined,
    applianceModel: (row.appliance_model as string) || undefined,
    vehicleId: (row.vehicle_id as string) || undefined,
    status: row.status as string,
    date: row.date as string,
    items: row.items as unknown[],
    materialId: row.material_id as string,
    customPricePerM2: row.custom_price_per_m2 != null ? num(row.custom_price_per_m2) : undefined,
    totalHours: num(row.total_hours),
    totalMaterialMeters: num(row.total_material_meters),
    totalMaterialM2: row.total_material_m2 != null ? num(row.total_material_m2) : undefined,
    totalCost: num(row.total_cost),
    totalPrice: num(row.total_price),
    profit: num(row.profit),
    type: row.type as string,
    subType: (row.sub_type as string) || undefined,
    vehicleQuantity:
      row.vehicle_quantity != null ? Math.max(1, num(row.vehicle_quantity)) : undefined,
    rollsNeeded:
      row.rolls_needed != null ? Math.max(1, num(row.rolls_needed)) : undefined,
  };
}
