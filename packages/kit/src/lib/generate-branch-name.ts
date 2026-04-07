/** Mirrors `generateBranchName` in `tr33-vscode` for default new-branch names. */
const BRANCH_CITIES = [
  "jakarta",
  "istanbul",
  "cairo",
  "mumbai",
  "tokyo",
  "seoul",
  "lima",
  "nairobi",
  "havana",
  "bogota",
  "tehran",
  "delhi",
  "dhaka",
  "hanoi",
  "riyadh",
  "ankara",
  "kabul",
  "quito",
  "dakar",
  "lusaka",
  "maputo",
  "tbilisi",
  "baku",
  "minsk",
  "tallinn",
  "riga",
  "vilnius",
  "oslo",
  "reykjavik",
  "helsinki",
  "dublin",
  "lisbon",
  "prague",
  "vienna",
  "budapest",
  "bucharest",
  "sofia",
  "tirana",
  "skopje",
  "belgrade",
] as const;

export function generateBranchName(): string {
  const city = BRANCH_CITIES[Math.floor(Math.random() * BRANCH_CITIES.length)];
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${city}-${suffix}`;
}
