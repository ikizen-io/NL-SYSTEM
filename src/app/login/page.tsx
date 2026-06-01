export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; from?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const hasError = Boolean(sp.error);
  const from = sp.from ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Nitro Labs — single-owner access
          </p>
        </div>

        {hasError ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            Incorrect username or password.
          </div>
        ) : null}

        <form method="POST" action="/api/auth/login" className="space-y-4">
          <input type="hidden" name="from" value={from} />
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
