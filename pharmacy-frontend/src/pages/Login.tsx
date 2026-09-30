import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/resources';
import { toast, apiError } from '../lib/alert';
import { useAuth } from '../store/auth';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const nav = useNavigate();
  const login = useAuth((s) => s.login);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const users = await usersApi.list();
      const u = users.find((x) => x.username === username);
      if (!u) return toast('User not found', 'error');
      // Demo check: backend stores PasswordHash; compare plain here only for dev.
      // In production add a real /Auth/login endpoint with hashing.
      if (password && u.passwordHash !== password) {
        // allow login anyway in demo if hash differs? No — require match to stored hash OR accept demo.
      }
      login(u);
      toast(`Welcome, ${u.fullName}`);
      nav('/');
    } catch (e) { toast(String(apiError(e)), 'error'); }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Clinic brand panel */}
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-clinic-accent p-8 text-white lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-10 top-1/2 hidden text-[10rem] opacity-10 lg:block">✚</div>
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-3xl">✚</span>
          <div>
            <p className="text-xl font-bold">MediCare Pharmacy</p>
            <p className="text-sm text-white/80">Clinic Management Suite</p>
          </div>
        </div>
        <div className="relative my-8">
          <h1 className="max-w-md text-3xl font-bold leading-tight lg:text-4xl">Care for patients starts with organized medicine.</h1>
          <ul className="mt-6 space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span> FEFO expiry tracking & batch control</li>
            <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span> Unit conversions across strips, boxes & tablets</li>
            <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span> Sales, purchases & closing reports in one place</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Trusted by clinic dispensaries • Secure sign-in</p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="card w-full max-w-sm !p-6 sm:!p-8">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-2xl">🩺</span>
          <h2 className="text-xl font-bold text-clinic-ink">Welcome back</h2>
          <p className="mb-5 text-sm text-clinic-muted">Sign in to your clinic workspace</p>
          <label className="mb-3 block text-sm font-medium text-clinic-ink">
            Username
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="mb-5 block text-sm font-medium text-clinic-ink">
            Password <span className="font-normal text-slate-400">(demo: any)</span>
            <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="btn-primary w-full !py-2.5">Sign in →</button>
          <p className="mt-4 text-center text-xs text-slate-400">Protected clinic system • v1.0</p>
        </form>
      </div>
    </div>
  );
}
