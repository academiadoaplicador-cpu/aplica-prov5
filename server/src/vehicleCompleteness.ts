type PartMeasurement = { width: number; length: number };

function hasPartMeasurement(
  partMeasurements: Record<string, PartMeasurement> | null | undefined,
  partId: string,
): boolean {
  const m = partMeasurements?.[partId];
  return Boolean(m && Number(m.width) > 0 && Number(m.length) > 0);
}

export function isVehicleMeasurementsComplete(
  _size: string,
  partMeasurements: Record<string, PartMeasurement> | null | undefined,
): boolean {
  const configured = Object.keys(partMeasurements || {});
  if (configured.length === 0) return false;
  return configured.every((partId) => hasPartMeasurement(partMeasurements, partId));
}

export function countIncompleteVehicles(
  rows: { size: string; part_measurements: Record<string, PartMeasurement> }[],
): number {
  return rows.filter((r) => !isVehicleMeasurementsComplete(r.size, r.part_measurements)).length;
}
