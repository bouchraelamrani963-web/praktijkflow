import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Product</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Prijzen</Link></li>
              <li><Link href="/#features" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Functionaliteiten</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Bedrijf</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/#how" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Hoe het werkt</Link></li>
              <li><Link href="mailto:contact@noshowcontrol.nl" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Juridisch</h3>
            <ul className="mt-4 space-y-2">
              <li><span className="text-sm text-zinc-500 dark:text-zinc-500">Privacy</span></li>
              <li><span className="text-sm text-zinc-500 dark:text-zinc-500">Voorwaarden</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Ondersteuning</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/help" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Helpcentrum</Link></li>
              <li><Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Inloggen</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} NoShow Control. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    </footer>
  );
}
