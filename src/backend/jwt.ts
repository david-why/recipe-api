const AUTH_SECRET = process.env.AUTH_SECRET

export function signJWT(claims: Record<string, any>) {
  if (!AUTH_SECRET) {
    throw new Error("No auth secret provided.")
  }
  const header = btoa(
    JSON.stringify({
      alg: "HS256",
      typ: "JWT",
    }),
  ).replace(/=+$/, "")
  const payload = btoa(
    JSON.stringify({
      iat: Math.floor(Date.now() / 1000),
      ...claims,
    }),
  ).replace(/=+$/, "")
  const dataToSign = `${header}.${payload}`

  const hasher = new Bun.CryptoHasher(
    "sha256",
    new TextEncoder("utf-8").encode(AUTH_SECRET),
  )
  hasher.update(dataToSign, "utf-8")
  const signature = hasher.digest("base64url").replace(/=+$/, "")

  return `${dataToSign}.${signature}`
}

export function verifyJWT<T extends Record<string, any>>(token: string): T {
  if (!AUTH_SECRET) {
    throw new Error("No auth secret provided.")
  }
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid token format")
  }
  const [header, payload, signature] = parts as [string, string, string]

  const hasher = new Bun.CryptoHasher(
    "sha256",
    new TextEncoder("utf-8").encode(AUTH_SECRET),
  )
  hasher.update(`${header}.${payload}`, "utf-8")
  const expectedSignature = hasher.digest("base64url").replace(/=+$/, "")

  if (expectedSignature !== signature) {
    throw new Error("Invalid token")
  }

  return JSON.parse(atob(payload)) as T
}
