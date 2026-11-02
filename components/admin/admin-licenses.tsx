"use client";
import { useEffect, useState } from "react";
type MovieOption={id:string;titleEn:string;isPublished:boolean;license:null|{id:string;owner:string;status:string;startDate:string;expiryDate:string;allowedCountries:string[];notes:string|null}};
type Form={movieId:string;owner:string;startDate:string;expiryDate:string;countries:string;notes:string};
const empty:Form={movieId:"",owner:"",startDate:"",expiryDate:"",countries:"IN",notes:""};
export default function AdminLicenses(){
 const [movies,setMovies]=useState<MovieOption[]>([]),[form,setForm]=useState<Form>(empty),[refs,setRefs]=useState<Record<string,string>>({}),[checks,setChecks]=useState<Record<string,boolean>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){try{const r=await fetch("/api/admin/licenses",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setMovies(d.movies);if(!form.movieId&&d.movies.length)setForm(v=>({...v,movieId:d.movies[0].id}));}catch(e){setError(e instanceof Error?e.message:"Unable to load licences.");}}
 useEffect(()=>{void load();},[]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/admin/licenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to save licence.");}finally{setBusy(false);}}
 async function review(m:MovieOption,status:"ACTIVE"|"REJECTED"){
  const agreementReference=refs[m.id]??"";
  if(status==="ACTIVE"&&(!checks[m.id]||agreementReference.trim().length<3)){setError("Add the signed agreement reference and confirm verification first.");return;}
  const reason=status==="REJECTED"?(window.prompt("Reason for rejection?")??""):undefined;
  if(status==="REJECTED"&&reason!.trim().length<3){setError("Rejection cancelled or reason too short.");return;}
  if(!window.confirm(status==="ACTIVE"?"Confirm you checked the actual signed agreement and its rights?":"Confirm rejection of this licence?"))return;
  setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/admin/licenses",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({movieId:m.id,status,confirmed:checks[m.id]===true,agreementReference,reason})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to review licence.");}finally{setBusy(false);}
 }
 const input="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white";
 return <section className="page-shell pb-10"><div className="rounded-2xl border border-white/10 bg-white/5 p-5">
 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Rights & compliance</p><h2 className="mt-2 text-2xl font-bold text-white">Content licensing & verification</h2><p className="mt-2 text-sm text-gray-400">New or edited licence records remain PENDING until separately reviewed.</p>
 {error&&<p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{message&&<p role="status" className="mt-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-200">{message}</p>}
 {movies.length===0?<p className="mt-5 text-sm text-gray-400">Add a movie draft first.</p>:<form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
 <label className="text-xs text-gray-400 sm:col-span-2">Movie<select className={input+" mt-1"} value={form.movieId} onChange={e=>setForm(v=>({...v,movieId:e.target.value}))}>{movies.map(m=><option key={m.id} value={m.id}>{m.titleEn}</option>)}</select></label>
 <label className="text-xs text-gray-400 sm:col-span-2">Rights owner<input required className={input+" mt-1"} value={form.owner} onChange={e=>setForm(v=>({...v,owner:e.target.value}))}/></label>
 <label className="text-xs text-gray-400">Start date<input required type="date" className={input+" mt-1"} value={form.startDate} onChange={e=>setForm(v=>({...v,startDate:e.target.value}))}/></label>
 <label className="text-xs text-gray-400">Expiry date<input required type="date" className={input+" mt-1"} value={form.expiryDate} onChange={e=>setForm(v=>({...v,expiryDate:e.target.value}))}/></label>
 <label className="text-xs text-gray-400 sm:col-span-2">Permitted countries (ISO codes)<input required className={input+" mt-1"} value={form.countries} onChange={e=>setForm(v=>({...v,countries:e.target.value}))}/></label>
 <label className="text-xs text-gray-400 sm:col-span-2">Agreement notes<textarea className={input+" mt-1 min-h-20"} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/></label>
 <button disabled={busy} className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy?"Saving...":"Save as pending review"}</button></form>}
 <div className="mt-7"><h3 className="text-lg font-semibold text-white">Licence review queue</h3><div className="mt-3 space-y-3">{movies.map(m=><article key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
 <div className="flex items-center justify-between gap-2"><p className="font-medium text-white">{m.titleEn}</p><span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">{m.license?.status??"NO LICENCE"}</span></div>
 {m.license&&<><p className="mt-2 text-xs text-gray-400">{m.license.owner} · {m.license.allowedCountries.join(", ")} · {new Date(m.license.startDate).toLocaleDateString()} – {new Date(m.license.expiryDate).toLocaleDateString()}</p>
 {m.license.status!=="ACTIVE"&&<div className="mt-3 space-y-2"><label className="block text-xs text-gray-300">Signed agreement reference<input className={input+" mt-1"} value={refs[m.id]??""} onChange={e=>setRefs(v=>({...v,[m.id]:e.target.value}))} placeholder="Contract number / secure document reference"/></label>
 <label className="flex items-start gap-2 text-xs text-gray-300"><input type="checkbox" checked={checks[m.id]??false} onChange={e=>setChecks(v=>({...v,[m.id]:e.target.checked}))}/><span>I personally verified the signed agreement, platform and language rights, territories, term and usage rights.</span></label>
 <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void review(m,"ACTIVE")} className="rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve verified licence</button><button type="button" disabled={busy} onClick={()=>void review(m,"REJECTED")} className="rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-200 disabled:opacity-50">Reject</button></div></div>}
 {m.license.status==="ACTIVE"&&<p className="mt-2 text-xs text-green-200">Approved; downloads remain disabled.</p>}</>}</article>)}</div></div>
 <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">Only approve after checking the actual signed agreement. Approval does not enable playback or downloads.</p>
 </div></section>;
}