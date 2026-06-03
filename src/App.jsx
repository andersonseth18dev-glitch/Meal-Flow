import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { SEED_RECIPES } from "./seedRecipes";

// ─── PHOTO CACHE ──────────────────────────────────────────────────────────────
const photoCache = {};
const fetchPhoto = async (recipeName) => {
  if (photoCache[recipeName]) return photoCache[recipeName];
  try {
    const res = await fetch("/.netlify/functions/unsplash", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ query: recipeName }) });
    const data = await res.json();
    if (data.url) { photoCache[recipeName] = data; return data; }
  } catch {}
  return null;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = ["All","Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"];
const FAMILY_COLLECTIONS = ["None","Grandma's Kitchen","Dad's Specialties","Mom's Favorites","Family Classics","Holiday Recipes","Weekend Cookouts","Kids Favorites","Date Night","Quick & Easy","Secret Recipes"];
const DIETS      = ["All","Keto","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Paleo"];
const DAYS       = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_SLOTS = ["Breakfast","Lunch","Dinner"];
const CAT_EMOJI  = { Breakfast:"🌅",Lunch:"☀️",Dinner:"🌙",Grilling:"🔥","Kids Drinks":"🧃","Adult Drinks":"🍹",Snacks:"🍿",Desserts:"🍰",All:"🍽️" };
const tagColors  = {
  Keto:{bg:"#D4EDDA",text:"#155724"}, Vegetarian:{bg:"#C8F4C8",text:"#1A5E1A"},
  Vegan:{bg:"#B8EEC0",text:"#0F4C22"}, "Gluten-Free":{bg:"#FFF3CD",text:"#7A5800"},
  "Dairy-Free":{bg:"#EDE9FE",text:"#5B21B6"}, Paleo:{bg:"#FFE5D0",text:"#8B2500"},
};
const C = { bg:"#FFF8F0",surface:"#FFF2E6",card:"#FFFFFF",border:"#F0D9C8",accent:"#FF6B35",accent2:"#E8392A",green:"#2E7D32",text:"#2C1810",muted:"#8B5E3C",red:"#C62828",gold:"#FFD166",peach:"#F4A261",navy:"#1A0E08" };

const RECIPE_JSON_SPEC = `Return ONLY valid JSON (no markdown, no backticks, no extra text):
{"name":"Recipe Name","time":"X min","baseServings":4,"calories":350,"protein":25,"carbs":30,"fat":12,"tags":["Gluten-Free"],"category":"Dinner","emoji":"🍽️","desc":"Short appetizing description under 20 words.","ingredients":[{"item":"ingredient name","qty":2,"unit":"cups"}],"steps":["Step 1.","Step 2.","Step 3.","Step 4."]}
Tags only from: Keto, Vegetarian, Vegan, Gluten-Free, Dairy-Free, Paleo
Category only from: Breakfast, Lunch, Dinner, Grilling, Kids Drinks, Adult Drinks, Snacks, Desserts
Include at least 6 ingredients and 4 steps. Make nutrition realistic.`;


// ─── HELPERS ──────────────────────────────────────────────────────────────────
const callClaude = async (prompt, image=null) => {
  const body = image ? { prompt, image } : { prompt };
  const res = await fetch("/.netlify/functions/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.message || data.error);
  const text = data.content?.find(b=>b.type==="text")?.text||"";
  if (!text) throw new Error("Empty response from AI");
  return text.replace(/```json|```/g,"").trim();
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const starColor = (n) => n>=4?"#FF6B35":n>=3?"#F4A261":"#8B5E3C";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [recipes,       setRecipes]       = useState([]);
  const [recipeRatings, setRecipeRatings] = useState({});
  const [mealPlan,      setMealPlan]      = useState({});
  const [checkedItems,  setCheckedItems]  = useState({});
  const [loading,       setLoading]       = useState(true);

  const [screen,          setScreen]          = useState("home");
  const [activeDiet,      setActiveDiet]      = useState("All");
  const [activeCategory,  setActiveCategory]  = useState("All");
  const [search,          setSearch]          = useState("");
  const [selectedRecipe,  setSelectedRecipe]  = useState(null);
  const [recipeReviews,   setRecipeReviews]   = useState([]);
  const [editingCategories, setEditingCategories] = useState(false);
  const [tempCategories,    setTempCategories]    = useState([]);
  const [userRating,      setUserRating]      = useState(0);
  const [reviewText,      setReviewText]      = useState("");
  const [reviewLoading,   setReviewLoading]   = useState(false);
  const [recipeServings,  setRecipeServings]  = useState(null);
  const [planPickerOpen,  setPlanPickerOpen]  = useState(null);
  const [toast,           setToast]           = useState(null);

  const [activeCollection,setActiveCollection]= useState("All");
  const [aiQuery,         setAiQuery]         = useState("");
  const [aiLoading,       setAiLoading]       = useState(false);
  const [aiResults,       setAiResults]       = useState([]);
  const [aiError,         setAiError]         = useState("");
  const [aiSearched,      setAiSearched]      = useState(false);

  const [importOpen,      setImportOpen]      = useState(false);
  const [importMode,      setImportMode]      = useState("menu");
  const [importUrl,       setImportUrl]       = useState("");
  const [importText,      setImportText]      = useState("");
  const [importDescribe,  setImportDescribe]  = useState("");
  const [importPhoto,     setImportPhoto]     = useState(null);
  const [importLoading,   setImportLoading]   = useState(false);
  const [importResult,    setImportResult]    = useState(null);
  const [importError,     setImportError]     = useState("");
  const [manualRecipe,    setManualRecipe]    = useState({ name:"",time:"",baseServings:4,calories:"",protein:"",carbs:"",fat:"",categories:[],collection:"None",tags:[],desc:"",ingredients:[{item:"",qty:"",unit:""}],steps:[""] });

  const [authMode,  setAuthMode]  = useState("login");
  const [authForm,  setAuthForm]  = useState({name:"",email:"",password:""});
  const [authError, setAuthError] = useState("");
  const [authLoading,setAuthLoading]=useState(false);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // ── SUPABASE AUTH ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => { setSession(session); if(session) loadProfile(session.user.id); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session) => {
      setSession(session);
      if(session) loadProfile(session.user.id); else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const {data} = await supabase.from("profiles").select("*").eq("id",userId).single();
    if(data) setProfile(data);
  };

  const handleAuth = async () => {
    setAuthError(""); setAuthLoading(true);
    if(authMode==="signup") {
      const {error} = await supabase.auth.signUp({ email:authForm.email, password:authForm.password, options:{data:{name:authForm.name}} });
      if(error) setAuthError(error.message);
      else { showToast("Account created! Check your email to confirm. 🎉"); setScreen("home"); }
    } else {
      const {error} = await supabase.auth.signInWithPassword({ email:authForm.email, password:authForm.password });
      if(error) setAuthError(error.message);
      else { showToast(`Welcome back! 👋`); setScreen("home"); }
    }
    setAuthLoading(false);
    setAuthForm({name:"",email:"",password:""});
  };

  const logout = async () => { await supabase.auth.signOut(); setProfile(null); setMealPlan({}); showToast("Logged out.","info"); };

  // ── LOAD RECIPES ──────────────────────────────────────────────────────────
  useEffect(() => { loadRecipes(); }, []);

  const loadRecipes = async () => {
    setLoading(true);
    const {data,error} = await supabase.from("recipes").select("*").order("created_at",{ascending:false});
    if(error || !data || data.length===0) {
      await seedRecipes();
    } else {
      setRecipes(data);
      await loadRatings(data.map(r=>r.id));
    }
    setLoading(false);
  };

  const seedRecipes = async () => {
    const {error} = await supabase.from("recipes").upsert(SEED_RECIPES, {onConflict:"id"});
    if(!error) {
      const {data} = await supabase.from("recipes").select("*").order("created_at",{ascending:false});
      if(data) setRecipes(data);
      else setRecipes(SEED_RECIPES);
    }
  };

  const loadRatings = async (recipeIds) => {
    if(!recipeIds.length) return;
    const {data} = await supabase.from("recipe_ratings").select("*").in("recipe_id",recipeIds);
    if(data) {
      const map = {};
      data.forEach(r => { map[r.recipe_id] = { avg: parseFloat(r.avg_stars)||0, count: parseInt(r.total_ratings)||0 }; });
      setRecipeRatings(map);
    }
  };

  // ── LOAD MEAL PLAN ────────────────────────────────────────────────────────
  useEffect(() => {
    if(session) loadMealPlan();
    else setMealPlan({});
  }, [session]);

  const loadMealPlan = async () => {
    const {data} = await supabase.from("meal_plans").select("*").eq("user_id",session.user.id);
    if(data) {
      const map = {};
      data.forEach(row => { map[`${row.day}-${row.slot}`] = row.recipe_snapshot; });
      setMealPlan(map);
    }
  };

  // ── MEAL PLAN ACTIONS ─────────────────────────────────────────────────────
  const addToMealPlan = async (day, slot, recipe) => {
    const key = `${day}-${slot}`;
    const snapshot = { id:recipe.id, name:recipe.name, emoji:recipe.emoji, calories:recipe.calories, protein:recipe.protein, carbs:recipe.carbs, fat:recipe.fat, category:recipe.category, categories:recipe.categories||(recipe.category?[recipe.category]:[]), ingredients:recipe.ingredients, steps:recipe.steps, base_servings:recipe.base_servings, description:recipe.description, tags:recipe.tags };
    setMealPlan(prev => ({...prev,[key]:snapshot}));
    if(session) {
      await supabase.from("meal_plans").upsert({ user_id:session.user.id, day, slot, recipe_id:recipe.id, recipe_snapshot:snapshot }, {onConflict:"user_id,day,slot"});
    }
    showToast(`${recipe.emoji} Added to ${day} ${slot}!`);
  };

  const removeFromPlan = async (key) => {
    const [day,slot] = key.split("-");
    setMealPlan(prev => { const n={...prev}; delete n[key]; return n; });
    if(session) await supabase.from("meal_plans").delete().eq("user_id",session.user.id).eq("day",day).eq("slot",slot);
  };

  const plannedCount = Object.keys(mealPlan).length;
  const weeklyNutrition = useMemo(() => {
    const vals = Object.values(mealPlan);
    return { calories:vals.reduce((s,r)=>s+(r.calories||0),0), protein:vals.reduce((s,r)=>s+(r.protein||0),0), carbs:vals.reduce((s,r)=>s+(r.carbs||0),0), fat:vals.reduce((s,r)=>s+(r.fat||0),0) };
  },[mealPlan]);

  // ── RATINGS & REVIEWS ─────────────────────────────────────────────────────
  const openRecipe = async (r) => {
    setSelectedRecipe(r); setRecipeServings(r.base_servings||r.baseServings||4);
    setUserRating(0); setReviewText(""); setRecipeReviews([]);
    setEditingCategories(false);
    setTempCategories(Array.isArray(r.categories)?r.categories:(r.category?[r.category]:[]));
    const {data} = await supabase.from("reviews").select("*").eq("recipe_id",r.id).order("created_at",{ascending:false});
    if(data) setRecipeReviews(data);
    if(session) {
      const {data:myRating} = await supabase.from("ratings").select("stars").eq("recipe_id",r.id).eq("user_id",session.user.id).single();
      if(myRating) setUserRating(myRating.stars);
    }
  };

  const submitRating = async (stars) => {
    if(!session) { showToast("Sign in to rate recipes","info"); return; }
    setUserRating(stars);
    await supabase.from("ratings").upsert({ recipe_id:selectedRecipe.id, user_id:session.user.id, user_name:profile?.name||"User", stars }, {onConflict:"recipe_id,user_id"});
    await loadRatings([selectedRecipe.id]);
    showToast(`Rated ${stars} star${stars!==1?"s":""}! ⭐`);
  };

  const submitReview = async () => {
    if(!session) { showToast("Sign in to leave a review","info"); return; }
    if(!reviewText.trim()) return;
    setReviewLoading(true);
    const {data,error} = await supabase.from("reviews").insert({ recipe_id:selectedRecipe.id, user_id:session.user.id, user_name:profile?.name||"User", body:reviewText.trim() }).select().single();
    if(!error && data) { setRecipeReviews(prev=>[data,...prev]); setReviewText(""); showToast("Review posted! 💬"); }
    setReviewLoading(false);
  };

  const saveCategories = async () => {
    if(!tempCategories.length) return;
    const primaryCat = tempCategories[0];
    const emojis={"Breakfast":"🌅","Lunch":"☀️","Dinner":"🍽️","Grilling":"🔥","Kids Drinks":"🧃","Adult Drinks":"🍹","Snacks":"🍿","Desserts":"🍰"};
    const newEmoji = emojis[primaryCat]||selectedRecipe.emoji||"🍽️";
    const {error} = await supabase.from("recipes").update({
      categories: tempCategories,
      category: primaryCat,
      emoji: newEmoji
    }).eq("id", selectedRecipe.id);
    if(!error) {
      setRecipes(prev => prev.map(r => r.id===selectedRecipe.id ? {...r, categories:tempCategories, category:primaryCat, emoji:newEmoji} : r));
      setSelectedRecipe(prev => ({...prev, categories:tempCategories, category:primaryCat, emoji:newEmoji}));
      showToast("Categories updated! ✅");
    } else {
      showToast("Error saving: "+error.message, "error");
    }
    setEditingCategories(false);
  };

  const deleteReview = async (reviewId) => {
    await supabase.from("reviews").delete().eq("id",reviewId);
    setRecipeReviews(prev=>prev.filter(r=>r.id!==reviewId));
    showToast("Review deleted.","info");
  };

  // ── SAVE RECIPE TO DB ─────────────────────────────────────────────────────
  const saveRecipeToDB = async (r) => {
    const rec = {
      id: "r"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
      name:r.name, description:r.desc||r.description||"", time:r.time,
      base_servings:Number(r.baseServings||r.base_servings||4),
      calories:Number(r.calories||0), protein:Number(r.protein||0),
      carbs:Number(r.carbs||0), fat:Number(r.fat||0),
      category:r.category, emoji:r.emoji||"🍽️", tags:r.tags||[],
      ingredients:r.ingredients||[], steps:r.steps||[],
      source: session?"community":"built-in",
      imported_by: session?session.user.id:null,
      imported_by_name: profile?.name||session?.user?.email?.split("@")[0]||"Anonymous",
      collection: r.collection||"None",
    };
    const {error} = await supabase.from("recipes").insert(rec);
    if(error) { showToast("Error saving: "+error.message,"error"); return null; }
    setRecipes(prev=>[rec,...prev]);
    showToast(`${rec.emoji} "${rec.name}" added to the community library!`);
    return rec;
  };

  // ── NUTRITION SCALING ─────────────────────────────────────────────────────
  const scaledNutrition = (r,s) => {
    const ratio=s/((r.base_servings||r.baseServings)||4);
    return { calories:Math.round((r.calories||0)*ratio), protein:Math.round((r.protein||0)*ratio), carbs:Math.round((r.carbs||0)*ratio), fat:Math.round((r.fat||0)*ratio) };
  };
  const scaledIngredients = (r,s) => {
    const ratio=s/((r.base_servings||r.baseServings)||4);
    return (r.ingredients||[]).map(i=>({...i,qty:typeof i.qty==="number"?Math.round(i.qty*ratio*4)/4:i.qty}));
  };

  // ── GROCERY ───────────────────────────────────────────────────────────────
  const groceryList = useMemo(() => {
    const map={};
    Object.values(mealPlan).forEach(recipe=>{
      (recipe.ingredients||[]).forEach(ing=>{
        const key=ing.item.toLowerCase();
        if(!map[key]) map[key]={...ing,recipes:[recipe.name]};
        else map[key].recipes.push(recipe.name);
      });
    });
    return Object.values(map);
  },[mealPlan]);

  // ── AI SEARCH ─────────────────────────────────────────────────────────────
  const aiSearch = async () => {
    if(!aiQuery.trim()) return;
    setAiLoading(true); setAiError(""); setAiResults([]); setAiSearched(true);
    try {
      const prompt = `You are a professional chef and recipe database. The user is searching for: "${aiQuery}"
Generate 4 different recipes that match this search.
${RECIPE_JSON_SPEC.replace("Return ONLY valid JSON","Return ONLY a valid JSON array of 4 recipes")}
Return an array: [recipe1, recipe2, recipe3, recipe4]`;
      const clean = await callClaude(prompt);
      const parsed = JSON.parse(clean);
      setAiResults(Array.isArray(parsed)?parsed:[parsed]);
    } catch(e) { setAiError("Error: "+e.message); }
    setAiLoading(false);
  };

  const saveAiRecipe = async (r) => { await saveRecipeToDB(r); };

  // ── IMPORTS ───────────────────────────────────────────────────────────────
  const confirmImport = () => { if(!importResult) return; saveRecipeToDB(importResult); resetImport(); };
  const resetImport = () => { setImportOpen(false);setImportMode("menu");setImportUrl("");setImportText("");setImportDescribe("");setImportPhoto(null);setImportResult(null);setImportError(""); setManualRecipe({name:"",time:"",baseServings:4,calories:"",protein:"",carbs:"",fat:"",categories:[],collection:"None",tags:[],desc:"",ingredients:[{item:"",qty:"",unit:""}],steps:[""]}); };

  const importByUrl = async () => {
    if(!importUrl.trim()) return; setImportLoading(true);setImportError("");setImportResult(null);
    try { const c=await callClaude(`Import recipe from URL: ${importUrl}\n${RECIPE_JSON_SPEC}`); setImportResult({...JSON.parse(c),id:"tmp"}); } catch(e){setImportError(e.message);}
    setImportLoading(false);
  };
  const importByText = async () => {
    if(!importText.trim()) return; setImportLoading(true);setImportError("");setImportResult(null);
    try { const c=await callClaude(`Parse this recipe text:\n${importText}\n${RECIPE_JSON_SPEC}`); setImportResult({...JSON.parse(c),id:"tmp"}); } catch(e){setImportError(e.message);}
    setImportLoading(false);
  };
  const importByDescribe = async () => {
    if(!importDescribe.trim()) return; setImportLoading(true);setImportError("");setImportResult(null);
    try { const c=await callClaude(`Create a recipe for: "${importDescribe}"\n${RECIPE_JSON_SPEC}`); setImportResult({...JSON.parse(c),id:"tmp"}); } catch(e){setImportError(e.message);}
    setImportLoading(false);
  };
  const importByPhoto = async () => {
    if(!importPhoto) return; setImportLoading(true);setImportError("");setImportResult(null);
    try {
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(importPhoto);});
      const c=await callClaude(`Extract the recipe from this image.\n${RECIPE_JSON_SPEC}`,{base64,mediaType:importPhoto.type||"image/jpeg"});
      setImportResult({...JSON.parse(c),id:"tmp"});
    } catch(e){setImportError(e.message);}
    setImportLoading(false);
  };
  const confirmManual = () => {
    const r=manualRecipe;
    if(!r.name.trim()) return setImportError("Please enter a recipe name.");
    if(!(r.categories||[]).length) return setImportError("Please select at least one category.");
    if(!r.ingredients.filter(i=>i.item.trim()).length) return setImportError("Add at least one ingredient.");
    if(!r.steps.filter(s=>s.trim()).length) return setImportError("Add at least one step.");
    const emojis={"Breakfast":"🌅","Lunch":"☀️","Dinner":"🍽️","Grilling":"🔥","Kids Drinks":"🧃","Adult Drinks":"🍹","Snacks":"🍿","Desserts":"🍰"};
    const primaryCat=(r.categories||[])[0]||"Dinner";
    saveRecipeToDB({...r,category:primaryCat,categories:r.categories,emoji:emojis[primaryCat]||"🍽️",desc:r.desc,collection:r.collection||"None",ingredients:r.ingredients.filter(i=>i.item.trim()).map(i=>({...i,qty:isNaN(Number(i.qty))?i.qty:Number(i.qty)})),steps:r.steps.filter(s=>s.trim())});
    resetImport();
  };

  // ── PRINT ─────────────────────────────────────────────────────────────────
  const printMealPlan = () => {
    const rows=DAYS.map(day=>{
      const cells=MEAL_SLOTS.map(slot=>{
        const recipe=mealPlan[`${day}-${slot}`];
        return `<td style="border:1px solid #F0D9C8;padding:10px;vertical-align:top;width:30%;">${recipe?`<div style="font-size:20px;margin-bottom:4px;">${recipe.emoji}</div><div style="font-weight:700;font-size:13px;margin-bottom:2px;">${recipe.name}</div><div style="font-size:11px;color:#8B5E3C;">🔥${recipe.calories}cal P:${recipe.protein}g C:${recipe.carbs}g F:${recipe.fat}g</div>`:'<div style="color:#F0D9C8;font-size:12px;">—</div>'}</td>`;
      }).join("");
      return `<tr><td style="border:1px solid #F0D9C8;padding:10px;font-weight:700;font-size:13px;background:#FFF2E6;white-space:nowrap;">${day}</td>${cells}</tr>`;
    }).join("");
    const n=weeklyNutrition;
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Anderson Heirloom Recipes — Weekly Meal Plan</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#2C1810;}h1{color:#FF6B35;margin-bottom:4px;}.sub{color:#8B5E3C;font-size:13px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th{background:#FF6B35;color:white;padding:10px;font-size:13px;text-align:left;}.sum{background:#FFF8F0;border:2px solid #FF6B35;border-radius:8px;padding:14px 20px;display:flex;gap:30px;margin-bottom:16px;}.sv{text-align:center;}.val{font-size:22px;font-weight:900;color:#FF6B35;}.lbl{font-size:11px;color:#8B5E3C;}@media print{body{padding:10px;}}</style></head><body><h1>🏡 Anderson Heirloom Recipes — Weekly Meal Plan</h1><div class="sub">Printed ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div><div class="sum"><div class="sv"><div class="val">${n.calories}</div><div class="lbl">Calories</div></div><div class="sv"><div class="val">${n.protein}g</div><div class="lbl">Protein</div></div><div class="sv"><div class="val">${n.carbs}g</div><div class="lbl">Carbs</div></div><div class="sv"><div class="val">${n.fat}g</div><div class="lbl">Fat</div></div><div class="sv"><div class="val">${plannedCount}</div><div class="lbl">Meals</div></div></div><table><thead><tr><th style="width:12%;">Day</th><th style="width:29%;">🌅 Breakfast</th><th style="width:29%;">☀️ Lunch</th><th style="width:29%;">🌙 Dinner</th></tr></thead><tbody>${rows}</tbody></table><div style="font-size:11px;color:#F0D9C8;text-align:center;margin-top:20px;">Anderson Heirloom Recipes — andersonheirloomrecipes.com</div><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  const printGroceryList = () => {
    const items=groceryList;
    const rows=items.map((ing,i)=>`<tr style="background:${i%2===0?"#fff":"#FFF8F0"};"><td style="border:1px solid #F0D9C8;padding:10px;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:18px;height:18px;border:2px solid #F0D9C8;border-radius:4px;flex-shrink:0;"></div><div><div style="font-weight:700;font-size:14px;">${ing.item}</div><div style="font-size:11px;color:#8B5E3C;">Used in: ${ing.recipes.join(", ")}</div></div></div></td><td style="border:1px solid #F0D9C8;padding:10px;text-align:right;font-weight:700;color:#FF6B35;white-space:nowrap;">${typeof ing.qty==="number"?ing.qty:""} ${ing.unit}</td></tr>`).join("");
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Anderson Heirloom Recipes — Grocery List</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#2C1810;}h1{color:#FF6B35;margin-bottom:4px;}.sub{color:#8B5E3C;font-size:13px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th{background:#FF6B35;color:white;padding:10px;font-size:13px;text-align:left;}.tip{background:#FFF8F0;border-left:4px solid #FF6B35;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#8B5E3C;border-radius:0 8px 8px 0;}@media print{body{padding:10px;}}</style></head><body><h1>🛒 Anderson Heirloom Recipes — Grocery List</h1><div class="sub">Week of ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} · ${items.length} items · ${plannedCount} meals planned</div><div class="tip">💡 Check off items as you shop!</div><table><thead><tr><th>Item</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="font-size:11px;color:#F0D9C8;text-align:center;margin-top:20px;">Anderson Heirloom Recipes — andersonheirloomrecipes.com</div><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  // ── FILTERED RECIPES ──────────────────────────────────────────────────────
  const filtered = useMemo(()=>recipes.filter(r=>{
    const dietMatch=activeDiet==="All"||(r.tags||[]).includes(activeDiet);
    const catMatch=activeCategory==="All"||(Array.isArray(r.categories)?r.categories.includes(activeCategory):(r.category===activeCategory));
    const colMatch=activeCollection==="All"||(r.collection||"None")===activeCollection;
    const srchMatch=(r.name||"").toLowerCase().includes(search.toLowerCase())||(r.description||"").toLowerCase().includes(search.toLowerCase());
    return dietMatch&&catMatch&&colMatch&&srchMatch;
  }),[recipes,activeDiet,activeCategory,activeCollection,search]);

  // ── STYLE HELPERS ─────────────────────────────────────────────────────────
  const currentServings = recipeServings ?? ((selectedRecipe?.base_servings||selectedRecipe?.baseServings)||4);
  const pill=(active,color=C.accent)=>({padding:"5px 13px",borderRadius:20,border:`1px solid ${active?color:C.border}`,cursor:"pointer",fontWeight:600,fontSize:12,whiteSpace:"nowrap",background:active?`${color}22`:"transparent",color:active?color:C.muted,transition:"all 0.15s"});
  const btnStyle=(color=C.accent)=>({background:`linear-gradient(135deg,${color},${color}bb)`,border:"none",color:"#fff",borderRadius:10,padding:"10px 18px",cursor:"pointer",fontWeight:700,fontSize:13});
  const ghostBtn={background:"transparent",border:`1.5px solid ${C.border}`,color:C.text,borderRadius:10,padding:"9px 16px",cursor:"pointer",fontWeight:600,fontSize:13};
  const inputStyle={width:"100%",padding:"10px 14px",background:"#FFFAF5",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10};
  const statCard={background:"#FFFAF5",borderRadius:12,border:`1.5px solid ${C.border}`,padding:"14px 16px",textAlign:"center"};
  const modal={position:"fixed",inset:0,background:"rgba(44,24,16,0.75)",zIndex:200,overflowY:"auto",padding:16,display:"flex",alignItems:"flex-start",justifyContent:"center"};
  const modalBox={background:C.card,borderRadius:18,width:"100%",maxWidth:500,margin:"20px 0",padding:24,border:`1.5px solid ${C.border}`,boxShadow:"0 20px 60px rgba(44,24,16,0.15)"};
  const tagStyle=(t)=>({padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:tagColors[t]?.bg||"#FFF2E6",color:tagColors[t]?.text||C.muted});

  // ── RECIPE CARD COMPONENT ─────────────────────────────────────────────────
  const RecipeCard = ({r,showSave=false}) => {
    const [photo,setPhoto]=useState(null);
    const [photoLoading,setPhotoLoading]=useState(false);
    const rating=recipeRatings[r.id];
    useEffect(()=>{
      if(!photo&&!photoLoading){setPhotoLoading(true);fetchPhoto(r.name).then(p=>{if(p)setPhoto(p);setPhotoLoading(false);});}
    },[r.name]);
    return (
      <div style={{background:C.card,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.2s",boxShadow:"0 2px 8px rgba(44,24,16,0.06)"}}
        onClick={()=>openRecipe(r)}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 8px 24px rgba(255,107,53,0.18)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 2px 8px rgba(44,24,16,0.06)";}}>
        <div style={{position:"relative",width:"100%",height:160,overflow:"hidden",background:"#FFF2E6"}}>
          {photo?(<><img src={photo.thumb||photo.url} alt={r.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><div style={{position:"absolute",bottom:4,right:6,fontSize:9,color:"rgba(255,255,255,0.7)"}}>📷 {photo.credit}</div></>):(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:52}}>{photoLoading?"⏳":r.emoji}</div>)}
          <div style={{position:"absolute",top:8,left:8,fontSize:20,background:"rgba(255,255,255,0.9)",borderRadius:8,padding:"2px 8px"}}>{r.emoji}</div>
          {rating&&rating.count>0&&<div style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.95)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:starColor(rating.avg)}}>{"⭐".repeat(Math.round(rating.avg))} {rating.avg} ({rating.count})</div>}
        </div>
        <div style={{padding:"10px 14px 14px"}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:2,color:C.text}}>{r.name}</div>
          {r.imported_by_name&&<div style={{fontSize:11,color:C.muted,marginBottom:4}}>Added by {r.imported_by_name}</div>}
          <div style={{color:C.muted,fontSize:12,marginBottom:8,lineHeight:1.5}}>{r.description||r.desc}</div>
          <div style={{display:"flex",gap:10,fontSize:11,color:C.muted,marginBottom:8}}>
            <span>⏱ {r.time}</span><span>👤 {r.base_servings||r.baseServings}</span><span>🔥 {r.calories} cal</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
            {[{l:"Protein",v:r.protein||0,color:C.green,max:60},{l:"Carbs",v:r.carbs||0,color:C.peach,max:80},{l:"Fat",v:r.fat||0,color:C.red,max:40}].map(m=>(
              <div key={m.l}><div style={{fontSize:10,color:C.muted,marginBottom:2}}>{m.l} {m.v}g</div><div style={{background:"#F0D9C8",borderRadius:3,height:4}}><div style={{background:m.color,height:4,borderRadius:3,width:`${Math.min(100,(m.v/m.max)*100)}%`}}/></div></div>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:showSave?10:0}}>
            {(r.tags||[]).map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}
            <span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#DBEAFE",color:"#1D4ED8"}}>{r.category}</span>
            {(Array.isArray(r.categories)?r.categories:[r.category]).filter(Boolean).map(cat=>(
              <span key={cat} style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#DBEAFE",color:"#1D4ED8"}}>{cat}</span>
            ))}
            {r.collection&&r.collection!=="None"&&<span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#FFF3CD",color:"#7A5800"}}>📚 {r.collection}</span>}
          </div>
          {showSave&&(
            <div style={{display:"flex",gap:6,marginTop:6}} onClick={e=>e.stopPropagation()}>
              <button style={{...btnStyle(C.green),fontSize:11,padding:"6px 12px",flex:1}} onClick={()=>saveAiRecipe(r)}>💾 Save to Library</button>
              <button style={{...btnStyle(),fontSize:11,padding:"6px 12px",flex:1}} onClick={async()=>{const saved=await saveRecipeToDB(r);if(saved)setPlanPickerOpen({recipe:saved});}}>+ Meal Plan</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── STARS COMPONENT ───────────────────────────────────────────────────────
  const StarRating = ({value,onRate,interactive=false,size=20}) => (
    <div style={{display:"flex",gap:3}}>
      {[1,2,3,4,5].map(n=>(
        <span key={n} style={{fontSize:size,cursor:interactive?"pointer":"default",color:n<=value?"#FF6B35":"#F0D9C8",transition:"color 0.1s"}}
          onClick={()=>interactive&&onRate&&onRate(n)}>★</span>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif",paddingBottom:90}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {toast&&<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?C.green:toast.type==="info"?C.accent:C.red,color:"#fff",padding:"10px 20px",borderRadius:20,fontWeight:700,fontSize:13,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(44,24,16,0.2)"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:C.card,borderBottom:`2px solid ${C.accent}`,padding:"14px 18px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(255,107,53,0.12)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:900,background:`linear-gradient(90deg,${C.accent2},${C.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.3px"}}>🏡 Anderson Heirloom Recipes</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {session&&profile?(<>
              <div style={{background:`linear-gradient(135deg,${C.accent2},${C.accent})`,borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff"}}>{profile.name[0].toUpperCase()}</div>
              <button onClick={logout} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>Sign out</button>
            </>):(<button onClick={()=>{setScreen("profile");setAuthMode("login");}} style={{...btnStyle(),fontSize:12,padding:"7px 14px"}}>Sign In</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginTop:12,overflowX:"auto",scrollbarWidth:"none"}}>
          {[["home","🍽️ Recipes"],["search","🤖 AI Search"],["planner","📅 Plan"],["grocery","🛒 Groceries"],["profile","👤 Profile"]].map(([id,label])=>(
            <button key={id} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,transition:"all 0.15s",background:screen===id?C.accent:"transparent",color:screen===id?"#fff":C.text,whiteSpace:"nowrap"}} onClick={()=>setScreen(id)}>
              {label}{id==="planner"&&plannedCount>0?<span style={{marginLeft:5,background:"#ffffff44",borderRadius:10,padding:"1px 6px",fontSize:10}}>{plannedCount}</span>:null}
            </button>
          ))}
        </div>
      </div>

      {/* ── RECIPES ── */}
      {screen==="home"&&(
        <div>
          <div style={{background:`linear-gradient(135deg,${C.accent2},${C.accent},${C.peach})`,padding:"24px 20px 20px",textAlign:"center"}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Welcome to</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:4,letterSpacing:"-0.5px"}}>Anderson Heirloom Recipes</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)"}}>Family recipes, passed down with love 🏡</div>
          </div>
          <div style={{padding:"14px 16px 0"}}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...inputStyle,flex:1,marginBottom:0}} placeholder="🔍  Search recipes..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <button style={btnStyle()} onClick={()=>setImportOpen(true)}>＋ Add Recipe</button>
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
              {DIETS.map(d=><button key={d} style={pill(activeDiet===d)} onClick={()=>setActiveDiet(d)}>{d}</button>)}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",marginTop:8,paddingBottom:4}}>
              {CATEGORIES.map(c=><button key={c} style={pill(activeCategory===c,C.accent2)} onClick={()=>setActiveCategory(c)}>{CAT_EMOJI[c]} {c}</button>)}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",marginTop:8,paddingBottom:4}}>
              <button key="all-col" style={pill(activeCollection==="All",C.gold)} onClick={()=>setActiveCollection("All")}>📚 All Collections</button>
              {FAMILY_COLLECTIONS.filter(c=>c!=="None").map(c=><button key={c} style={pill(activeCollection===c,C.gold)} onClick={()=>setActiveCollection(c)}>{c}</button>)}
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,fontWeight:600}}>{loading?"Loading recipes...":filtered.length+" recipe"+(filtered.length!==1?"s":"")+" found"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14,padding:"16px"}}>
            {filtered.map(r=><RecipeCard key={r.id} r={r}/>)}
            {!loading&&filtered.length===0&&(
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:C.muted}}>
                <div style={{fontSize:48}}>🍽️</div>
                <div style={{fontWeight:800,marginTop:8,color:C.text,fontSize:16}}>No recipes found</div>
                <div style={{fontSize:13,marginTop:4}}>Try adjusting filters or use AI Search</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI SEARCH ── */}
      {screen==="search"&&(
        <div style={{padding:16}}>
          <div style={{background:`linear-gradient(135deg,${C.accent2},${C.accent})`,borderRadius:14,padding:"18px 20px",marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:24}}>🤖</div>
            <div style={{fontWeight:900,fontSize:18,color:"#fff",marginBottom:2}}>AI Recipe Search</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>Search for any recipe imaginable — instant results</div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Try these →</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["BBQ brisket","Grilled shrimp","Kids lemonade","Frozen margarita","Keto dinner","Chocolate dessert","Quick breakfast","Vegetarian pasta","Summer cocktails","Healthy snacks","Grilled veggies","Watermelon drinks"].map(s=>(
                <button key={s} style={{padding:"6px 12px",borderRadius:20,background:"#FFFAF5",border:`1.5px solid ${C.border}`,color:C.text,fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setAiQuery(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <input style={{...inputStyle,flex:1,marginBottom:0,fontSize:15}} placeholder="e.g. 'grilled salmon' or 'summer kids drinks'..." value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&aiSearch()}/>
            <button style={{...btnStyle(),padding:"10px 20px",opacity:aiLoading?0.6:1}} onClick={aiSearch} disabled={aiLoading}>{aiLoading?"⏳":"Search"}</button>
          </div>
          {aiLoading&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:48,marginBottom:12}}>👨‍🍳</div><div style={{fontWeight:800,fontSize:18,color:C.text}}>Chef AI is cooking...</div><div style={{color:C.muted,fontSize:13,marginTop:6}}>Generating 4 recipes for "{aiQuery}"</div></div>}
          {aiError&&<div style={{color:C.red,background:`${C.red}11`,borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13}}>{aiError}</div>}
          {aiResults.length>0&&(<><div style={{fontWeight:700,fontSize:14,color:C.muted,marginBottom:12}}>✨ {aiResults.length} recipes found for "{aiQuery}" — save any you like!</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>{aiResults.map((r,i)=><RecipeCard key={i} r={{...r,id:"ai_"+i,base_servings:r.baseServings,description:r.desc}} showSave={true}/>)}</div></>)}
          {!aiSearched&&<div style={{background:`linear-gradient(135deg,#FFF2E6,#FFE5D0)`,borderRadius:16,padding:"32px 24px",textAlign:"center",border:`1.5px solid ${C.border}`}}><div style={{fontSize:56}}>🍳</div><div style={{fontWeight:900,fontSize:20,marginTop:12,color:C.text}}>Unlimited Recipes On Demand</div><div style={{fontSize:13,marginTop:10,lineHeight:2,color:C.muted}}>🔥 Grilling · 🧃 Kids Drinks · 🍹 Cocktails · 🥗 Healthy<br/>🍰 Desserts · 🌅 Breakfast · 🍿 Snacks · and millions more</div></div>}
        </div>
      )}

      {/* ── PLANNER ── */}
      {screen==="planner"&&(
        <div style={{padding:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontWeight:900,fontSize:20,color:C.text}}>📅 Weekly Meal Planner</div>
            {plannedCount>0&&<button style={{...btnStyle(C.green),fontSize:12,padding:"8px 14px"}} onClick={printMealPlan}>🖨️ Print Plan</button>}
          </div>
          {!session&&<div style={{background:"#FFF2E6",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.muted}}>💡 <strong>Sign in</strong> to save your meal plan across devices!</div>}
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Tap any empty slot to add a recipe.</div>
          {plannedCount>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[{l:"Calories",v:weeklyNutrition.calories,u:"",c:C.accent},{l:"Protein",v:weeklyNutrition.protein,u:"g",c:C.green},{l:"Carbs",v:weeklyNutrition.carbs,u:"g",c:C.peach},{l:"Fat",v:weeklyNutrition.fat,u:"g",c:C.red}].map(n=>(
                <div key={n.l} style={{...statCard,background:"#FFF8F0"}}>
                  <div style={{fontSize:16,fontWeight:900,color:n.c}}>{n.v}{n.u}</div>
                  <div style={{fontSize:10,color:C.muted}}>{n.l}/week</div>
                </div>
              ))}
            </div>
          )}
          <div style={{overflowX:"auto"}}>
            <div style={{minWidth:520}}>
              <div style={{display:"grid",gridTemplateColumns:"84px repeat(3,1fr)",gap:2,marginBottom:2}}>
                <div/>{MEAL_SLOTS.map(sl=><div key={sl} style={{fontSize:11,fontWeight:700,color:C.muted,textAlign:"center",padding:"6px 0"}}>{sl}</div>)}
              </div>
              {DAYS.map(day=>(
                <div key={day} style={{display:"grid",gridTemplateColumns:"84px repeat(3,1fr)",gap:2,marginBottom:2}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.muted,display:"flex",alignItems:"center",paddingLeft:4}}>{day.slice(0,3)}</div>
                  {MEAL_SLOTS.map(slot=>{
                    const key=`${day}-${slot}`;const recipe=mealPlan[key];
                    return (
                      <div key={slot} style={{background:recipe?"#FFF0EB":"#FFFAF5",border:`1.5px solid ${recipe?C.accent:C.border}`,borderRadius:8,padding:8,minHeight:54,cursor:"pointer"}} onClick={()=>!recipe&&setPlanPickerOpen({day,slot})}>
                        {recipe?(<div><div style={{fontSize:18}}>{recipe.emoji}</div><div style={{fontSize:10,fontWeight:700,lineHeight:1.2,marginBottom:3,color:C.text}}>{recipe.name.length>22?recipe.name.slice(0,22)+"…":recipe.name}</div><div style={{fontSize:9,color:C.muted}}>🔥{recipe.calories}cal</div><button onClick={e=>{e.stopPropagation();removeFromPlan(key);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:9,padding:0,marginTop:2}}>✕ remove</button></div>):(<div style={{color:C.peach,textAlign:"center",lineHeight:"38px",fontSize:20,fontWeight:700}}>+</div>)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GROCERY ── */}
      {screen==="grocery"&&(
        <div style={{padding:16}}>
          <div style={{fontWeight:900,fontSize:20,marginBottom:4,color:C.text}}>🛒 Grocery List</div>
          {groceryList.length===0?(<div style={{textAlign:"center",padding:"60px 0",color:C.muted}}><div style={{fontSize:48}}>🛒</div><div style={{fontWeight:700,marginTop:8}}>Your list is empty</div><div style={{fontSize:13,marginTop:4}}>Add recipes to your Meal Plan — the grocery list builds itself!</div><button style={{...btnStyle(),marginTop:16}} onClick={()=>setScreen("planner")}>Go to Planner →</button></div>):(
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontSize:13,color:C.muted}}>{groceryList.length} items · {groceryList.filter(i=>checkedItems[i.item]).length} checked off</div>
                <button style={{...btnStyle(C.green),fontSize:12,padding:"8px 14px"}} onClick={printGroceryList}>🖨️ Print List</button>
              </div>
              <div style={{background:"#FFFAF5",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"0 16px"}}>
                {groceryList.map((ing,i)=>{
                  const checked=checkedItems[ing.item];
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<groceryList.length-1?`1px solid ${C.border}`:"none",opacity:checked?0.45:1,cursor:"pointer"}} onClick={()=>setCheckedItems(p=>({...p,[ing.item]:!p[ing.item]}))}>
                      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?C.green:C.peach}`,background:checked?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:"#fff",fontSize:11}}>✓</span>}</div>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,textDecoration:checked?"line-through":"none",color:C.text}}>{ing.item}</div><div style={{fontSize:11,color:C.muted}}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit} · {ing.recipes.length} meal{ing.recipes.length>1?"s":""}</div></div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button style={ghostBtn} onClick={()=>setCheckedItems({})}>Clear checks</button>
                <button style={btnStyle()} onClick={()=>{const t=groceryList.map(i=>`• ${i.item}: ${typeof i.qty==="number"?i.qty:""} ${i.unit}`).join("\n");navigator.clipboard?.writeText(t).then(()=>showToast("Copied to clipboard! 📋"));}}>📋 Copy List</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PROFILE ── */}
      {screen==="profile"&&(
        <div style={{padding:16,maxWidth:420,margin:"0 auto"}}>
          {session&&profile?(<>
            <div style={{textAlign:"center",padding:"24px 0 20px"}}>
              <div style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent2},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#fff",margin:"0 auto 12px"}}>{profile.name[0].toUpperCase()}</div>
              <div style={{fontWeight:900,fontSize:22,color:C.text}}>{profile.name}</div>
              <div style={{color:C.muted,fontSize:14}}>{profile.email}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>Member since {fmtDate(profile.created_at)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20,marginTop:4}}>
              <div style={statCard}><div style={{fontSize:24,fontWeight:900,color:C.accent}}>{recipes.filter(r=>r.imported_by===session.user.id).length}</div><div style={{fontSize:12,color:C.muted}}>My Recipes Added</div></div>
              <div style={statCard}><div style={{fontSize:24,fontWeight:900,color:C.green}}>{plannedCount}</div><div style={{fontSize:12,color:C.muted}}>Meals Planned</div></div>
            </div>
            <div style={{fontWeight:700,marginBottom:10,color:C.text}}>My Diet Preferences</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
              {DIETS.filter(d=>d!=="All").map(d=>{
                const active=(profile.diet_prefs||[]).includes(d);
                return <button key={d} style={{...pill(active,C.green),border:`1.5px solid ${active?C.green:C.border}`,background:active?"#D4EDDA":"#FFFAF5"}} onClick={async()=>{
                  const prefs=profile.diet_prefs||[];
                  const updated=active?prefs.filter(p=>p!==d):[...prefs,d];
                  const updatedProfile={...profile,diet_prefs:updated};
                  setProfile(updatedProfile);
                  await supabase.from("profiles").update({diet_prefs:updated}).eq("id",session.user.id);
                }}>{active?"✓ ":""}{d}</button>;
              })}
            </div>
            <button style={{...ghostBtn,width:"100%"}} onClick={logout}>Sign Out</button>
          </>):(
            <div style={{paddingTop:30,maxWidth:380,margin:"0 auto"}}>
              <div style={{fontWeight:900,fontSize:22,marginBottom:4,textAlign:"center",color:C.text}}>{authMode==="login"?"Welcome back 👋":"Create your account ✨"}</div>
              <div style={{color:C.muted,fontSize:13,textAlign:"center",marginBottom:24}}>{authMode==="login"?"Sign in to save your recipes and meal plans":"Free forever — sync across all your devices"}</div>
              {authMode==="signup"&&<input style={inputStyle} placeholder="Your name" value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))}/>}
              <input style={inputStyle} placeholder="Email address" type="email" value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))}/>
              <input style={inputStyle} placeholder="Password" type="password" value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
              {authError&&<div style={{color:C.red,fontSize:13,marginBottom:10}}>{authError}</div>}
              <button style={{...btnStyle(),width:"100%",padding:"12px 0",marginBottom:12,opacity:authLoading?0.7:1}} onClick={handleAuth} disabled={authLoading}>{authLoading?"Please wait...":authMode==="login"?"Sign In":"Create Account"}</button>
              <div style={{textAlign:"center",fontSize:13,color:C.muted}}>
                {authMode==="login"?"Don't have an account? ":"Already have an account? "}
                <span style={{color:C.accent,cursor:"pointer",fontWeight:700}} onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>
                  {authMode==="login"?"Sign up free":"Sign in"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RECIPE DETAIL MODAL ── */}
      {selectedRecipe&&(
        <div style={modal} onClick={()=>setSelectedRecipe(null)}>
          <div style={{...modalBox,maxWidth:540}} onClick={e=>e.stopPropagation()}>
            <button style={ghostBtn} onClick={()=>setSelectedRecipe(null)}>← Back</button>
            {(()=>{const cached=photoCache[selectedRecipe.name];return cached?(<div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:12,height:200}}><img src={cached.url} alt={selectedRecipe.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",bottom:4,right:8,fontSize:10,color:"rgba(255,255,255,0.7)"}}>📷 {cached.credit}</div><div style={{position:"absolute",top:8,left:8,fontSize:28,background:"rgba(255,255,255,0.9)",borderRadius:8,padding:"2px 8px"}}>{selectedRecipe.emoji}</div></div>):(<div style={{textAlign:"center",fontSize:56,margin:"12px 0 6px"}}>{selectedRecipe.emoji}</div>)})()}
            <div style={{fontWeight:900,fontSize:22,marginBottom:2,color:C.text}}>{selectedRecipe.name}</div>
            {selectedRecipe.imported_by_name&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>Added by <strong>{selectedRecipe.imported_by_name}</strong></div>}
            <div style={{color:C.muted,fontSize:13,marginBottom:10,lineHeight:1.5}}>{selectedRecipe.description||selectedRecipe.desc}</div>

            {/* Rating section */}
            <div style={{background:"#FFF8F0",borderRadius:12,padding:"12px 16px",marginBottom:12,border:`1.5px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>Community Rating</div>
                {recipeRatings[selectedRecipe.id]?.count>0&&<div style={{fontSize:13,color:C.muted}}>{recipeRatings[selectedRecipe.id].avg} ⭐ ({recipeRatings[selectedRecipe.id].count} rating{recipeRatings[selectedRecipe.id].count!==1?"s":""})</div>}
              </div>
              <StarRating value={recipeRatings[selectedRecipe.id]?.avg||0} size={22}/>
              {session&&(
                <div style={{marginTop:10}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{userRating?"Your rating:":"Rate this recipe:"}</div>
                  <StarRating value={userRating} onRate={submitRating} interactive={true} size={26}/>
                </div>
              )}
              {!session&&<div style={{fontSize:12,color:C.muted,marginTop:6}}>Sign in to rate this recipe</div>}
            </div>

            <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:12,color:C.muted,marginBottom:10,alignItems:"center"}}>
              <span>⏱ {selectedRecipe.time}</span><span>🔥 {scaledNutrition(selectedRecipe,currentServings).calories} cal</span>
              {!editingCategories && (Array.isArray(selectedRecipe.categories)?selectedRecipe.categories:[selectedRecipe.category]).filter(Boolean).map(cat=>(
                <span key={cat} style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#DBEAFE",color:"#1D4ED8"}}>{cat}</span>
              ))}
              {!editingCategories && selectedRecipe.collection&&selectedRecipe.collection!=="None"&&<span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#FFF3CD",color:"#7A5800"}}>📚 {selectedRecipe.collection}</span>}
              {session && !editingCategories && (
                <button onClick={()=>{setEditingCategories(true);setTempCategories(Array.isArray(selectedRecipe.categories)?[...selectedRecipe.categories]:(selectedRecipe.category?[selectedRecipe.category]:[]));}} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:"#FFF2E6",color:C.accent,border:`1px solid ${C.border}`,cursor:"pointer"}}>✏️ Edit</button>
              )}
              {editingCategories && (
                <div style={{width:"100%",marginTop:8,background:"#FFF8F0",borderRadius:12,padding:"14px 16px",border:`1.5px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>Select all categories that apply:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                    {["Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"].map(cat=>{
                      const on=tempCategories.includes(cat);
                      return (
                        <button key={cat} type="button"
                          style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${on?C.accent:C.border}`,background:on?`${C.accent}22`:"#fff",color:on?C.accent:C.muted,fontSize:12,cursor:"pointer",fontWeight:700,transition:"all 0.15s"}}
                          onClick={()=>setTempCategories(p=>on?p.filter(x=>x!==cat):[...p,cat])}>
                          {on?"✓ ":""}{CAT_EMOJI[cat]} {cat}
                        </button>
                      );
                    })}
                  </div>
                  {!tempCategories.length && <div style={{fontSize:12,color:C.red,marginBottom:8}}>Please select at least one category.</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...ghostBtn,fontSize:12,padding:"7px 14px"}} onClick={()=>setEditingCategories(false)}>Cancel</button>
                    <button style={{...btnStyle(C.green),fontSize:12,padding:"7px 16px",opacity:!tempCategories.length?0.5:1}} disabled={!tempCategories.length} onClick={saveCategories}>Save Categories ✓</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
              {(selectedRecipe.tags||[]).map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}
            </div>

            {/* Serving adjuster */}
            <div style={{background:"#FFF2E6",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>Servings</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>setRecipeServings(Math.max(1,currentServings-1))} style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontWeight:900,fontSize:20,minWidth:24,textAlign:"center",color:C.text}}>{currentServings}</span>
                <button onClick={()=>setRecipeServings(currentServings+1)} style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>

            {/* Nutrition */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {(()=>{const n=scaledNutrition(selectedRecipe,currentServings);return[{l:"Calories",v:n.calories,c:C.accent},{l:"Protein",v:n.protein+"g",c:C.green},{l:"Carbs",v:n.carbs+"g",c:C.peach},{l:"Fat",v:n.fat+"g",c:C.red}].map(m=>(<div key={m.l} style={{...statCard,padding:"10px 8px"}}><div style={{fontSize:15,fontWeight:900,color:m.c}}>{m.v}</div><div style={{fontSize:10,color:C.muted}}>{m.l}</div></div>))})()}
            </div>

            <div style={{fontWeight:800,fontSize:15,marginBottom:8,color:C.text}}>Ingredients</div>
            {scaledIngredients(selectedRecipe,currentServings).map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.text}}>{ing.item}</span>
                <span style={{color:C.accent,fontWeight:700}}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit}</span>
              </div>
            ))}

            <div style={{fontWeight:800,fontSize:15,margin:"16px 0 8px",color:C.text}}>Steps</div>
            {(selectedRecipe.steps||[]).map((step,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:24,height:24,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:13,lineHeight:1.6,paddingTop:3,color:C.text}}>{step}</div>
              </div>
            ))}

            {/* Reviews */}
            <div style={{marginTop:20,borderTop:`1.5px solid ${C.border}`,paddingTop:16}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:12,color:C.text}}>💬 Community Reviews ({recipeReviews.length})</div>
              {session?(
                <div style={{marginBottom:16}}>
                  <textarea style={{...inputStyle,height:80,resize:"vertical",fontFamily:"inherit"}} placeholder="Share your experience with this recipe..." value={reviewText} onChange={e=>setReviewText(e.target.value)}/>
                  <button style={{...btnStyle(),opacity:reviewLoading?0.6:1}} onClick={submitReview} disabled={reviewLoading}>{reviewLoading?"Posting...":"Post Review"}</button>
                </div>
              ):<div style={{fontSize:13,color:C.muted,marginBottom:12,background:"#FFF2E6",padding:"10px 14px",borderRadius:10}}>Sign in to leave a review</div>}
              {recipeReviews.length===0&&<div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"16px 0"}}>No reviews yet — be the first!</div>}
              {recipeReviews.map(rv=>(
                <div key={rv.id} style={{background:"#FFFAF5",borderRadius:10,padding:"12px 14px",marginBottom:10,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent2},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff"}}>{rv.user_name[0].toUpperCase()}</div>
                      <div><div style={{fontWeight:700,fontSize:13,color:C.text}}>{rv.user_name}</div><div style={{fontSize:11,color:C.muted}}>{fmtDate(rv.created_at)}</div></div>
                    </div>
                    {session&&session.user.id===rv.user_id&&<button onClick={()=>deleteReview(rv.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>🗑️</button>}
                  </div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{rv.body}</div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button style={{...btnStyle(),flex:1,padding:"12px 0"}} onClick={()=>{setPlanPickerOpen({recipe:selectedRecipe});setSelectedRecipe(null);}}>+ Add to Meal Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAN PICKER ── */}
      {planPickerOpen&&(
        <div style={modal} onClick={()=>setPlanPickerOpen(null)}>
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghostBtn} onClick={()=>setPlanPickerOpen(null)}>✕ Cancel</button>
            <div style={{fontWeight:800,fontSize:17,marginBottom:14,color:C.text}}>{planPickerOpen.recipe?`Add "${planPickerOpen.recipe.name}" to...`:`Pick a recipe for ${planPickerOpen.day} ${planPickerOpen.slot}`}</div>
            {planPickerOpen.recipe?(
              DAYS.map(day=>(<div key={day} style={{marginBottom:10}}><div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:6}}>{day}</div><div style={{display:"flex",gap:6}}>{MEAL_SLOTS.map(slot=>{const taken=!!mealPlan[`${day}-${slot}`];return <button key={slot} disabled={taken} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid ${taken?C.border:C.accent}`,background:taken?"#F5F5F5":`${C.accent}22`,color:taken?C.border:C.accent,cursor:taken?"not-allowed":"pointer",fontSize:12,fontWeight:700}} onClick={()=>{addToMealPlan(day,slot,planPickerOpen.recipe);setPlanPickerOpen(null);}}>{taken?"✓":slot}</button>;})}</div></div>))
            ):(
              <div style={{maxHeight:360,overflowY:"auto"}}>
                {recipes.map(r=>(<div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>{addToMealPlan(planPickerOpen.day,planPickerOpen.slot,r);setPlanPickerOpen(null);}}>
                  <span style={{fontSize:24}}>{r.emoji}</span>
                  <div><div style={{fontWeight:700,fontSize:13,color:C.text}}>{r.name}</div><div style={{fontSize:11,color:C.muted}}>{r.time} · 🔥{r.calories}cal · P:{r.protein}g C:{r.carbs}g F:{r.fat}g</div></div>
                </div>))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {importOpen&&(
        <div style={modal} onClick={resetImport}>
          <div style={{...modalBox,maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontWeight:900,fontSize:18,color:C.text}}>{importMode==="menu"?"➕ Add a Recipe":importMode==="url"?"🔗 Import by URL":importMode==="text"?"📋 Paste Recipe Text":importMode==="describe"?"🎤 Describe a Dish":importMode==="photo"?"📸 Photo of Recipe":"📝 Manual Entry"}</div>
              <button style={ghostBtn} onClick={resetImport}>✕</button>
            </div>
            {importMode!=="menu"&&!importResult&&<button style={{...ghostBtn,fontSize:12,padding:"6px 12px",marginBottom:14}} onClick={()=>{setImportMode("menu");setImportError("");}}>← Back</button>}

            {importMode==="menu"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[{mode:"url",emoji:"🔗",title:"Import by URL",desc:"Paste any recipe link"},{mode:"text",emoji:"📋",title:"Paste Text",desc:"Copy text from anywhere"},{mode:"describe",emoji:"🎤",title:"Describe a Dish",desc:"Tell AI what you want"},{mode:"photo",emoji:"📸",title:"Photo of Recipe",desc:"Snap a cookbook or card"},{mode:"manual",emoji:"📝",title:"Manual Entry",desc:"Type it in yourself"}].map(opt=>(
                  <div key={opt.mode} style={{background:"#FFFAF5",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"16px 14px",cursor:"pointer",transition:"all 0.15s"}} onClick={()=>setImportMode(opt.mode)} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background="#FFF8F0";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="#FFFAF5";}}>
                    <div style={{fontSize:28,marginBottom:6}}>{opt.emoji}</div>
                    <div style={{fontWeight:800,fontSize:14,marginBottom:3,color:C.text}}>{opt.title}</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.4}}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {importMode==="url"&&!importResult&&(<><div style={{color:C.muted,fontSize:13,marginBottom:12}}>Paste any recipe page URL.</div><input style={inputStyle} placeholder="https://www.allrecipes.com/recipe/..." value={importUrl} onChange={e=>setImportUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importByUrl()}/>{importError&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{importError}</div>}<button style={{...btnStyle(),width:"100%",padding:"12px 0",opacity:importLoading?0.6:1}} onClick={importByUrl} disabled={importLoading}>{importLoading?"🔄 Reading URL...":"✨ Import Recipe"}</button></>)}
            {importMode==="text"&&!importResult&&(<><div style={{color:C.muted,fontSize:13,marginBottom:12}}>Paste any recipe text.</div><textarea style={{...inputStyle,height:180,resize:"vertical",fontFamily:"inherit"}} placeholder="Paste recipe text here..." value={importText} onChange={e=>setImportText(e.target.value)}/>{importError&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{importError}</div>}<button style={{...btnStyle(),width:"100%",padding:"12px 0",opacity:importLoading?0.6:1}} onClick={importByText} disabled={importLoading}>{importLoading?"🔄 Parsing...":"✨ Format & Import"}</button></>)}
            {importMode==="describe"&&!importResult&&(<><div style={{color:C.muted,fontSize:13,marginBottom:12}}>Describe a dish and AI builds the full recipe.</div><textarea style={{...inputStyle,height:120,resize:"vertical",fontFamily:"inherit"}} placeholder="e.g. My grandma's spicy chicken tortilla soup..." value={importDescribe} onChange={e=>setImportDescribe(e.target.value)}/>{importError&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{importError}</div>}<button style={{...btnStyle(),width:"100%",padding:"12px 0",opacity:importLoading?0.6:1}} onClick={importByDescribe} disabled={importLoading}>{importLoading?"🔄 Creating...":"✨ Generate Recipe"}</button></>)}
            {importMode==="photo"&&!importResult&&(<><div style={{color:C.muted,fontSize:13,marginBottom:12}}>Take a photo of any recipe and AI reads it.</div><div style={{border:`2px dashed ${importPhoto?C.green:C.border}`,borderRadius:12,padding:"24px 16px",textAlign:"center",marginBottom:12,cursor:"pointer",background:importPhoto?`${C.green}11`:"#FFFAF5"}} onClick={()=>document.getElementById("photoInput").click()}>{importPhoto?(<><div style={{fontSize:32,marginBottom:6}}>✅</div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{importPhoto.name}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>Tap to change</div></>):(<><div style={{fontSize:40,marginBottom:8}}>📸</div><div style={{fontWeight:700,fontSize:15,color:C.text}}>Tap to choose photo</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>JPG, PNG, HEIC · Cookbook photos work great!</div></>)}</div><input id="photoInput" type="file" accept="image/*" style={{display:"none"}} onChange={e=>setImportPhoto(e.target.files[0])}/>{importError&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{importError}</div>}<button style={{...btnStyle(),width:"100%",padding:"12px 0",opacity:(importLoading||!importPhoto)?0.6:1}} onClick={importByPhoto} disabled={importLoading||!importPhoto}>{importLoading?"🔄 Reading photo...":"✨ Extract Recipe"}</button></>)}

            {importMode==="manual"&&!importResult&&(
              <div style={{maxHeight:"65vh",overflowY:"auto",paddingRight:4}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div style={{gridColumn:"1/-1"}}><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Recipe Name *</div><input style={{...inputStyle,marginBottom:0}} placeholder="e.g. Mom's Lasagna" value={manualRecipe.name} onChange={e=>setManualRecipe(p=>({...p,name:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Cook Time</div><input style={{...inputStyle,marginBottom:0}} placeholder="e.g. 45 min" value={manualRecipe.time} onChange={e=>setManualRecipe(p=>({...p,time:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Servings</div><input style={{...inputStyle,marginBottom:0}} type="number" min="1" placeholder="4" value={manualRecipe.baseServings} onChange={e=>setManualRecipe(p=>({...p,baseServings:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Calories</div><input style={{...inputStyle,marginBottom:0}} type="number" placeholder="350" value={manualRecipe.calories} onChange={e=>setManualRecipe(p=>({...p,calories:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Protein (g)</div><input style={{...inputStyle,marginBottom:0}} type="number" placeholder="25" value={manualRecipe.protein} onChange={e=>setManualRecipe(p=>({...p,protein:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Carbs (g)</div><input style={{...inputStyle,marginBottom:0}} type="number" placeholder="30" value={manualRecipe.carbs} onChange={e=>setManualRecipe(p=>({...p,carbs:e.target.value}))}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Fat (g)</div><input style={{...inputStyle,marginBottom:0}} type="number" placeholder="12" value={manualRecipe.fat} onChange={e=>setManualRecipe(p=>({...p,fat:e.target.value}))}/></div>
                  <div style={{gridColumn:"1/-1"}}><div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Categories * (select all that apply)</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"].map(cat=>{const on=(manualRecipe.categories||[]).includes(cat);return(<button key={cat} type="button" style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${on?C.accent:C.border}`,background:on?`${C.accent}22`:"transparent",color:on?C.accent:C.muted,fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setManualRecipe(p=>({...p,categories:on?(p.categories||[]).filter(x=>x!==cat):[...(p.categories||[]),cat]}))}>{ on?"✓ ":""}{CAT_EMOJI[cat]} {cat}</button>);})}</div></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Family Collection</div><select style={{...inputStyle,marginBottom:0}} value={manualRecipe.collection} onChange={e=>setManualRecipe(p=>({...p,collection:e.target.value}))}>{FAMILY_COLLECTIONS.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div style={{gridColumn:"1/-1"}}><div style={{fontSize:12,color:C.muted,marginBottom:4,fontWeight:600}}>Description</div><input style={{...inputStyle,marginBottom:0}} placeholder="Short description" value={manualRecipe.desc} onChange={e=>setManualRecipe(p=>({...p,desc:e.target.value}))}/></div>
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Diet Tags</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{["Keto","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Paleo"].map(t=>{const on=manualRecipe.tags.includes(t);return <button key={t} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${on?C.green:C.border}`,background:on?"#D4EDDA":"transparent",color:on?C.green:C.muted,fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setManualRecipe(p=>({...p,tags:on?p.tags.filter(x=>x!==t):[...p.tags,t]}))}>{on?"✓ ":""}{t}</button>;})}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Ingredients *</div>
                {manualRecipe.ingredients.map((ing,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 24px",gap:6,marginBottom:6}}><input style={{...inputStyle,marginBottom:0}} placeholder="Ingredient" value={ing.item} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,item:e.target.value}:x)}))}/><input style={{...inputStyle,marginBottom:0}} placeholder="Qty" value={ing.qty} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,qty:e.target.value}:x)}))}/><input style={{...inputStyle,marginBottom:0}} placeholder="Unit" value={ing.unit} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,unit:e.target.value}:x)}))}/><button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}} onClick={()=>setManualRecipe(p=>({...p,ingredients:p.ingredients.filter((_,j)=>j!==i)}))}>×</button></div>))}
                <button style={{...ghostBtn,fontSize:12,padding:"6px 14px",marginBottom:14}} onClick={()=>setManualRecipe(p=>({...p,ingredients:[...p.ingredients,{item:"",qty:"",unit:""}]}))}>+ Add Ingredient</button>
                <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Steps *</div>
                {manualRecipe.steps.map((step,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}><div style={{width:24,height:24,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0,marginTop:8}}>{i+1}</div><textarea style={{...inputStyle,marginBottom:0,flex:1,height:60,resize:"vertical",fontFamily:"inherit"}} placeholder={`Step ${i+1}`} value={step} onChange={e=>setManualRecipe(p=>({...p,steps:p.steps.map((x,j)=>j===i?e.target.value:x)}))}/><button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,marginTop:8}} onClick={()=>setManualRecipe(p=>({...p,steps:p.steps.filter((_,j)=>j!==i)}))}>×</button></div>))}
                <button style={{...ghostBtn,fontSize:12,padding:"6px 14px",marginBottom:14}} onClick={()=>setManualRecipe(p=>({...p,steps:[...p.steps,""]}))}>+ Add Step</button>
                {importError&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{importError}</div>}
                <button style={{...btnStyle(C.green),width:"100%",padding:"12px 0"}} onClick={confirmManual}>💾 Save Recipe</button>
              </div>
            )}

            {importLoading&&importMode!=="manual"&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{fontSize:44,marginBottom:10}}>👨‍🍳</div><div style={{fontWeight:800,color:C.text}}>AI is working on it...</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>This takes about 5-10 seconds</div></div>}

            {importResult&&(
              <div style={{background:"#F0FDF4",borderRadius:12,padding:16,border:`1.5px solid ${C.green}66`}}>
                <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:36}}>{importResult.emoji}</span>
                  <div><div style={{fontWeight:800,fontSize:16,color:C.text}}>{importResult.name}</div><div style={{fontSize:12,color:C.muted}}>{importResult.time} · {importResult.calories} cal · {importResult.baseServings} servings</div></div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{(importResult.tags||[]).map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}</div>
                <div style={{fontSize:12,color:C.green,marginBottom:14}}>✓ {importResult.ingredients?.length} ingredients · {importResult.steps?.length} steps ready!</div>
                <div style={{display:"flex",gap:8}}><button style={{...ghostBtn,flex:1}} onClick={()=>setImportResult(null)}>← Try again</button><button style={{...btnStyle(C.green),flex:2,padding:"10px 0"}} onClick={confirmImport}>Add to Recipe Library →</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
