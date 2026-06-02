import { useState, useMemo, useEffect } from "react";

// ─── PHOTO CACHE ─────────────────────────────────────────────────────────────
const photoCache = {};

const fetchPhoto = async (recipeName) => {
  if (photoCache[recipeName]) return photoCache[recipeName];
  try {
    const res = await fetch("/.netlify/functions/unsplash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: recipeName }),
    });
    const data = await res.json();
    if (data.url) {
      photoCache[recipeName] = data;
      return data;
    }
  } catch {}
  return null;
};

const STORAGE_KEYS = { recipes:"mf_recipes2", mealPlan:"mf_mealplan2", users:"mf_users2", currentUser:"mf_currentuser2", checkedItems:"mf_checked2" };
const load = (key, fallback) => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; } };
const save = (key, val) => { try { localStorage.setItem(key,JSON.stringify(val)); } catch {} };

const CATEGORIES = ["All","Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"];
const DIETS = ["All","Keto","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Paleo"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_SLOTS = ["Breakfast","Lunch","Dinner"];

const tagColors = {
  Keto:{bg:"#D4EDDA",text:"#155724"}, Vegetarian:{bg:"#C8F4C8",text:"#1A5E1A"},
  Vegan:{bg:"#B8EEC0",text:"#0F4C22"}, "Gluten-Free":{bg:"#FFF3CD",text:"#7A5800"},
  "Dairy-Free":{bg:"#EDE9FE",text:"#5B21B6"}, Paleo:{bg:"#FFE5D0",text:"#8B2500"},
};

const categoryEmojis = {
  Breakfast:"🌅", Lunch:"☀️", Dinner:"🌙", Grilling:"🔥",
  "Kids Drinks":"🧃", "Adult Drinks":"🍹", Snacks:"🍿", Desserts:"🍰", All:"🍽️"
};

const SEED_RECIPES = [
  { id:"r1", name:"Grilled Lemon Herb Chicken", time:"30 min", baseServings:4, calories:320, protein:38, carbs:2, fat:16, tags:["Keto","Gluten-Free","Dairy-Free","Paleo"], category:"Grilling", emoji:"🍗", desc:"Juicy, herby chicken that's weeknight-perfect and packed with protein.", ingredients:[{item:"Chicken breasts",qty:4,unit:"pieces"},{item:"Lemon juice",qty:3,unit:"tbsp"},{item:"Olive oil",qty:2,unit:"tbsp"},{item:"Garlic",qty:4,unit:"cloves"},{item:"Fresh rosemary",qty:2,unit:"sprigs"},{item:"Salt & pepper",qty:1,unit:"pinch"}], steps:["Marinate chicken in lemon, oil, garlic 20 min.","Grill 6–7 min per side.","Rest 5 min before slicing."], source:"built-in" },
  { id:"r2", name:"Avocado Black Bean Bowls", time:"15 min", baseServings:2, calories:480, protein:18, carbs:62, fat:22, tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"], category:"Lunch", emoji:"🥑", desc:"A colorful, filling bowl loaded with plant-based protein and healthy fats.", ingredients:[{item:"Black beans",qty:1,unit:"can"},{item:"Avocado",qty:2,unit:"whole"},{item:"Brown rice",qty:1,unit:"cup"},{item:"Lime juice",qty:2,unit:"tbsp"},{item:"Cilantro",qty:0.25,unit:"cup"},{item:"Cherry tomatoes",qty:1,unit:"cup"}], steps:["Cook rice per package.","Warm beans with cumin.","Slice avocado.","Assemble bowl, squeeze lime on top."], source:"built-in" },
  { id:"r3", name:"Keto Bacon Egg Cups", time:"20 min", baseServings:6, calories:210, protein:14, carbs:1, fat:17, tags:["Keto","Gluten-Free"], category:"Breakfast", emoji:"🥚", desc:"Crispy bacon cups filled with runny eggs — the perfect low-carb breakfast.", ingredients:[{item:"Eggs",qty:6,unit:"large"},{item:"Bacon strips",qty:6,unit:"slices"},{item:"Cheddar cheese",qty:0.5,unit:"cup"},{item:"Chives",qty:2,unit:"tbsp"}], steps:["Preheat oven 375°F.","Line muffin tin with bacon.","Crack egg into each.","Top with cheese, bake 15 min."], source:"built-in" },
  { id:"r4", name:"Backyard BBQ Ribs", time:"3 hrs", baseServings:4, calories:680, protein:52, carbs:18, fat:44, tags:["Gluten-Free","Dairy-Free","Paleo"], category:"Grilling", emoji:"🍖", desc:"Slow-smoked fall-off-the-bone ribs with a sticky sweet BBQ glaze.", ingredients:[{item:"Baby back ribs",qty:2,unit:"racks"},{item:"BBQ sauce",qty:1,unit:"cup"},{item:"Brown sugar",qty:2,unit:"tbsp"},{item:"Smoked paprika",qty:1,unit:"tbsp"},{item:"Garlic powder",qty:1,unit:"tsp"},{item:"Salt & pepper",qty:1,unit:"pinch"}], steps:["Rub ribs with spices and sugar.","Wrap in foil, bake 2.5 hrs at 300°F.","Unwrap, coat with BBQ sauce.","Grill 10 min per side until caramelized."], source:"built-in" },
  { id:"r5", name:"Strawberry Banana Smoothie", time:"5 min", baseServings:2, calories:180, protein:4, carbs:42, fat:1, tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"], category:"Kids Drinks", emoji:"🍓", desc:"Sweet, creamy and totally kid-approved — no added sugar needed!", ingredients:[{item:"Frozen strawberries",qty:1,unit:"cup"},{item:"Banana",qty:1,unit:"whole"},{item:"Almond milk",qty:1,unit:"cup"},{item:"Honey",qty:1,unit:"tbsp"},{item:"Vanilla extract",qty:0.5,unit:"tsp"}], steps:["Add all ingredients to blender.","Blend until smooth.","Pour into glasses and serve immediately."], source:"built-in" },
  { id:"r6", name:"Classic Margarita", time:"5 min", baseServings:1, calories:220, protein:0, carbs:14, fat:0, tags:["Vegan","Gluten-Free","Dairy-Free"], category:"Adult Drinks", emoji:"🍹", desc:"Perfectly balanced tart and sweet — the ultimate summer cocktail.", ingredients:[{item:"Tequila",qty:2,unit:"oz"},{item:"Fresh lime juice",qty:1,unit:"oz"},{item:"Triple sec",qty:0.5,unit:"oz"},{item:"Salt",qty:1,unit:"pinch"},{item:"Lime wedge",qty:1,unit:"whole"},{item:"Ice",qty:1,unit:"cup"}], steps:["Salt the rim of a glass.","Combine tequila, lime juice, triple sec in shaker with ice.","Shake vigorously 15 seconds.","Strain into glass over ice, garnish with lime."], source:"built-in" },
  { id:"r7", name:"Garlic Butter Salmon", time:"20 min", baseServings:2, calories:410, protein:42, carbs:2, fat:26, tags:["Keto","Gluten-Free","Paleo"], category:"Dinner", emoji:"🐟", desc:"Restaurant-quality salmon in 20 minutes flat.", ingredients:[{item:"Salmon fillets",qty:2,unit:"pieces"},{item:"Butter",qty:3,unit:"tbsp"},{item:"Garlic",qty:4,unit:"cloves"},{item:"Lemon",qty:1,unit:"whole"},{item:"Fresh dill",qty:2,unit:"tbsp"}], steps:["Season salmon with salt & pepper.","Sear skin-down 4 min.","Flip, add butter and garlic.","Baste 3 min, finish with lemon."], source:"built-in" },
  { id:"r8", name:"Watermelon Mint Lemonade", time:"10 min", baseServings:4, calories:90, protein:1, carbs:22, fat:0, tags:["Vegan","Gluten-Free","Dairy-Free"], category:"Kids Drinks", emoji:"🍉", desc:"Refreshing summer sipper that kids go absolutely crazy for.", ingredients:[{item:"Watermelon",qty:4,unit:"cups"},{item:"Fresh lemon juice",qty:0.5,unit:"cup"},{item:"Mint leaves",qty:10,unit:"whole"},{item:"Honey",qty:2,unit:"tbsp"},{item:"Water",qty:2,unit:"cups"},{item:"Ice",qty:1,unit:"cup"}], steps:["Blend watermelon until smooth, strain.","Mix with lemon juice, honey, water.","Add mint and stir well.","Serve over ice."], source:"built-in" },
  { id:"r9", name:"Smash Burgers", time:"15 min", baseServings:4, calories:580, protein:34, carbs:32, fat:36, tags:["Gluten-Free"], category:"Grilling", emoji:"🍔", desc:"Ultra-crispy edges, juicy center — these beat any fast food burger.", ingredients:[{item:"80/20 ground beef",qty:1.5,unit:"lbs"},{item:"American cheese",qty:4,unit:"slices"},{item:"Brioche buns",qty:4,unit:"whole"},{item:"Butter",qty:2,unit:"tbsp"},{item:"Salt & pepper",qty:1,unit:"pinch"},{item:"Pickles & onion",qty:1,unit:"serving"}], steps:["Form beef into loose balls, don't pack tight.","Heat cast iron on grill until smoking hot.","Place ball on grill, smash flat with spatula.","Cook 2 min, flip, add cheese, cook 1 min.","Serve on toasted buttered buns."], source:"built-in" },
  { id:"r10", name:"Tropical Rum Punch", time:"5 min", baseServings:1, calories:240, protein:0, carbs:28, fat:0, tags:["Vegan","Gluten-Free","Dairy-Free"], category:"Adult Drinks", emoji:"🌴", desc:"Taste the tropics — fruity, boozy, and perfect poolside.", ingredients:[{item:"White rum",qty:2,unit:"oz"},{item:"Pineapple juice",qty:2,unit:"oz"},{item:"Orange juice",qty:1,unit:"oz"},{item:"Grenadine",qty:0.5,unit:"oz"},{item:"Coconut cream",qty:1,unit:"tbsp"},{item:"Ice",qty:1,unit:"cup"}], steps:["Fill glass with ice.","Pour rum, pineapple juice, orange juice over ice.","Drizzle grenadine over top.","Stir gently and garnish with pineapple slice."], source:"built-in" },
];

export default function App() {
  const [recipes,      setRecipes]      = useState(() => load(STORAGE_KEYS.recipes, SEED_RECIPES));
  const [mealPlan,     setMealPlan]     = useState(() => load(STORAGE_KEYS.mealPlan, {}));
  const [users,        setUsers]        = useState(() => load(STORAGE_KEYS.users, []));
  const [currentUser,  setCurrentUser]  = useState(() => load(STORAGE_KEYS.currentUser, null));
  const [checkedItems, setCheckedItems] = useState(() => load(STORAGE_KEYS.checkedItems, {}));

  const [screen,         setScreen]         = useState("home");
  const [activeDiet,     setActiveDiet]     = useState("All");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search,         setSearch]         = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeServings, setRecipeServings] = useState(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(null);
  const [authMode,       setAuthMode]       = useState("login");
  const [authForm,       setAuthForm]       = useState({name:"",email:"",password:""});
  const [authError,      setAuthError]      = useState("");
  const [toast,          setToast]          = useState(null);

  // AI Search state
  const [aiQuery,       setAiQuery]       = useState("");
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiResults,     setAiResults]     = useState([]);
  const [aiError,       setAiError]       = useState("");
  const [aiSearched,    setAiSearched]    = useState(false);

  // Import state
  const [importOpen,    setImportOpen]    = useState(false);
  const [importMode,    setImportMode]    = useState("menu"); // menu | url | text | describe | manual | photo
  const [importUrl,     setImportUrl]     = useState("");
  const [importText,    setImportText]    = useState("");
  const [importDescribe,setImportDescribe]= useState("");
  const [importPhoto,   setImportPhoto]   = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult,  setImportResult]  = useState(null);
  const [importError,   setImportError]   = useState("");
  const [manualRecipe,  setManualRecipe]  = useState({ name:"", time:"", baseServings:4, calories:"", protein:"", carbs:"", fat:"", category:"Dinner", tags:[], desc:"", ingredients:[{item:"",qty:"",unit:""}], steps:[""] });

  useEffect(() => save(STORAGE_KEYS.recipes,     recipes),     [recipes]);
  useEffect(() => save(STORAGE_KEYS.mealPlan,    mealPlan),    [mealPlan]);
  useEffect(() => save(STORAGE_KEYS.users,       users),       [users]);
  useEffect(() => save(STORAGE_KEYS.currentUser, currentUser), [currentUser]);
  useEffect(() => save(STORAGE_KEYS.checkedItems,checkedItems),[checkedItems]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  // ── COLORS ──────────────────────────────────────────────────────────────────
  const C = { bg:"#FFF8F0", surface:"#FFF2E6", card:"#FFFFFF", border:"#F0D9C8", accent:"#FF6B35", accent2:"#E8392A", green:"#2E7D32", text:"#2C1810", muted:"#8B5E3C", red:"#C62828", gold:"#FFD166", peach:"#F4A261", navy:"#1A0E08" };

  // ── AUTH ────────────────────────────────────────────────────────────────────
  const handleAuth = () => {
    setAuthError("");
    if (authMode==="signup") {
      if (!authForm.name||!authForm.email||!authForm.password) return setAuthError("Please fill in all fields.");
      if (users.find(u=>u.email===authForm.email)) return setAuthError("That email is already registered.");
      const newUser = { id:Date.now().toString(), name:authForm.name, email:authForm.email, password:authForm.password, dietPrefs:[], joinedAt:new Date().toISOString() };
      setUsers(prev=>[...prev,newUser]); setCurrentUser(newUser);
      showToast(`Welcome to MealFlow, ${newUser.name}! 🎉`);
    } else {
      const user = users.find(u=>u.email===authForm.email&&u.password===authForm.password);
      if (!user) return setAuthError("Incorrect email or password.");
      setCurrentUser(user); showToast(`Welcome back, ${user.name}! 👋`);
    }
    setAuthForm({name:"",email:"",password:""}); setScreen("home");
  };
  const logout = () => { setCurrentUser(null); showToast("Logged out.","info"); };

  // ── FILTERED RECIPES ────────────────────────────────────────────────────────
  const filtered = useMemo(() => recipes.filter(r => {
    const dietMatch = activeDiet==="All"||r.tags.includes(activeDiet);
    const catMatch  = activeCategory==="All"||r.category===activeCategory;
    const srchMatch = r.name.toLowerCase().includes(search.toLowerCase())||r.desc.toLowerCase().includes(search.toLowerCase());
    return dietMatch&&catMatch&&srchMatch;
  }), [recipes, activeDiet, activeCategory, search]);

  // ── MEAL PLAN ───────────────────────────────────────────────────────────────
  const addToMealPlan = (day, slot, recipe) => { setMealPlan(prev=>({...prev,[`${day}-${slot}`]:recipe})); showToast(`${recipe.emoji} Added to ${day} ${slot}!`); };
  const removeFromPlan = (key) => setMealPlan(prev=>{const n={...prev};delete n[key];return n;});
  const plannedCount = Object.keys(mealPlan).length;

  const weeklyNutrition = useMemo(()=>{
    const vals=Object.values(mealPlan);
    return { calories:vals.reduce((s,r)=>s+(r.calories||0),0), protein:vals.reduce((s,r)=>s+(r.protein||0),0), carbs:vals.reduce((s,r)=>s+(r.carbs||0),0), fat:vals.reduce((s,r)=>s+(r.fat||0),0) };
  },[mealPlan]);

  // ── NUTRITION SCALING ───────────────────────────────────────────────────────
  const scaledNutrition = (recipe, servings) => {
    const ratio = servings/(recipe.baseServings||4);
    return { calories:Math.round((recipe.calories||0)*ratio), protein:Math.round((recipe.protein||0)*ratio), carbs:Math.round((recipe.carbs||0)*ratio), fat:Math.round((recipe.fat||0)*ratio) };
  };
  const scaledIngredients = (recipe, servings) => {
    const ratio = servings/(recipe.baseServings||4);
    return recipe.ingredients.map(ing=>({...ing, qty:typeof ing.qty==="number"?Math.round(ing.qty*ratio*4)/4:ing.qty}));
  };

  // ── GROCERY ─────────────────────────────────────────────────────────────────
  const groceryList = useMemo(()=>{
    const map={};
    Object.values(mealPlan).forEach(recipe=>{
      recipe.ingredients.forEach(ing=>{
        const key=ing.item.toLowerCase();
        if(!map[key]) map[key]={...ing,recipes:[recipe.name]};
        else map[key].recipes.push(recipe.name);
      });
    });
    return Object.values(map);
  },[mealPlan]);

  // ── PRINT FUNCTIONS ─────────────────────────────────────────────────────────
  const printMealPlan = () => {
    const rows = DAYS.map(day => {
      const cells = MEAL_SLOTS.map(slot => {
        const recipe = mealPlan[`${day}-${slot}`];
        return `<td style="border:1px solid #ddd;padding:10px;vertical-align:top;width:30%;">
          ${recipe ? `<div style="font-size:22px;margin-bottom:4px;">${recipe.emoji}</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${recipe.name}</div>
          <div style="font-size:11px;color:#666;">🔥 ${recipe.calories} cal &nbsp; P:${recipe.protein}g C:${recipe.carbs}g F:${recipe.fat}g</div>` : '<div style="color:#ccc;font-size:12px;">—</div>'}
        </td>`;
      }).join("");
      return `<tr>
        <td style="border:1px solid #ddd;padding:10px;font-weight:700;font-size:13px;background:#f9f9f9;white-space:nowrap;">${day}</td>
        ${cells}
      </tr>`;
    }).join("");

    const totalCal = Object.values(mealPlan).reduce((s,r)=>s+(r.calories||0),0);
    const totalP   = Object.values(mealPlan).reduce((s,r)=>s+(r.protein||0),0);
    const totalC   = Object.values(mealPlan).reduce((s,r)=>s+(r.carbs||0),0);
    const totalF   = Object.values(mealPlan).reduce((s,r)=>s+(r.fat||0),0);

    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Anderson Heirloom Recipes — Weekly Meal Plan</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
      h1 { color: #FF6B35; margin-bottom: 4px; }
      .subtitle { color: #888; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #FF6B35; color: white; padding: 10px; font-size: 13px; text-align: left; }
      .summary { background: #fff8f3; border: 2px solid #FF6B35; border-radius: 8px; padding: 14px 20px; display: flex; gap: 30px; margin-bottom: 16px; }
      .summary-item { text-align: center; }
      .summary-item .val { font-size: 22px; font-weight: 900; color: #FF6B35; }
      .summary-item .lbl { font-size: 11px; color: #888; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <h1>🏡 Anderson Heirloom Recipes — Weekly Meal Plan</h1>
    <div class="subtitle">Printed on ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
    <div class="summary">
      <div class="summary-item"><div class="val">${totalCal}</div><div class="lbl">Total Calories</div></div>
      <div class="summary-item"><div class="val">${totalP}g</div><div class="lbl">Total Protein</div></div>
      <div class="summary-item"><div class="val">${totalC}g</div><div class="lbl">Total Carbs</div></div>
      <div class="summary-item"><div class="val">${totalF}g</div><div class="lbl">Total Fat</div></div>
      <div class="summary-item"><div class="val">${Object.keys(mealPlan).length}</div><div class="lbl">Meals Planned</div></div>
    </div>
    <table>
      <thead><tr>
        <th style="width:12%;">Day</th>
        <th style="width:29%;">🌅 Breakfast</th>
        <th style="width:29%;">☀️ Lunch</th>
        <th style="width:29%;">🌙 Dinner</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:#aaa;text-align:center;margin-top:20px;">Anderson Heirloom Recipes — andersonheirloomrecipes.com</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    win.document.close();
  };

  const printGroceryList = () => {
    const byRecipe = {};
    Object.values(mealPlan).forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const key = ing.item.toLowerCase();
        if (!byRecipe[key]) byRecipe[key] = { ...ing, recipes: [recipe.name] };
        else byRecipe[key].recipes.push(recipe.name);
      });
    });
    const items = Object.values(byRecipe);

    const rows = items.map((ing, i) => `
      <tr style="background:${i%2===0?"#fff":"#fafafa"};">
        <td style="border:1px solid #eee;padding:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:18px;height:18px;border:2px solid #ccc;border-radius:4px;flex-shrink:0;"></div>
            <div>
              <div style="font-weight:700;font-size:14px;">${ing.item}</div>
              <div style="font-size:11px;color:#888;">Used in: ${ing.recipes.join(", ")}</div>
            </div>
          </div>
        </td>
        <td style="border:1px solid #eee;padding:10px;text-align:right;font-weight:700;color:#e8751a;white-space:nowrap;">
          ${typeof ing.qty==="number"?ing.qty:""} ${ing.unit}
        </td>
      </tr>`).join("");

    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Anderson Heirloom Recipes — Grocery List</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
      h1 { color: #FF6B35; margin-bottom: 4px; }
      .subtitle { color: #888; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      .tip { background:#FFF8F0; border-left:4px solid #FF6B35; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#555; border-radius:0 8px 8px 0; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <h1>🛒 Anderson Heirloom Recipes — Grocery List</h1>
    <div class="subtitle">Week of ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} &nbsp;·&nbsp; ${items.length} items &nbsp;·&nbsp; ${Object.keys(mealPlan).length} meals planned</div>
    <div class="tip">💡 Tip: Check off items as you shop. Items are sorted by recipe usage so you can group them efficiently.</div>
    <table>
      <thead><tr style="background:#e8751a;">
        <th style="padding:10px;color:white;text-align:left;font-size:13px;">Item</th>
        <th style="padding:10px;color:white;text-align:right;font-size:13px;">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:#aaa;text-align:center;margin-top:20px;">Anderson Heirloom Recipes — andersonheirloomrecipes.com</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    win.document.close();
  };

  // ── AI RECIPE SEARCH ────────────────────────────────────────────────────────
  const aiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true); setAiError(""); setAiResults([]); setAiSearched(true);
    try {
      const prompt = `You are a professional chef and recipe database. The user is searching for: "${aiQuery}"

Generate 4 different recipes that match this search. Include grilling recipes if relevant, kid-friendly drinks, adult cocktails, or whatever fits the search.

Return ONLY valid JSON array (no markdown, no backticks, no extra text):
[
  {
    "name": "Recipe Name",
    "time": "X min",
    "baseServings": 4,
    "calories": 350,
    "protein": 25,
    "carbs": 30,
    "fat": 12,
    "tags": ["Gluten-Free"],
    "category": "Dinner",
    "emoji": "🍽️",
    "desc": "Short appetizing description under 20 words.",
    "ingredients": [
      {"item": "ingredient name", "qty": 2, "unit": "cups"}
    ],
    "steps": ["Step 1 with detail.", "Step 2.", "Step 3.", "Step 4."]
  }
]

Rules:
- Tags only from: Keto, Vegetarian, Vegan, Gluten-Free, Dairy-Free, Paleo
- Category only from: Breakfast, Lunch, Dinner, Grilling, Kids Drinks, Adult Drinks, Snacks, Desserts
- Include at least 6 ingredients and 4 steps per recipe
- Make nutrition info realistic and accurate
- For drinks, use ml or oz units for liquids
- All 4 recipes must be different variations or related recipes`;

      const res = await fetch("/.netlify/functions/claude", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ prompt })
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text||"";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setAiResults(parsed.map(r=>({...r, id:"ai_"+Date.now()+"_"+Math.random(), source:"ai"})));
    } catch(e) {
      setAiError("Error: " + e.message + " — Check that ANTHROPIC_API_KEY is saved in Netlify Site Configuration > Environment Variables, then redeploy.");
    }
    setAiLoading(false);
  };

  const saveAiRecipe = (recipe) => {
    const toSave = {...recipe, id:"r"+Date.now()+"_"+Math.random(), source:"ai-saved"};
    setRecipes(prev=>[...prev, toSave]);
    showToast(`${recipe.emoji} "${recipe.name}" saved to your recipes!`);
  };

  // ── SHARED IMPORT HELPERS ───────────────────────────────────────────────────
  const RECIPE_JSON_SPEC = `Return ONLY valid JSON (no markdown, no backticks, no extra text):
{
  "name": "Recipe Name",
  "time": "X min",
  "baseServings": 4,
  "calories": 350,
  "protein": 25,
  "carbs": 30,
  "fat": 12,
  "tags": ["Gluten-Free"],
  "category": "Dinner",
  "emoji": "🍽️",
  "desc": "Short appetizing description under 20 words.",
  "ingredients": [{"item": "ingredient name", "qty": 2, "unit": "cups"}],
  "steps": ["Step 1 with detail.", "Step 2.", "Step 3.", "Step 4."]
}
Tags only from: Keto, Vegetarian, Vegan, Gluten-Free, Dairy-Free, Paleo
Category only from: Breakfast, Lunch, Dinner, Grilling, Kids Drinks, Adult Drinks, Snacks, Desserts
Include at least 6 ingredients and 4 steps. Make nutrition realistic.`;

  const callClaude = async (prompt) => {
    const res = await fetch("/.netlify/functions/claude", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message || data.error);
    const text = data.content?.find(b=>b.type==="text")?.text||"";
    if (!text) throw new Error("Empty response from AI");
    return text.replace(/```json|```/g,"").trim();
  };

  const confirmImport = () => {
    if (!importResult) return;
    setRecipes(prev=>[...prev, importResult]);
    showToast(`${importResult.emoji} "${importResult.name}" added!`);
    resetImport();
  };

  const resetImport = () => {
    setImportOpen(false); setImportMode("menu");
    setImportUrl(""); setImportText(""); setImportDescribe(""); setImportPhoto(null);
    setImportResult(null); setImportError("");
    setManualRecipe({ name:"", time:"", baseServings:4, calories:"", protein:"", carbs:"", fat:"", category:"Dinner", tags:[], desc:"", ingredients:[{item:"",qty:"",unit:""}], steps:[""] });
  };

  // ── URL IMPORT ───────────────────────────────────────────────────────────────
  const importByUrl = async () => {
    if (!importUrl.trim()) return;
    setImportLoading(true); setImportError(""); setImportResult(null);
    try {
      const prompt = `You are a recipe extraction assistant. The user wants to import a recipe from: ${importUrl}
Generate a detailed realistic recipe matching what that URL would contain.
${RECIPE_JSON_SPEC}`;
      const clean = await callClaude(prompt);
      setImportResult({...JSON.parse(clean), id:"r"+Date.now(), source:importUrl});
    } catch(e) { setImportError("Couldn't read that URL: " + e.message); }
    setImportLoading(false);
  };

  // ── TEXT PASTE IMPORT ────────────────────────────────────────────────────────
  const importByText = async () => {
    if (!importText.trim()) return;
    setImportLoading(true); setImportError(""); setImportResult(null);
    try {
      const prompt = `You are a recipe parser. The user has pasted the following recipe text. Extract and structure it into a proper recipe.
RECIPE TEXT:
${importText}

${RECIPE_JSON_SPEC}`;
      const clean = await callClaude(prompt);
      setImportResult({...JSON.parse(clean), id:"r"+Date.now(), source:"text-import"});
    } catch(e) { setImportError("Couldn't parse that text: " + e.message); }
    setImportLoading(false);
  };

  // ── DESCRIBE IMPORT ──────────────────────────────────────────────────────────
  const importByDescribe = async () => {
    if (!importDescribe.trim()) return;
    setImportLoading(true); setImportError(""); setImportResult(null);
    try {
      const prompt = `You are a professional chef and recipe writer. The user has described a dish they want a recipe for. Create a complete, detailed, and accurate recipe based on their description.
USER DESCRIPTION: "${importDescribe}"
${RECIPE_JSON_SPEC}`;
      const clean = await callClaude(prompt);
      setImportResult({...JSON.parse(clean), id:"r"+Date.now(), source:"ai-created"});
    } catch(e) { setImportError("Couldn't generate recipe: " + e.message); }
    setImportLoading(false);
  };

  // ── PHOTO IMPORT ─────────────────────────────────────────────────────────────
  const importByPhoto = async () => {
    if (!importPhoto) return;
    setImportLoading(true); setImportError(""); setImportResult(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(importPhoto);
      });
      const mediaType = importPhoto.type || "image/jpeg";
      const res = await fetch("/.netlify/functions/claude", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          prompt: `You are a recipe extraction assistant. The user has uploaded a photo of a recipe (from a cookbook, recipe card, handwritten note, or screen). Read the recipe from the image carefully and extract all the details.
${RECIPE_JSON_SPEC}`,
          image: { base64, mediaType }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message || data.error);
      const text = data.content?.find(b=>b.type==="text")?.text||"";
      const clean = text.replace(/```json|```/g,"").trim();
      setImportResult({...JSON.parse(clean), id:"r"+Date.now(), source:"photo-import"});
    } catch(e) { setImportError("Couldn't read that photo: " + e.message); }
    setImportLoading(false);
  };

  // ── MANUAL IMPORT ────────────────────────────────────────────────────────────
  const confirmManual = () => {
    const r = manualRecipe;
    if (!r.name.trim()) return setImportError("Please enter a recipe name.");
    if (r.ingredients.filter(i=>i.item.trim()).length === 0) return setImportError("Please add at least one ingredient.");
    if (r.steps.filter(s=>s.trim()).length === 0) return setImportError("Please add at least one step.");
    const emojis = {"Breakfast":"🌅","Lunch":"☀️","Dinner":"🍽️","Grilling":"🔥","Kids Drinks":"🧃","Adult Drinks":"🍹","Snacks":"🍿","Desserts":"🍰"};
    const finalRecipe = {
      ...r,
      id: "r"+Date.now(),
      emoji: emojis[r.category] || "🍽️",
      source: "manual",
      baseServings: Number(r.baseServings)||4,
      calories: Number(r.calories)||0,
      protein: Number(r.protein)||0,
      carbs: Number(r.carbs)||0,
      fat: Number(r.fat)||0,
      ingredients: r.ingredients.filter(i=>i.item.trim()).map(i=>({...i, qty:isNaN(Number(i.qty))?i.qty:Number(i.qty)})),
      steps: r.steps.filter(s=>s.trim()),
      tags: r.tags,
    };
    setRecipes(prev=>[...prev, finalRecipe]);
    showToast(`${finalRecipe.emoji} "${finalRecipe.name}" added!`);
    resetImport();
  };

  // ── STYLE HELPERS ────────────────────────────────────────────────────────────
  const currentServings = recipeServings ?? selectedRecipe?.baseServings ?? 4;
  const pill = (active, color=C.accent) => ({ padding:"5px 13px", borderRadius:20, border:`1px solid ${active?color:C.border}`, cursor:"pointer", fontWeight:600, fontSize:12, whiteSpace:"nowrap", background:active?`${color}22`:"transparent", color:active?color:C.muted, transition:"all 0.15s" });
  const btnStyle = (color=C.accent) => ({ background:`linear-gradient(135deg,${color},${color}bb)`, border:"none", color:"#fff", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:700, fontSize:13 });
  const ghostBtn = { background:"transparent", border:`1.5px solid ${C.border}`, color:C.text, borderRadius:10, padding:"9px 16px", cursor:"pointer", fontWeight:600, fontSize:13 };
  const inputStyle = { width:"100%", padding:"10px 14px", background:"#FFFAF5", border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:10 };
  const statCard = { background:"#FFFAF5", borderRadius:12, border:`1.5px solid ${C.border}`, padding:"14px 16px", textAlign:"center" };
  const modal = { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:200, overflowY:"auto", padding:16, display:"flex", alignItems:"flex-start", justifyContent:"center" };
  const modalBox = { background:C.card, borderRadius:18, width:"100%", maxWidth:500, margin:"20px 0", padding:24, border:`1.5px solid ${C.border}`, boxShadow:"0 20px 60px rgba(44,24,16,0.15)" };
  const tagStyle = (t) => ({ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:tagColors[t]?.bg||"#1e2030", color:tagColors[t]?.text||"#94a3b8" });

  const RecipeCard = ({r, onAdd, showSave=false}) => {
    const [photo, setPhoto] = useState(r.photo || null);
    const [photoLoading, setPhotoLoading] = useState(false);

    useEffect(() => {
      if (!photo && !photoLoading) {
        setPhotoLoading(true);
        fetchPhoto(r.name).then(p => {
          if (p) setPhoto(p);
          setPhotoLoading(false);
        });
      }
    }, [r.name]);

    return (
    <div style={{ background:C.card, borderRadius:14, border:`1.5px solid ${C.border}`, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 2px 8px rgba(44,24,16,0.06)" }}
      onClick={()=>{setSelectedRecipe(r);setRecipeServings(r.baseServings);}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 8px 24px rgba(255,107,53,0.18)";}} 
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
      <div style={{ position:"relative", width:"100%", height:160, overflow:"hidden", background:"#FFF2E6" }}>
        {photo ? (
          <>
            <img src={photo.thumb || photo.url} alt={r.name}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            <div style={{ position:"absolute", bottom:4, right:6, fontSize:9, color:"rgba(255,255,255,0.6)" }}>
              📷 {photo.credit}
            </div>
          </>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:52 }}>
            {photoLoading ? "⏳" : r.emoji}
          </div>
        )}
        <div style={{ position:"absolute", top:8, left:8, fontSize:22, background:"rgba(0,0,0,0.45)", borderRadius:8, padding:"2px 8px" }}>{r.emoji}</div>
      </div>
      <div style={{ padding:"0 14px 14px" }}>
        <div style={{ fontWeight:800, fontSize:15, marginBottom:3 }}>{r.name}</div>
        <div style={{ color:C.muted, fontSize:12, marginBottom:8, lineHeight:1.5 }}>{r.desc}</div>
        <div style={{ display:"flex", gap:10, fontSize:11, color:C.muted, marginBottom:8 }}>
          <span>⏱ {r.time}</span><span>👤 {r.baseServings}</span><span>🔥 {r.calories} cal</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
          {[{l:"Protein",v:r.protein||0,color:C.green,max:60},{l:"Carbs",v:r.carbs||0,color:C.accent2,max:80},{l:"Fat",v:r.fat||0,color:C.red,max:40}].map(m=>(
            <div key={m.l}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:2 }}>{m.l} {m.v}g</div>
              <div style={{ background:"#F0D9C8", borderRadius:3, height:4 }}>
                <div style={{ background:m.color, height:4, borderRadius:3, width:`${Math.min(100,(m.v/m.max)*100)}%` }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:showSave?10:0 }}>
          {r.tags.map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}
          <span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"#DBEAFE", color:"#1D4ED8" }}>{r.category}</span>
        </div>
        {showSave && (
          <div style={{ display:"flex", gap:6, marginTop:4 }} onClick={e=>e.stopPropagation()}>
            <button style={{ ...btnStyle(C.green), fontSize:11, padding:"6px 12px", flex:1 }} onClick={()=>saveAiRecipe(r)}>💾 Save Recipe</button>
            <button style={{ ...btnStyle(), fontSize:11, padding:"6px 12px", flex:1 }} onClick={()=>{saveAiRecipe(r);setPlanPickerOpen({recipe:r});}}>+ Meal Plan</button>
          </div>
        )}
      </div>
    </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif", paddingBottom:90 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {toast && <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:toast.type==="success"?C.green:toast.type==="info"?C.accent:C.red, color:"#fff", padding:"10px 20px", borderRadius:20, fontWeight:700, fontSize:13, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{ background:C.card, borderBottom:`2px solid ${C.accent}`, padding:"14px 18px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(255,107,53,0.12)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:15, fontWeight:900, background:`linear-gradient(90deg,${C.accent2},${C.accent})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-0.3px" }}>🍴 MealFlow</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {currentUser ? (<>
              <div style={{ background:C.accent, borderRadius:"50%", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff" }}>{currentUser.name[0].toUpperCase()}</div>
              <button onClick={logout} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>Sign out</button>
            </>) : (
              <button onClick={()=>{setScreen("profile");setAuthMode("login");}} style={{ ...btnStyle(), fontSize:12, padding:"7px 14px" }}>Sign In</button>
            )}
          </div>
        </div>
        <div style={{ display:"flex", gap:4, marginTop:12, overflowX:"auto", scrollbarWidth:"none" }}>
          {[["home","🍽️ Recipes"],["search","🤖 AI Search"],["planner","📅 Plan"],["grocery","🛒 Groceries"],["profile","👤 Profile"]].map(([id,label])=>(
            <button key={id} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, transition:"all 0.15s", background:screen===id?C.accent:"transparent", color:screen===id?"#fff":C.text, borderRadius:8, whiteSpace:"nowrap" }} onClick={()=>setScreen(id)}>
              {label}{id==="planner"&&plannedCount>0?<span style={{ marginLeft:5, background:"#ffffff33", borderRadius:10, padding:"1px 6px", fontSize:10 }}>{plannedCount}</span>:null}
            </button>
          ))}
        </div>
      </div>

      {/* ── MY RECIPES ── */}
      {screen==="home" && (
        <div>
          {/* HERO BANNER */}
          <div style={{ background:`linear-gradient(135deg,${C.accent2},${C.accent},${C.peach})`, padding:"24px 20px 20px", textAlign:"center" }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Welcome to</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:4, letterSpacing:"-0.5px" }}>Anderson Heirloom Recipes</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)" }}>Family recipes, passed down with love 🏡</div>
          </div>

          <div style={{ padding:"14px 16px 0" }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input style={{ ...inputStyle, flex:1, marginBottom:0 }} placeholder="🔍  Search your saved recipes..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <button style={btnStyle()} onClick={()=>setImportOpen(true)}>＋ Import</button>
            </div>
            {/* Diet filters */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
              {DIETS.map(d=><button key={d} style={pill(activeDiet===d)} onClick={()=>setActiveDiet(d)}>{d}</button>)}
            </div>
            {/* Category filters */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", marginTop:8, paddingBottom:4 }}>
              {CATEGORIES.map(c=><button key={c} style={pill(activeCategory===c, C.accent2)} onClick={()=>setActiveCategory(c)}>{categoryEmojis[c]} {c}</button>)}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:8 }}>{filtered.length} saved recipe{filtered.length!==1?"s":""}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14, padding:"16px" }}>
            {filtered.map(r=><RecipeCard key={r.id} r={r}/>)}
            {filtered.length===0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0", color:C.muted }}>
                <div style={{ fontSize:48 }}>🤷</div>
                <div style={{ fontWeight:700, marginTop:8 }}>No saved recipes match</div>
                <div style={{ fontSize:13, marginTop:4 }}>Try the <strong style={{color:C.accent}}>🤖 AI Search</strong> tab to find and add any recipe!</div>
                <button style={{ ...btnStyle(), marginTop:16 }} onClick={()=>setScreen("search")}>Go to AI Search →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI SEARCH ── */}
      {screen==="search" && (
        <div style={{ padding:16 }}>
          <div style={{ background:`linear-gradient(135deg,${C.accent2},${C.accent})`, borderRadius:14, padding:"18px 20px", marginBottom:16, textAlign:"center" }}>
            <div style={{ fontSize:24 }}>🤖</div>
            <div style={{ fontWeight:900, fontSize:18, color:"#fff", marginBottom:2 }}>AI Recipe Search</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.85)" }}>Search for any recipe imaginable — instant results</div>
          </div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
            Search for <em>anything</em> — grilled ribs, summer cocktails, kid smoothies, keto breakfast, you name it. AI generates real recipes instantly.
          </div>

          {/* Quick suggestion chips */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Try these →</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {["BBQ brisket","Grilled shrimp skewers","Kids lemonade","Frozen margarita","Keto dinner","Chocolate dessert","Quick breakfast","Vegetarian pasta","Summer cocktails","Healthy snacks for kids","Grilled veggies","Watermelon drinks"].map(s=>(
                <button key={s} style={{ padding:"6px 12px", borderRadius:20, background:"#FFFAF5", border:`1.5px solid ${C.border}`, color:C.text, fontSize:12, cursor:"pointer", fontWeight:600 }}
                  onClick={()=>{ setAiQuery(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            <input
              style={{ ...inputStyle, flex:1, marginBottom:0, fontSize:15 }}
              placeholder="e.g. 'grilled salmon' or 'summer kids drinks'..."
              value={aiQuery}
              onChange={e=>setAiQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&aiSearch()}
            />
            <button style={{ ...btnStyle(), padding:"10px 20px", opacity:aiLoading?0.6:1 }} onClick={aiSearch} disabled={aiLoading}>
              {aiLoading?"⏳":"Search"}
            </button>
          </div>

          {aiLoading && (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👨‍🍳</div>
              <div style={{ fontWeight:800, fontSize:18, color:C.text }}>Chef AI is cooking...</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:6 }}>Generating 4 recipes for "{aiQuery}"</div>
            </div>
          )}

          {aiError && <div style={{ color:C.red, background:`${C.red}11`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13 }}>{aiError}</div>}

          {aiResults.length>0 && (
            <>
              <div style={{ fontWeight:700, fontSize:14, color:C.muted, marginBottom:12 }}>
                ✨ {aiResults.length} recipes found for "{aiQuery}" — save any you like!
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
                {aiResults.map(r=><RecipeCard key={r.id} r={r} showSave={true}/>)}
              </div>
            </>
          )}

          {aiSearched && !aiLoading && aiResults.length===0 && !aiError && (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
              <div style={{ fontSize:40 }}>😕</div>
              <div style={{ fontWeight:700, marginTop:8 }}>No results — try rephrasing</div>
            </div>
          )}

          {!aiSearched && (
            <div style={{ background:`linear-gradient(135deg,#FFF2E6,#FFE5D0)`, borderRadius:16, padding:"32px 24px", textAlign:"center", border:`1.5px solid ${C.border}` }}>
              <div style={{ fontSize:56 }}>🍳</div>
              <div style={{ fontWeight:900, fontSize:20, marginTop:12, color:C.text }}>Unlimited Recipes On Demand</div>
              <div style={{ fontSize:13, marginTop:10, lineHeight:2, color:C.muted }}>
                🔥 Grilling &nbsp;·&nbsp; 🧃 Kids Drinks &nbsp;·&nbsp; 🍹 Cocktails &nbsp;·&nbsp; 🥗 Healthy<br/>
                🍰 Desserts &nbsp;·&nbsp; 🌅 Breakfast &nbsp;·&nbsp; 🍿 Snacks &nbsp;·&nbsp; and millions more
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PLANNER ── */}
      {screen==="planner" && (
        <div style={{ padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontWeight:900, fontSize:20 }}>📅 Weekly Meal Planner</div>
            {plannedCount>0 && (
              <button style={{ ...btnStyle(C.green), fontSize:12, padding:"8px 14px", display:"flex", alignItems:"center", gap:6 }} onClick={printMealPlan}>
                🖨️ Print Plan
              </button>
            )}
          </div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:14 }}>Tap any empty slot to add a recipe.</div>
          {plannedCount>0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
              {[{l:"Calories",v:weeklyNutrition.calories,u:"",c:C.accent},{l:"Protein",v:weeklyNutrition.protein,u:"g",c:C.green},{l:"Carbs",v:weeklyNutrition.carbs,u:"g",c:C.accent2},{l:"Fat",v:weeklyNutrition.fat,u:"g",c:C.red}].map(n=>(
                <div key={n.l} style={{ ...statCard, background:"#FFF8F0" }}>
                  <div style={{ fontSize:16, fontWeight:900, color:n.c }}>{n.v}{n.u}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{n.l}/week</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ overflowX:"auto" }}>
            <div style={{ minWidth:520 }}>
              <div style={{ display:"grid", gridTemplateColumns:"84px repeat(3,1fr)", gap:2, marginBottom:2 }}>
                <div/>
                {MEAL_SLOTS.map(sl=><div key={sl} style={{ fontSize:11, fontWeight:700, color:C.muted, textAlign:"center", padding:"6px 0" }}>{sl}</div>)}
              </div>
              {DAYS.map(day=>(
                <div key={day} style={{ display:"grid", gridTemplateColumns:"84px repeat(3,1fr)", gap:2, marginBottom:2 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, display:"flex", alignItems:"center", paddingLeft:4 }}>{day.slice(0,3)}</div>
                  {MEAL_SLOTS.map(slot=>{
                    const key=`${day}-${slot}`; const recipe=mealPlan[key];
                    return (
                      <div key={slot} style={{ background:recipe?"#FFF0EB":"#FFFAF5", border:`1.5px solid ${recipe?C.accent:C.border}`, borderRadius:8, padding:8, minHeight:54, cursor:"pointer" }}
                        onClick={()=>!recipe&&setPlanPickerOpen({day,slot})}>
                        {recipe?(<div>
                          <div style={{ fontSize:18 }}>{recipe.emoji}</div>
                          <div style={{ fontSize:10, fontWeight:700, lineHeight:1.2, marginBottom:3 }}>{recipe.name.length>22?recipe.name.slice(0,22)+"…":recipe.name}</div>
                          <div style={{ fontSize:9, color:C.muted }}>🔥{recipe.calories}cal</div>
                          <button onClick={e=>{e.stopPropagation();removeFromPlan(key);}} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:9,padding:0,marginTop:2 }}>✕ remove</button>
                        </div>):(<div style={{ color:C.peach, textAlign:"center", lineHeight:"38px", fontSize:20, fontWeight:700 }}>+</div>)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {plannedCount===0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
              <div style={{ fontSize:48 }}>📋</div>
              <div style={{ fontWeight:700, marginTop:8 }}>Your meal plan is empty</div>
              <div style={{ fontSize:13, marginTop:4 }}>Tap any cell to add a recipe, or find new ones in AI Search!</div>
            </div>
          )}
        </div>
      )}

      {/* ── GROCERY ── */}
      {screen==="grocery" && (
        <div style={{ padding:16 }}>
          <div style={{ fontWeight:900, fontSize:20, marginBottom:4, color:C.text }}>🛒 Grocery List</div>
          {groceryList.length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <div style={{ fontSize:48 }}>🛒</div>
              <div style={{ fontWeight:700, marginTop:8 }}>Your list is empty</div>
              <div style={{ fontSize:13, marginTop:4 }}>Add recipes to your Meal Plan — the grocery list builds itself!</div>
              <button style={{ ...btnStyle(), marginTop:16 }} onClick={()=>setScreen("planner")}>Go to Planner →</button>
            </div>
          ):(
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:13, color:C.muted }}>{groceryList.length} items · {groceryList.filter(i=>checkedItems[i.item]).length} checked off</div>
                <button style={{ ...btnStyle(C.green), fontSize:12, padding:"8px 14px", display:"flex", alignItems:"center", gap:6 }} onClick={printGroceryList}>
                  🖨️ Print List
                </button>
              </div>
              <div style={{ background:"#FFFAF5", borderRadius:14, border:`1.5px solid ${C.border}`, padding:"0 16px" }}>
                {groceryList.map((ing,i)=>{
                  const checked=checkedItems[ing.item];
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<groceryList.length-1?`1px solid ${C.border}`:"none", opacity:checked?0.45:1, cursor:"pointer" }}
                      onClick={()=>setCheckedItems(p=>({...p,[ing.item]:!p[ing.item]}))}>
                      <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${checked?C.green:C.peach}`, background:checked?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {checked&&<span style={{ color:"#fff", fontSize:11 }}>✓</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, textDecoration:checked?"line-through":"none" }}>{ing.item}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit} · {ing.recipes.length} meal{ing.recipes.length>1?"s":""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button style={ghostBtn} onClick={()=>setCheckedItems({})}>Clear checks</button>
                <button style={btnStyle()} onClick={()=>{const t=groceryList.map(i=>`• ${i.item}: ${typeof i.qty==="number"?i.qty:""} ${i.unit}`).join("\n");navigator.clipboard?.writeText(t).then(()=>showToast("Copied to clipboard! 📋"));}}>📋 Copy List</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PROFILE ── */}
      {screen==="profile" && (
        <div style={{ padding:16, maxWidth:420, margin:"0 auto" }}>
          {currentUser ? (
            <>
              <div style={{ textAlign:"center", padding:"24px 0 20px" }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent2},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:900, color:"#fff", margin:"0 auto 12px" }}>{currentUser.name[0].toUpperCase()}</div>
                <div style={{ fontWeight:900, fontSize:22 }}>{currentUser.name}</div>
                <div style={{ color:C.muted, fontSize:14 }}>{currentUser.email}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Member since {new Date(currentUser.joinedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20, marginTop:4 }}>
                <div style={{ ...statCard, background:"#FFF8F0" }}><div style={{ fontSize:24, fontWeight:900, color:C.accent }}>{recipes.filter(r=>r.source!=="built-in").length}</div><div style={{ fontSize:12, color:C.muted }}>Saved Recipes</div></div>
                <div style={{ ...statCard, background:"#FFF8F0" }}><div style={{ fontSize:24, fontWeight:900, color:C.green }}>{plannedCount}</div><div style={{ fontSize:12, color:C.muted }}>Meals Planned</div></div>
              </div>
              <div style={{ fontWeight:700, marginBottom:10 }}>My Diet Preferences</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
                {DIETS.filter(d=>d!=="All").map(d=>{
                  const active=currentUser.dietPrefs?.includes(d);
                  return <button key={d} style={{ ...pill(active,C.green) }} onClick={()=>{
                    const prefs=currentUser.dietPrefs||[];
                    const updated=active?prefs.filter(p=>p!==d):[...prefs,d];
                    const updatedUser={...currentUser,dietPrefs:updated};
                    setCurrentUser(updatedUser); setUsers(prev=>prev.map(u=>u.id===currentUser.id?updatedUser:u));
                  }}>{active?"✓ ":""}{d}</button>;
                })}
              </div>
              <button style={{ ...ghostBtn, width:"100%" }} onClick={logout}>Sign Out</button>
            </>
          ):(
            <div style={{ paddingTop:30, maxWidth:380, margin:"0 auto" }}>
              <div style={{ fontWeight:900, fontSize:22, marginBottom:4, textAlign:"center" }}>{authMode==="login"?"Welcome back 👋":"Create your account ✨"}</div>
              <div style={{ color:C.muted, fontSize:13, textAlign:"center", marginBottom:24 }}>{authMode==="login"?"Sign in to save your recipes and meal plans":"Free forever — your data stays on your device"}</div>
              {authMode==="signup"&&<input style={inputStyle} placeholder="Your name" value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))}/>}
              <input style={inputStyle} placeholder="Email address" type="email" value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))}/>
              <input style={inputStyle} placeholder="Password" type="password" value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
              {authError&&<div style={{ color:C.red, fontSize:13, marginBottom:10 }}>{authError}</div>}
              <button style={{ ...btnStyle(), width:"100%", padding:"12px 0", marginBottom:12 }} onClick={handleAuth}>{authMode==="login"?"Sign In":"Create Account"}</button>
              <div style={{ textAlign:"center", fontSize:13, color:C.muted }}>
                {authMode==="login"?"Don't have an account? ":"Already have an account? "}
                <span style={{ color:C.accent, cursor:"pointer", fontWeight:700 }} onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>
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
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghostBtn} onClick={()=>setSelectedRecipe(null)}>← Back</button>
            {selectedRecipe && (() => {
              const cached = photoCache[selectedRecipe.name];
              return cached ? (
                <div style={{ position:"relative", borderRadius:12, overflow:"hidden", marginBottom:12, height:200 }}>
                  <img src={cached.url} alt={selectedRecipe.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  <div style={{ position:"absolute", bottom:4, right:8, fontSize:10, color:"rgba(255,255,255,0.6)" }}>📷 {cached.credit}</div>
                  <div style={{ position:"absolute", top:8, left:8, fontSize:28, background:"rgba(0,0,0,0.45)", borderRadius:8, padding:"2px 8px" }}>{selectedRecipe.emoji}</div>
                </div>
              ) : (
                <div style={{ textAlign:"center", fontSize:56, margin:"12px 0 6px" }}>{selectedRecipe.emoji}</div>
              );
            })()}
            <div style={{ fontWeight:900, fontSize:22, marginBottom:4 }}>{selectedRecipe.name}</div>
            <div style={{ color:C.muted, fontSize:13, marginBottom:10, lineHeight:1.5 }}>{selectedRecipe.desc}</div>
            <div style={{ display:"flex", gap:14, fontSize:12, color:C.muted, marginBottom:10 }}>
              <span>⏱ {selectedRecipe.time}</span><span>🔥 {scaledNutrition(selectedRecipe,currentServings).calories} cal</span>
              <span style={{ ...tagStyle(""), background:"#DBEAFE", color:"#1D4ED8" }}>{selectedRecipe.category}</span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:16 }}>
              {selectedRecipe.tags.map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}
            </div>
            {/* Serving adjuster */}
            <div style={{ background:C.surface, borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontWeight:700, fontSize:14 }}>Servings</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={()=>setRecipeServings(Math.max(1,currentServings-1))} style={{ width:28,height:28,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                <span style={{ fontWeight:900, fontSize:20, minWidth:24, textAlign:"center" }}>{currentServings}</span>
                <button onClick={()=>setRecipeServings(currentServings+1)} style={{ width:28,height:28,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
              </div>
            </div>
            {/* Nutrition */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
              {(()=>{const n=scaledNutrition(selectedRecipe,currentServings);return[{l:"Calories",v:n.calories,c:C.accent},{l:"Protein",v:n.protein+"g",c:C.green},{l:"Carbs",v:n.carbs+"g",c:C.accent2},{l:"Fat",v:n.fat+"g",c:C.red}].map(m=>(
                <div key={m.l} style={{ ...statCard, padding:"10px 8px" }}>
                  <div style={{ fontSize:15, fontWeight:900, color:m.c }}>{m.v}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{m.l}</div>
                </div>
              ))})()}
            </div>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>Ingredients</div>
            {scaledIngredients(selectedRecipe,currentServings).map((ing,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                <span>{ing.item}</span>
                <span style={{ color:C.accent, fontWeight:700 }}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit}</span>
              </div>
            ))}
            <div style={{ fontWeight:800, fontSize:15, margin:"16px 0 8px" }}>Steps</div>
            {selectedRecipe.steps.map((step,i)=>(
              <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                <div style={{ width:24,height:24,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:13, lineHeight:1.6, paddingTop:3 }}>{step}</div>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button style={{ ...btnStyle(), flex:1, padding:"12px 0" }} onClick={()=>{setPlanPickerOpen({recipe:selectedRecipe});setSelectedRecipe(null);}}>+ Add to Meal Plan</button>
              {selectedRecipe.source==="ai"&&<button style={{ ...btnStyle(C.green) }} onClick={()=>{saveAiRecipe(selectedRecipe);setSelectedRecipe(null);}}>💾 Save</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── PLAN PICKER ── */}
      {planPickerOpen&&(
        <div style={modal} onClick={()=>setPlanPickerOpen(null)}>
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghostBtn} onClick={()=>setPlanPickerOpen(null)}>✕ Cancel</button>
            <div style={{ fontWeight:800, fontSize:17, marginBottom:14 }}>
              {planPickerOpen.recipe?`Add "${planPickerOpen.recipe.name}" to...`:`Pick a recipe for ${planPickerOpen.day} ${planPickerOpen.slot}`}
            </div>
            {planPickerOpen.recipe?(
              DAYS.map(day=>(
                <div key={day} style={{ marginBottom:10 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.muted, marginBottom:6 }}>{day}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {MEAL_SLOTS.map(slot=>{
                      const taken=!!mealPlan[`${day}-${slot}`];
                      return <button key={slot} disabled={taken} style={{ flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${taken?C.border:C.accent}`,background:taken?"#F5F5F5":`${C.accent}22`,color:taken?C.border:C.accent,cursor:taken?"not-allowed":"pointer",fontSize:12,fontWeight:700 }}
                        onClick={()=>{addToMealPlan(day,slot,planPickerOpen.recipe);setPlanPickerOpen(null);}}>{taken?"✓":slot}</button>;
                    })}
                  </div>
                </div>
              ))
            ):(
              <div style={{ maxHeight:360, overflowY:"auto" }}>
                {recipes.map(r=>(
                  <div key={r.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}
                    onClick={()=>{addToMealPlan(planPickerOpen.day,planPickerOpen.slot,r);setPlanPickerOpen(null);}}>
                    <span style={{ fontSize:24 }}>{r.emoji}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{r.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{r.time} · 🔥{r.calories}cal · P:{r.protein}g C:{r.carbs}g F:{r.fat}g</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {importOpen&&(
        <div style={modal} onClick={resetImport}>
          <div style={{ ...modalBox, maxWidth:560 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontWeight:900, fontSize:18 }}>
                {importMode==="menu" && "➕ Add a Recipe"}
                {importMode==="url" && "🔗 Import by URL"}
                {importMode==="text" && "📋 Paste Recipe Text"}
                {importMode==="describe" && "🎤 Describe a Dish"}
                {importMode==="photo" && "📸 Photo of Recipe"}
                {importMode==="manual" && "📝 Manual Entry"}
              </div>
              <button style={ghostBtn} onClick={resetImport}>✕</button>
            </div>

            {/* Back button for sub-modes */}
            {importMode!=="menu" && !importResult && (
              <button style={{ ...ghostBtn, fontSize:12, padding:"6px 12px", marginBottom:14 }} onClick={()=>{setImportMode("menu");setImportError("");}}>← Back</button>
            )}

            {/* ── MENU ── */}
            {importMode==="menu" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { mode:"url",      emoji:"🔗", title:"Import by URL",       desc:"Paste an AllRecipes, Food Network, or any recipe link" },
                  { mode:"text",     emoji:"📋", title:"Paste Recipe Text",   desc:"Copy text from anywhere and AI formats it" },
                  { mode:"describe", emoji:"🎤", title:"Describe a Dish",     desc:"Tell AI what you want and it builds the full recipe" },
                  { mode:"photo",    emoji:"📸", title:"Photo of Recipe",     desc:"Snap a pic of a cookbook, card, or handwritten recipe" },
                  { mode:"manual",   emoji:"📝", title:"Manual Entry",        desc:"Type in your own recipe from scratch" },
                ].map(opt=>(
                  <div key={opt.mode} style={{ background:"#FFFAF5", border:`1.5px solid ${C.border}`, borderRadius:12, padding:"16px 14px", cursor:"pointer", transition:"all 0.15s" }}
                    onClick={()=>setImportMode(opt.mode)}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background="#FFF8F0";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="#FFFAF5";}}>
                    <div style={{ fontSize:28, marginBottom:6 }}>{opt.emoji}</div>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:3 }}>{opt.title}</div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── URL MODE ── */}
            {importMode==="url" && !importResult && (
              <>
                <div style={{ color:C.muted, fontSize:13, marginBottom:12 }}>Paste any recipe page URL and AI will extract all the details.</div>
                <input style={inputStyle} placeholder="https://www.allrecipes.com/recipe/..." value={importUrl} onChange={e=>setImportUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importByUrl()}/>
                {importError&&<div style={{ color:C.red, fontSize:13, marginBottom:8 }}>{importError}</div>}
                <button style={{ ...btnStyle(), width:"100%", padding:"12px 0", opacity:importLoading?0.6:1 }} onClick={importByUrl} disabled={importLoading}>{importLoading?"🔄 Reading URL...":"✨ Import Recipe"}</button>
              </>
            )}

            {/* ── TEXT MODE ── */}
            {importMode==="text" && !importResult && (
              <>
                <div style={{ color:C.muted, fontSize:13, marginBottom:12 }}>Copy and paste any recipe text — from a website, email, notes app, anywhere.</div>
                  <textarea style={{ ...inputStyle, height:180, resize:"vertical", fontFamily:"inherit" }} placeholder="Paste any recipe text here — ingredients, steps, everything..." value={importText} onChange={e=>setImportText(e.target.value)}/>
                {importError&&<div style={{ color:C.red, fontSize:13, marginBottom:8 }}>{importError}</div>}
                <button style={{ ...btnStyle(), width:"100%", padding:"12px 0", opacity:importLoading?0.6:1 }} onClick={importByText} disabled={importLoading}>{importLoading?"🔄 Parsing text...":"✨ Format & Import"}</button>
              </>
            )}

            {/* ── DESCRIBE MODE ── */}
            {importMode==="describe" && !importResult && (
              <>
                <div style={{ color:C.muted, fontSize:13, marginBottom:12 }}>Describe a dish in plain English — as simple or detailed as you want. AI builds the full recipe.</div>
                  <textarea style={{ ...inputStyle, height:120, resize:"vertical", fontFamily:"inherit" }} placeholder="e.g. My grandma's spicy chicken tortilla soup, or a keto grilled salmon ready in 20 min, or something my kids will eat with ground beef" value={importDescribe} onChange={e=>setImportDescribe(e.target.value)}/>
                {importError&&<div style={{ color:C.red, fontSize:13, marginBottom:8 }}>{importError}</div>}
                <button style={{ ...btnStyle(), width:"100%", padding:"12px 0", opacity:importLoading?0.6:1 }} onClick={importByDescribe} disabled={importLoading}>{importLoading?"🔄 Creating recipe...":"✨ Generate Recipe"}</button>
              </>
            )}

            {/* ── PHOTO MODE ── */}
            {importMode==="photo" && !importResult && (
              <>
                <div style={{ color:C.muted, fontSize:13, marginBottom:12 }}>Take a photo of any recipe — cookbook page, recipe card, handwritten note, or screen. AI will read and import it.</div>
                <div style={{ border:`2px dashed ${importPhoto?C.green:C.border}`, borderRadius:12, padding:"24px 16px", textAlign:"center", marginBottom:12, cursor:"pointer", background:importPhoto?`${C.green}11`:C.surface }}
                  onClick={()=>document.getElementById("photoInput").click()}>
                  {importPhoto ? (
                    <>
                      <div style={{ fontSize:32, marginBottom:6 }}>✅</div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{importPhoto.name}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Tap to change photo</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:40, marginBottom:8 }}>📸</div>
                      <div style={{ fontWeight:700, fontSize:15 }}>Tap to choose photo</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>JPG, PNG, HEIC supported · Works great with cookbook photos!</div>
                    </>
                  )}
                </div>
                <input id="photoInput" type="file" accept="image/*" style={{ display:"none" }} onChange={e=>setImportPhoto(e.target.files[0])}/>
                {importError&&<div style={{ color:C.red, fontSize:13, marginBottom:8 }}>{importError}</div>}
                <button style={{ ...btnStyle(), width:"100%", padding:"12px 0", opacity:(importLoading||!importPhoto)?0.6:1 }} onClick={importByPhoto} disabled={importLoading||!importPhoto}>{importLoading?"🔄 Reading photo...":"✨ Extract Recipe from Photo"}</button>
              </>
            )}

            {/* ── MANUAL MODE ── */}
            {importMode==="manual" && !importResult && (
              <div style={{ maxHeight:"65vh", overflowY:"auto", paddingRight:4 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Recipe Name *</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="e.g. Mom's Lasagna" value={manualRecipe.name} onChange={e=>setManualRecipe(p=>({...p,name:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Cook Time</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="e.g. 45 min" value={manualRecipe.time} onChange={e=>setManualRecipe(p=>({...p,time:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Servings</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} type="number" min="1" placeholder="4" value={manualRecipe.baseServings} onChange={e=>setManualRecipe(p=>({...p,baseServings:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Calories (per serving)</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} type="number" placeholder="350" value={manualRecipe.calories} onChange={e=>setManualRecipe(p=>({...p,calories:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Protein (g)</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} type="number" placeholder="25" value={manualRecipe.protein} onChange={e=>setManualRecipe(p=>({...p,protein:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Carbs (g)</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} type="number" placeholder="30" value={manualRecipe.carbs} onChange={e=>setManualRecipe(p=>({...p,carbs:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Fat (g)</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} type="number" placeholder="12" value={manualRecipe.fat} onChange={e=>setManualRecipe(p=>({...p,fat:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Category</div>
                    <select style={{ ...inputStyle, marginBottom:0 }} value={manualRecipe.category} onChange={e=>setManualRecipe(p=>({...p,category:e.target.value}))}>
                      {["Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>Description</div>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="Short description of the recipe" value={manualRecipe.desc} onChange={e=>setManualRecipe(p=>({...p,desc:e.target.value}))}/>
                  </div>
                </div>

                {/* Diet tags */}
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>Diet Tags</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                  {["Keto","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Paleo"].map(t=>{
                    const on=manualRecipe.tags.includes(t);
                    return <button key={t} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${on?C.green:C.border}`, background:on?`${C.green}22`:"transparent", color:on?C.green:C.muted, fontSize:12, cursor:"pointer", fontWeight:600 }}
                      onClick={()=>setManualRecipe(p=>({...p,tags:on?p.tags.filter(x=>x!==t):[...p.tags,t]}))}>
                      {on?"✓ ":""}{t}
                    </button>;
                  })}
                </div>

                {/* Ingredients */}
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>Ingredients *</div>
                {manualRecipe.ingredients.map((ing, i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px 70px 24px", gap:6, marginBottom:6 }}>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="Ingredient" value={ing.item} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,item:e.target.value}:x)}))}/>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="Qty" value={ing.qty} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,qty:e.target.value}:x)}))}/>
                    <input style={{ ...inputStyle, marginBottom:0 }} placeholder="Unit" value={ing.unit} onChange={e=>setManualRecipe(p=>({...p,ingredients:p.ingredients.map((x,j)=>j===i?{...x,unit:e.target.value}:x)}))}/>
                    <button style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }} onClick={()=>setManualRecipe(p=>({...p,ingredients:p.ingredients.filter((_,j)=>j!==i)}))}>×</button>
                  </div>
                ))}
                <button style={{ ...ghostBtn, fontSize:12, padding:"6px 14px", marginBottom:14 }} onClick={()=>setManualRecipe(p=>({...p,ingredients:[...p.ingredients,{item:"",qty:"",unit:""}]}))}>+ Add Ingredient</button>

                {/* Steps */}
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>Steps *</div>
                {manualRecipe.steps.map((step, i)=>(
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
                    <div style={{ width:24, height:24, background:C.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#fff", flexShrink:0, marginTop:8 }}>{i+1}</div>
                    <textarea style={{ ...inputStyle, marginBottom:0, flex:1, height:60, resize:"vertical", fontFamily:"inherit" }} placeholder={`Step ${i+1}`} value={step} onChange={e=>setManualRecipe(p=>({...p,steps:p.steps.map((x,j)=>j===i?e.target.value:x)}))}/>
                    <button style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, marginTop:8 }} onClick={()=>setManualRecipe(p=>({...p,steps:p.steps.filter((_,j)=>j!==i)}))}>×</button>
                  </div>
                ))}
                <button style={{ ...ghostBtn, fontSize:12, padding:"6px 14px", marginBottom:14 }} onClick={()=>setManualRecipe(p=>({...p,steps:[...p.steps,""]}))}>+ Add Step</button>

                {importError&&<div style={{ color:C.red, fontSize:13, marginBottom:8 }}>{importError}</div>}
                <button style={{ ...btnStyle(C.green), width:"100%", padding:"12px 0" }} onClick={confirmManual}>💾 Save Recipe</button>
              </div>
            )}

            {/* ── LOADING STATE ── */}
            {importLoading && importMode!=="manual" && (
              <div style={{ textAlign:"center", padding:"30px 0" }}>
                <div style={{ fontSize:44, marginBottom:10 }}>👨‍🍳</div>
                <div style={{ fontWeight:800, color:C.text }}>AI is working on it...</div>
                <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>This takes about 5-10 seconds</div>
              </div>
            )}

            {/* ── RESULT PREVIEW ── */}
            {importResult && (
              <div style={{ background:C.surface, borderRadius:12, padding:16, border:`1px solid ${C.green}44` }}>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:36 }}>{importResult.emoji}</span>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{importResult.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{importResult.time} · {importResult.calories} cal · {importResult.baseServings} servings</div>
                    <div style={{ fontSize:12, color:C.muted }}>P:{importResult.protein}g · C:{importResult.carbs}g · F:{importResult.fat}g</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                  {importResult.tags?.map(t=><span key={t} style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:tagColors[t]?.bg||"#1e2030", color:tagColors[t]?.text||"#94a3b8" }}>{t}</span>)}
                </div>
                <div style={{ fontSize:12, color:C.green, marginBottom:14 }}>✓ {importResult.ingredients?.length} ingredients · {importResult.steps?.length} steps ready to go!</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ ...ghostBtn, flex:1 }} onClick={()=>setImportResult(null)}>← Try again</button>
                  <button style={{ ...btnStyle(C.green), flex:2, padding:"10px 0" }} onClick={confirmImport}>Add to My Recipes →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
