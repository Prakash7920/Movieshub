"use client";

import { useEffect, useState } from "react";

type MovieOption = { id:string; titleEn:string; isPublished:boolean; license:null|{id:string;owner:string;status:string;startDate:string;expiryDate:string;allowedCountries:string[];notes:string|null} };
type Form = { movieId:string; owner:string; startDate:string; expiryDate:string; countries:string; notes:string };
const empty:Form={movieId:"",owner:"",startDate:"",expiryDate:"",countries:"IN",notes:""};

export default function AdminLicenses(){
 const [movies,setMovies]=useState<MovieOption[]>([]);
 const [form,setForm]=useState<Form>(empty);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 async function load(){
  try{const r=await fetch("/api/admin/licenses",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setMovies(d.movies);if(!form.movieId&&d.movies.length)setForm(v=>({...v,movieId:d.movies[0].id}));}
  catch(e){setError(e instanceof Error?e.message:"Unable to load licence records.");}
 }
 useEffect(()=>{void load();},[]);
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/admin/licenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setMessage(d.message);await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save licence.");}
  finally{setBusy(false);}
 }
 const input="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white";
 return <section className="page-shell pb-10">
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
   <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Rights & compliance</p>
   <h2 className="mt-2 text-2xl font-bold text-white">Content licensing</h2>
   <p className="mt-2 text-sm text-gray-400">Record licence information for review. Every new or updated record is saved as PENDING and does not enable publishing.</p>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
   {message&&<p role="status" className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{message}</p>}
   {movies.length===0?<p className="mt-5 text-sm text-gray-400">Add a movie draft before recording a licence.</p>:<form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="text-xs text-gray-400 sm:col-span-2">Movie<select className={input+" mt-1"} value={form.movieId} onChange={e=>setForm(v=>({...v,movieId:e.target.value}))}>{movies.map(m=><option key={m.id} value={m.id}>{m.titleEn}</option>)}</select></label>
    <label className="text-xs text-gray-400 sm:col-span-2">Rights owner / distributor<input required maxLength={200} className={input+" mt-1"} value={form.owner} onChange={e=>setForm(v=>({...v,owner:e.target.value}))} placeholder="Legal entity named in the agreement"/></label>
    <label className="text-xs text-gray-400">Licence start date<input required type="date" className={input+" mt-1"} value={form.startDate} onChange={e=>setForm(v=>({...v,startDate:e.target.value}))}/></label>
    <label className="text-xs text-gray-400">Licence expiry date<input required type="date" className={input+" mt-1"} value={form.expiryDate} onChange={e=>setForm(v=>({...v,expiryDate:e.target.value}))}/></label>
    <label className="text-xs text-gray-400 sm:col-span-2">Permitted countries (ISO codes, comma-separated)<input required className={input+" mt-1"} value={form.countries} onChange={e=>setForm(v=>({...v,countries:e.target.value}))} placeholder="IN, SG"/></label>
    <label className="text-xs text-gray-400 sm:col-span-2">Internal notes / agreement reference<textarea className={input+" mt-1 min-h-24"} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Reference number, signed agreement location, rights scope..."/></label>
    <div className="sm:col-span-2"><button disabled={busy} className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving...":"Save as pending review"}</button></div>
   </form>}
   <div className="mt-7"><h3 className="text-lg font-semibold text-white">Licence register</h3><div className="mt-3 space-y-2">{movies.map(m=><article key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-white">{m.titleEn}</p><span className={"rounded-full px-3 py-1 text-xs "+(m.license?.status==="ACTIVE"?"bg-green-500/15 text-green-200":"bg-amber-500/15 text-amber-200")}>{m.license?.status??"NO LICENCE RECORD"}</span></div>{m.license&&<p className="mt-2 text-xs text-gray-400">{m.license.owner} · {m.license.allowedCountries.join(", ")} · {new Date(m.license.startDate).toLocaleDateString()} – {new Date(m.license.expiryDate).toLocaleDateString()}</p>}</article>)}</div></div>
   <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">Important: entering licence details is not proof of ownership or permission. Verify the signed agreement, platform rights, languages, territories, term and usage rights independently before any authorised status change. No playback or download is enabled here.</p>
  </div>
 </section>;
}
