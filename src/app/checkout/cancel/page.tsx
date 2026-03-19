export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="font-display text-2xl font-semibold text-white">
          Payment cancelled
        </h1>
        <p className="text-white/60">
          No charge was made. You can try again anytime.
        </p>
        <a
          href="/"
          className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-white/70 hover:text-white transition-colors"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
