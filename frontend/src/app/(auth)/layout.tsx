export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-12">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-slate-100/60 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
