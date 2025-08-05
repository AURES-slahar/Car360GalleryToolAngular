const EPS = 1e-5
export function isApproxZero(number: number, error = EPS) {
  return Math.abs(number) < error
}

export function isApproxEquals(a: number, b: number, error = EPS) {
  return isApproxZero(a - b, error)
}
