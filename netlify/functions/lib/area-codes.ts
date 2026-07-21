// Area-code -> state lookup for SMS routing (SPEC.md §9.1). Covers the five
// launch territories; anything else routes to the house queue (§7 step 4).
// Extend this map as the territory list grows (TODO.md Part 2D).

const AREA_CODE_STATE: Record<string, string> = {
  // Nevada
  '702': 'NV', '725': 'NV', '775': 'NV',
  // California
  '209': 'CA', '213': 'CA', '279': 'CA', '310': 'CA', '323': 'CA', '341': 'CA',
  '408': 'CA', '415': 'CA', '424': 'CA', '442': 'CA', '510': 'CA', '530': 'CA',
  '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA', '628': 'CA', '650': 'CA',
  '657': 'CA', '661': 'CA', '669': 'CA', '707': 'CA', '714': 'CA', '747': 'CA',
  '760': 'CA', '805': 'CA', '818': 'CA', '820': 'CA', '831': 'CA', '840': 'CA',
  '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA', '949': 'CA', '951': 'CA',
  // Arizona
  '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',
  // Utah
  '385': 'UT', '435': 'UT', '801': 'UT',
  // Idaho
  '208': 'ID', '986': 'ID',
};

/** Best-effort state from a phone number's area code (E.164 or US formats). */
export function stateFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  return AREA_CODE_STATE[national.slice(0, 3)] ?? null;
}
