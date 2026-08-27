// Countries Everstead accepts, and the ones it does not.
//
// One home, because two screens ask the question: the web signup and the app's
// Settings. A copy in each would drift, and this is the list that decides who
// can register at all.
// Sanctioned / restricted countries — registration blocked for compliance
export const RESTRICTED_COUNTRIES = new Set([
  'Russia', 'North Korea', 'Iran', 'Syria', 'Belarus', 'Afghanistan',
  'Myanmar', 'Venezuela', 'Zimbabwe', 'Nicaragua', 'Libya', 'Somalia',
  'Yemen', 'Sudan', 'Mali', 'Burundi', 'Central African Republic',
  'Democratic Republic of Congo', 'Iraq', 'Lebanon', 'Bosnia and Herzegovina',
])

export const COUNTRIES = [
  // Primary markets
  { name: 'United Kingdom', code: 'GB', dial: '+44'  },
  { name: 'Ireland',        code: 'IE', dial: '+353' },
  { name: 'United States',  code: 'US', dial: '+1'   },
  { name: 'Canada',         code: 'CA', dial: '+1'   },
  // Europe
  { name: 'Austria',        code: 'AT', dial: '+43'  },
  { name: 'Belgium',        code: 'BE', dial: '+32'  },
  { name: 'Denmark',        code: 'DK', dial: '+45'  },
  { name: 'Finland',        code: 'FI', dial: '+358' },
  { name: 'France',         code: 'FR', dial: '+33'  },
  { name: 'Germany',        code: 'DE', dial: '+49'  },
  { name: 'Greece',         code: 'GR', dial: '+30'  },
  { name: 'Italy',          code: 'IT', dial: '+39'  },
  { name: 'Luxembourg',     code: 'LU', dial: '+352' },
  { name: 'Netherlands',    code: 'NL', dial: '+31'  },
  { name: 'Norway',         code: 'NO', dial: '+47'  },
  { name: 'Poland',         code: 'PL', dial: '+48'  },
  { name: 'Portugal',       code: 'PT', dial: '+351' },
  { name: 'Spain',          code: 'ES', dial: '+34'  },
  { name: 'Sweden',         code: 'SE', dial: '+46'  },
  { name: 'Switzerland',    code: 'CH', dial: '+41'  },
  // Middle East
  { name: 'UAE',            code: 'AE', dial: '+971' },
  { name: 'Qatar',          code: 'QA', dial: '+974' },
  { name: 'Saudi Arabia',   code: 'SA', dial: '+966' },
]

/** Country name for an ISO code, or null. */
export const countryByCode = (code) =>
  COUNTRIES.find(c => c.code === String(code || '').toUpperCase())?.name ?? null

/**
 * Display name for a country in the given language, falling back to the stored
 * English name. The STORED value never changes ('France', 'United Kingdom'):
 * the database, the sanctions rule and the euro pricing rule all match on it.
 * Only what the person reads is localised, via the platform's own region names.
 */
export function countryDisplayName(name, language) {
  if (language !== 'fr') return name
  try {
    const code = COUNTRIES.find(c => c.name === name)?.code
    if (!code) return name
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) || name
  } catch {
    return name
  }
}
