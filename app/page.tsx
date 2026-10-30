export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8">
          Diário Financeiro Familiar
        </h1>
        <div className="flex flex-col gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-900 text-white rounded-xl text-center font-medium hover:bg-blue-800 transition"
          >
            Entrar
          </a>
          <a
            href="/cadastro"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl text-center font-medium hover:bg-slate-100 transition"
          >
            Criar conta
          </a>
        </div>
      </div>
    </main>
  )
}