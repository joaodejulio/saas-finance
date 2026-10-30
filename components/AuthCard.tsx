export default function AuthCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="w-full space-y-4">
      <h2 className="text-xl font-bold text-center">{title}</h2>
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
        {children}
      </div>
    </section>
  )
}