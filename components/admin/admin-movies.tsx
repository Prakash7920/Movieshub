"use client";

import { useEffect, useState } from "react";

type Movie = {
  id:string; slug:string; titleEn:string; titleTa:string; descriptionEn:string; descriptionTa:string;
  language:string; releaseYear:number; runtimeMinutes:number; ageRating:string; rating:number;
  isPublished:boolean; contentStatus:string; movieType:string; posterUrl:string; backdropUrl:string; genre:string;
};
type FormState = {
  titleEn:string; titleTa:string; slug:string; descriptionEn:string; descriptionTa:string;
  posterUrl:string; backdropUrl:string; language:string; genre:string;
  releaseYear:string; runtimeMinutes:string; ageRating:string; rating:string;
};
const initial:FormState={titleEn:"",titleTa:"",slug:"",descriptionEn:"",descriptionTa:"",posterUrl:"",backdropUrl:"",language:"ta",genre:"",releaseYear:"2026",runtimeMinutes:"120",ageRating:"U",rating:"0"};

export default function AdminMovies(){
 const [movies,setMovies]=useState<Movie[]>([]);
 const [form,setForm]=useState<FormState>(initial);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 async function load(){
  setLoading(true);
  try{
   const r=await fetch("/api/admin/movies",{cache:"no-store"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error);
   setMovies(d.movies);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load admin catalogue.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);

 function change(key:keyof FormState,value:string){
  setForm(current=>({...current,[key]:value,...(key==="titleEn"&&!current.slug?{slug:value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}: {})}));
 }
 function edit(movie:Movie){
  setEditingId(movie.id);
  setForm({
   titleEn:movie.titleEn,titleTa:movie.titleTa,slug:movie.slug,descriptionEn:movie.descriptionEn,
   descriptionTa:movie.descriptionTa,posterUrl:movie.posterUrl??"",backdropUrl:movie.backdropUrl??"",
   language:movie.language,genre:movie.genre,releaseYear:String(movie.releaseYear),
   runtimeMinutes:String(movie.runtimeMinutes),ageRating:movie.ageRating,rating:String(movie.rating),
  });
  setError("");setMessage("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function cancelEdit(){setEditingId(null);setForm(initial);setError("");setMessage("");}

 async function saveMovie(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/admin/movies",{method:editingId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,id:editingId??undefined,releaseYear:Number(form.releaseYear),runtimeMinutes:Number(form.runtimeMinutes),rating:Number(form.rating)})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setMessage(d.message);setEditingId(null);setForm(initial);await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save movie.");}
  finally{setBusy(false);}
 }
 async function publish(movie:Movie){
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/admin/movies",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:movie.id,publish:!movie.isPublished})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setMessage(d.message);await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update movie.");}
  finally{setBusy(false);}
 }
 async function removeDraft(movie:Movie){
  if(!window.confirm(`Delete draft "${movie.titleEn}"? This cannot be undone.`))return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/admin/movies",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:movie.id})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setMessage(d.message);if(editingId===movie.id)cancelEdit();await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to delete draft.");}
  finally{setBusy(false);}
 }

 const input="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder:text-gray-500";
 return <main className="page-shell py-8">
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">MoviesHub control room</p>
  <h1 className="mt-2 text-3xl font-bold text-white">Admin · Movie Management</h1>
  <p className="mt-2 text-sm text-gray-400">New entries are saved as drafts. Publishing is blocked until an active content licence is recorded.</p>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
  {message&&<p role="status" className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{message}</p>}
  <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
   <h2 className="text-xl font-semibold text-white">{editingId?"Edit draft metadata":"Add movie metadata"}</h2>
   <form onSubmit={saveMovie} className="mt-5 grid gap-3 sm:grid-cols-2">
    {([[ "titleEn","English title"],["titleTa","Native-language title"],["slug","URL slug"],["language","Language code (ta, te, ml, kn, hi, en)"],["genre","Genre"],["releaseYear","Release year"],["runtimeMinutes","Runtime (minutes)"],["ageRating","Age rating"],["rating","Rating (0–10)"],["posterUrl","Poster image URL"],["backdropUrl","Backdrop image URL"]] as const).map(([key,label])=><label key={key} className="text-xs text-gray-400">{label}<input required className={input+" mt-1"} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
    <label className="text-xs text-gray-400 sm:col-span-2">English description<textarea required className={input+" mt-1 min-h-20"} value={form.descriptionEn} onChange={e=>change("descriptionEn",e.target.value)}/></label>
    <label className="text-xs text-gray-400 sm:col-span-2">Native-language description<textarea required className={input+" mt-1 min-h-20"} value={form.descriptionTa} onChange={e=>change("descriptionTa",e.target.value)}/></label>
    <div className="flex flex-wrap gap-2 sm:col-span-2">
     <button disabled={busy} className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?(editingId?"Saving...":"Creating..."):(editingId?"Update draft":"Save as draft")}</button>
     {editingId&&<button type="button" disabled={busy} onClick={cancelEdit} className="rounded-full border border-white/20 px-5 py-3 text-sm text-white">Cancel</button>}
    </div>
   </form>
  </section>
  <section className="mt-8">
   <h2 className="text-xl font-semibold text-white">Catalogue entries</h2>
   {loading?<p className="py-8 text-gray-400">Loading...</p>:<div className="mt-4 space-y-3">
    {movies.map(m=><article key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
     <div><p className="font-semibold text-white">{m.titleEn} <span className="text-xs text-gray-500">({m.language.toUpperCase()} · {m.releaseYear})</span></p><p className="mt-1 text-xs text-gray-400">{m.slug} · {m.genre} · {m.contentStatus}</p></div>
     <div className="flex flex-wrap gap-2">
      {!m.isPublished&&m.contentStatus==="DRAFT"&&<><button disabled={busy} onClick={()=>edit(m)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-50">Edit draft</button><button disabled={busy} onClick={()=>removeDraft(m)} className="rounded-full border border-red-400/30 px-4 py-2 text-xs text-red-200 disabled:opacity-50">Delete</button></>}
      {!m.isPublished&&<button disabled={busy} onClick={()=>publish(m)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-50">Publish</button>}
      {m.isPublished&&<><span className="self-center text-xs text-gray-400">Published</span><button disabled={busy} onClick={()=>publish(m)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-50">Unpublish</button></>}
     </div>
    </article>)}
   </div>}
  </section>
 </main>;
}
