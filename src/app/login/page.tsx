import { login } from "@/app/actions";

export default function Login({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <form action={login} className="card mx-auto mt-24 max-w-sm space-y-4 p-6">
      <h1 className="font-heading text-xl font-bold">Accès équipe IWIGO</h1>
      <input type="hidden" name="next" value={searchParams.next ?? "/"} />
      <input name="token" type="password" placeholder="Jeton admin" className="w-full rounded-lg border p-2" />
      {searchParams.error && <p className="text-sm text-ecf-secondary">Jeton invalide</p>}
      <button className="btn-primary w-full justify-center">Entrer</button>
    </form>
  );
}
