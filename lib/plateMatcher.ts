import levenshtein from "fast-levenshtein";

export function findBestPlateMatch(
  detectedPlate: string,
  vehicleNumbers: string[]
) {
  let bestMatch = null;
  let bestDistance = 999;

  for (const plate of vehicleNumbers) {
    const distance = levenshtein.get(
      detectedPlate,
      plate
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = plate;
    }
  }

  return {
    bestMatch,
    distance: bestDistance,
  };
}