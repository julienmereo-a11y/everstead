// The password rule, in one place, mirroring what the server actually enforces.
//
// Supabase rejects a weak password at signup and at change (Authentication >
// Sign In / Providers > Email): it requires at least one lowercase letter, one
// uppercase letter, one digit and one symbol. Before this module the forms only
// checked length, so someone could be told their password was fine and then be
// refused by the server with a raw WeakPasswordError they could do nothing with.
//
// The length here is deliberately stricter than the server's minimum of 6.
// Six is short enough to be worth guessing; there is no reason to let anyone
// choose it, and being stricter than the server can never cause a rejection we
// did not warn about. Never make it looser.
export const PASSWORD_MIN = 8

// The symbols Supabase accepts, verbatim from its docs.
const SYMBOL = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/

/** Which rules a password fails. All false means it will be accepted. */
export function passwordProblems(password) {
  const s = String(password ?? '')
  return {
    length: s.length < PASSWORD_MIN,
    lower:  !/[a-z]/.test(s),
    upper:  !/[A-Z]/.test(s),
    digit:  !/[0-9]/.test(s),
    symbol: !SYMBOL.test(s),
  }
}

export function passwordOk(password) {
  return Object.values(passwordProblems(password)).every(failed => !failed)
}
