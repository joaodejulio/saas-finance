import Link from "next/link"
import AuthCard from "@/components/AuthCard"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Diário Financeiro Familiar</h1>
          <p className="mt-2 text-slate-600">Controle suas finanças com inteligência.</p>
        </div>
        <AuthCard title="Entrar">
          <p className="text-center text-slate-500 text-sm">Login em breve</p>
        </AuthCard>
        <div className="flex flex-col gap-2 md:flex-row md:justify-center">
          <Link
            href="/cadastro"
            className="px-6 py-3 min-h-11 border border-slate-300 text-slate-700 rounded-xl text-center font-medium hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  )
}