import { useState, useMemo, useEffect } from "react";

const STORAGE_KEYS = { recipes:"mf_recipes2", mealPlan:"mf_mealplan2", users:"mf_users2", currentUser:"mf_currentuser2", checkedItems:"mf_checked2" };
const load = (key, fallback) => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; } };
const save = (key, val) => { try { localStorage.setItem(key,JSON.stringify(val)); } catch {} };

const CATEGORIES = ["All","Breakfast","Lunch","Dinner","Grilling","Kids Drinks","Adult Drinks","Snacks","Desserts"];
const DIETS      = ["All","Keto","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Paleo"];
const DAYS       = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_SLOTS = ["Breakfast","Lunch","Dinner"];

const CATEGORY_ICONS = { All:"🍴", Breakfast:"🌅", Lunch:"🥗", Dinner:"🍽️", Grilling:"🔥", "Kids Drinks":"🧃", "Adult Drinks":"🍹", Snacks:"🍿", Desserts:"🍰" };

const tagColors = {
  Keto:{"bg":"#1a2e1a","text":"#4ade80"}, Vegetarian:{"bg":"#1a2e1a","text":"#86efac"},
  Vegan:{"bg":"#14261a","text":"#34d399"}, "Gluten-Free":{"bg":"#2d1f0a","text":"#fbbf24"},
  "Dairy-Free":{"bg":"#1e1a2e","text":"#a78bfa"}, Paleo:{"bg":"#2e1a0a","text":"#fb923c"},
};

const SEED_RECIPES = [
  {id:"r1",name:"Grilled Lemon Herb Chicken",time:"30 min",baseServings:4,calories:320,protein:38,carbs:2,fat:16,tags:["Keto","Gluten-Free","Dairy-Free","Paleo"],category:"Dinner",emoji:"🍗",desc:"Juicy, herby chicken that's weeknight-perfect and packed with protein.",ingredients:[{item:"Chicken breasts",qty:4,unit:"pieces"},{item:"Lemon juice",qty:3,unit:"tbsp"},{item:"Olive oil",qty:2,unit:"tbsp"},{item:"Garlic",qty:4,unit:"cloves"},{item:"Fresh rosemary",qty:2,unit:"sprigs"},{item:"Salt & pepper",qty:1,unit:"pinch"}],steps:["Marinate chicken in lemon, oil, garlic 20 min.","Grill 6–7 min per side.","Rest 5 min before slicing."],source:"built-in"},
  {id:"r2",name:"BBQ Baby Back Ribs",time:"3 hrs",baseServings:4,calories:680,protein:52,carbs:18,fat:42,tags:["Gluten-Free","Dairy-Free"],category:"Grilling",emoji:"🍖",desc:"Fall-off-the-bone ribs with a smoky, sticky glaze that'll impress the whole family.",ingredients:[{item:"Baby back ribs",qty:2,unit:"racks"},{item:"BBQ sauce",qty:1,unit:"cup"},{item:"Brown sugar",qty:2,unit:"tbsp"},{item:"Smoked paprika",qty:1,unit:"tbsp"},{item:"Garlic powder",qty:1,unit:"tsp"},{item:"Salt & pepper",qty:1,unit:"pinch"}],steps:["Rub ribs with spices and brown sugar.","Wrap in foil, bake 250°F for 2.5 hrs.","Unwrap, brush BBQ sauce, grill 10 min per side.","Rest 10 min, slice and serve."],source:"built-in"},
  {id:"r3",name:"Strawberry Banana Smoothie",time:"5 min",baseServings:2,calories:180,protein:4,carbs:42,fat:1,tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"],category:"Kids Drinks",emoji:"🍓",desc:"A kid-approved creamy smoothie that tastes like dessert but is packed with fruit.",ingredients:[{item:"Frozen strawberries",qty:1,unit:"cup"},{item:"Banana",qty:1,unit:"whole"},{item:"Orange juice",qty:1,unit:"cup"},{item:"Honey",qty:1,unit:"tbsp"},{item:"Ice",qty:0.5,unit:"cup"}],steps:["Add all ingredients to blender.","Blend until smooth and creamy.","Pour into glasses and serve immediately."],source:"built-in"},
  {id:"r4",name:"Classic Margarita",time:"5 min",baseServings:1,calories:220,protein:0,carbs:14,fat:0,tags:["Vegan","Gluten-Free","Dairy-Free"],category:"Adult Drinks",emoji:"🍹",desc:"The perfect summer cocktail — tart, salty, and refreshing on a hot day.",ingredients:[{item:"Tequila",qty:2,unit:"oz"},{item:"Fresh lime juice",qty:1,unit:"oz"},{item:"Triple sec",qty:0.5,unit:"oz"},{item:"Salt",qty:1,unit:"pinch"},{item:"Ice",qty:1,unit:"cup"},{item:"Lime wedge",qty:1,unit:"piece"}],steps:["Rim glass with salt.","Add tequila, lime juice, triple sec to shaker with ice.","Shake vigorously 15 seconds.","Strain into glass over fresh ice, garnish with lime."],source:"built-in"},
  {id:"r5",name:"Grilled Corn on the Cob",time:"20 min",baseServings:4,calories:140,protein:4,carbs:28,fat:3,tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"],category:"Grilling",emoji:"🌽",desc:"Smoky, charred sweet corn that's the ultimate summer cookout side dish.",ingredients:[{item:"Corn on the cob",qty:4,unit:"ears"},{item:"Butter",qty:2,unit:"tbsp"},{item:"Salt",qty:1,unit:"tsp"},{item:"Chili powder",qty:0.5,unit:"tsp"},{item:"Lime",qty:1,unit:"whole"}],steps:["Peel back husks, remove silk.","Brush with butter, season.","Grill on medium-high 15 min, turning every 3 min.","Squeeze lime over top before serving."],source:"built-in"},
  {id:"r6",name:"Watermelon Lemonade",time:"10 min",baseServings:4,calories:90,protein:1,carbs:22,fat:0,tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"],category:"Kids Drinks",emoji:"🍉",desc:"The ultimate summer cooler — naturally sweet, bright pink, and kids go crazy for it.",ingredients:[{item:"Watermelon",qty:4,unit:"cups"},{item:"Lemon juice",qty:0.5,unit:"cup"},{item:"Sugar",qty:3,unit:"tbsp"},{item:"Water",qty:2,unit:"cups"},{item:"Ice",qty:2,unit:"cups"},{item:"Fresh mint",qty:4,unit:"leaves"}],steps:["Blend watermelon until smooth, strain.","Mix lemon juice, sugar, and water until sugar dissolves.","Combine watermelon juice and lemonade.","Serve over ice with mint garnish."],source:"built-in"},
  {id:"r7",name:"Grilled Burger Smash",time:"15 min",baseServings:4,calories:580,protein:36,carbs:32,fat:34,tags:["Dairy-Free"],category:"Grilling",emoji:"🍔",desc:"Crispy-edged smash burgers with incredible flavor — the only burger recipe you'll ever need.",ingredients:[{item:"Ground beef 80/20",qty:1.5,unit:"lb"},{item:"Burger buns",qty:4,unit:"whole"},{item:"American cheese",qty:4,unit:"slices"},{item:"Onion",qty:1,unit:"whole"},{item:"Pickles",qty:8,unit:"slices"},{item:"Burger sauce",qty:4,unit:"tbsp"}],steps:["Divide beef into 6oz balls.","Place on screaming hot griddle, smash flat immediately.","Season, cook 2 min, flip, add cheese.","Toast buns, assemble with sauce, onion, pickles."],source:"built-in"},
  {id:"r8",name:"Frozen Mango Mojito",time:"10 min",baseServings:2,calories:195,protein:0,carbs:18,fat:0,tags:["Vegan","Gluten-Free","Dairy-Free"],category:"Adult Drinks",emoji:"🥭",desc:"A tropical frozen cocktail that screams summer — sweet, minty, and dangerously drinkable.",ingredients:[{item:"White rum",qty:3,unit:"oz"},{item:"Frozen mango chunks",qty:1,unit:"cup"},{item:"Fresh lime juice",qty:2,unit:"oz"},{item:"Fresh mint leaves",qty:10,unit:"leaves"},{item:"Simple syrup",qty:1,unit:"oz"},{item:"Ice",qty:2,unit:"cups"}],steps:["Muddle mint with simple syrup in blender.","Add rum, lime juice, mango, and ice.","Blend until smooth and frosty.","Pour into glasses, garnish with mint sprig."],source:"built-in"},
  {id:"r9",name:"Overnight Oats",time:"5 min",baseServings:1,calories:380,protein:12,carbs:58,fat:10,tags:["Vegetarian","Vegan","Dairy-Free"],category:"Breakfast",emoji:"🥣",desc:"Zero morning effort — just grab and go with this creamy, make-ahead breakfast.",ingredients:[{item:"Rolled oats",qty:0.5,unit:"cup"},{item:"Almond milk",qty:0.75,unit:"cup"},{item:"Chia seeds",qty:1,unit:"tbsp"},{item:"Banana",qty:0.5,unit:"whole"},{item:"Maple syrup",qty:1,unit:"tbsp"},{item:"Blueberries",qty:0.25,unit:"cup"}],steps:["Combine oats, milk, chia in jar.","Stir well, refrigerate overnight.","Top with fruit and syrup in morning."],source:"built-in"},
  {id:"r10",name:"Keto Bacon Egg Cups",time:"20 min",baseServings:6,calories:210,protein:14,carbs:1,fat:17,tags:["Keto","Gluten-Free"],category:"Breakfast",emoji:"🥚",desc:"Crispy bacon cups filled with runny eggs — the perfect low-carb breakfast.",ingredients:[{item:"Eggs",qty:6,unit:"large"},{item:"Bacon strips",qty:6,unit:"slices"},{item:"Cheddar cheese",qty:0.5,unit:"cup"},{item:"Chives",qty:2,unit:"tbsp"}],steps:["Preheat oven 375°F.","Line muffin tin with bacon.","Crack egg into each.","Top with cheese, bake 15 min."],source:"built-in"},
  {id:"r11",name:"Chocolate Lava Cake",time:"25 min",baseServings:4,calories:420,protein:8,carbs:48,fat:22,tags:["Vegetarian"],category:"Desserts",emoji:"🍫",desc:"Warm chocolate cake with a gooey molten center — pure dessert perfection.",ingredients:[{item:"Dark chocolate",qty:4,unit:"oz"},{item:"Butter",qty:0.5,unit:"cup"},{item:"Eggs",qty:4,unit:"large"},{item:"Sugar",qty:0.5,unit:"cup"},{item:"Flour",qty:0.25,unit:"cup"},{item:"Vanilla extract",qty:1,unit:"tsp"}],steps:["Melt chocolate and butter together.","Whisk eggs and sugar until pale.","Fold chocolate into eggs, add flour.","Bake in buttered ramekins at 425°F for 12 min."],source:"built-in"},
  {id:"r12",name:"Grilled Salmon with Mango Salsa",time:"25 min",baseServings:4,calories:380,protein:40,carbs:18,fat:16,tags:["Keto","Gluten-Free","Dairy-Free","Paleo"],category:"Grilling",emoji:"🐟",desc:"Flaky grilled salmon topped with a bright tropical salsa — summer on a plate.",ingredients:[{item:"Salmon fillets",qty:4,unit:"pieces"},{item:"Mango",qty:1,unit:"whole"},{item:"Red onion",qty:0.25,unit:"cup"},{item:"Cilantro",qty:0.25,unit:"cup"},{item:"Lime juice",qty:2,unit:"tbsp"},{item:"Jalapeño",qty:1,unit:"whole"}],steps:["Season salmon with salt, pepper, olive oil.","Grill 4-5 min per side.","Dice mango, onion, cilantro, jalapeño — mix with lime.","Top salmon with salsa and serve."],source:"built-in"},
  {id:"r13",name:"Apple Juice Sparkler",time:"3 min",baseServings:2,calories:110,protein:0,carbs:28,fat:0,tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"],category:"Kids Drinks",emoji:"🍎",desc:"A bubbly, festive drink kids think is fancy — perfect for summer parties.",ingredients:[{item:"Apple juice",qty:1,unit:"cup"},{item:"Sparkling water",qty:1,unit:"cup"},{item:"Ice",qty:1,unit:"cup"},{item:"Apple slices",qty:4,unit:"pieces"},{item:"Maraschino cherries",qty:4,unit:"pieces"}],steps:["Fill glasses with ice.","Pour equal parts apple juice and sparkling water.","Garnish with apple slice and cherry.","Serve immediately while bubbly."],source:"built-in"},
  {id:"r14",name:"Avocado Black Bean Bowls",time:"15 min",baseServings:2,calories:480,protein:18,carbs:62,fat:22,tags:["Vegan","Vegetarian","Gluten-Free","Dairy-Free"],category:"Lunch",emoji:"🥑",desc:"A colorful, filling bowl loaded with plant-based protein and healthy fats.",ingredients:[{item:"Black beans",qty:1,unit:"can"},{item:"Avocado",qty:2,unit:"whole"},{item:"Brown rice",qty:1,unit:"cup"},{item:"Lime juice",qty:2,unit:"tbsp"},{item:"Cilantro",qty:0.25,unit:"cup"},{item:"Cherry tomatoes",qty:1,unit:"cup"}],steps:["Cook rice per package.","Warm beans with cumin.","Slice avocado.","Assemble bowl, squeeze lime on top."],source:"built-in"},
  {id:"r15",name:"Spicy Frozen Paloma",time:"5 min",baseServings:1,calories:185,protein:0,carbs:16,fat:0,tags:["Vegan","Gluten-Free","Dairy-Free"],category:"Adult Drinks",emoji:"🌶️",desc:"A fiery-sweet grapefruit cocktail with a chili kick — the coolest drink of summer.",ingredients:[{item:"Tequila",qty:2,unit:"oz"},{item:"Fresh grapefruit juice",qty:3,unit:"oz"},{item:"Tajin or chili salt",qty:1,unit:"tsp"},{item:"Lime juice",qty:0.5,unit:"oz"},{item:"Agave syrup",qty:0.5,unit:"oz"},{item:"Ice",qty:1,unit:"cup"}],steps:["Rim glass with Tajin.","Blend tequila, grapefruit juice, lime, agave, and ice.","Pour into prepared glass.","Garnish with grapefruit slice and extra Tajin."],source:"built-in"},
];

const C = { bg:"#0d1117",surface:"#161b22",card:"#1c2128",border:"#30363d",accent:"#e8751a",accent2:"#f59e0b",green:"#3fb950",text:"#e6edf3",muted:"#8b949e",red:"#f85149" };

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
  const [planPicker,     setPlanPicker]     = useState(null);
  const [authMode,       setAuthMode]       = useState("login");
  const [authForm,       setAuthForm]       = useState({name:"",email:"",password:""});
  const [authError,      setAuthError]      = useState("");
  const [toast,          setToast]          = useState(null);

  // AI search states
  const [aiSearch,       setAiSearch]       = useState("");
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiResults,      setAiResults]      = useState([]);
  const [aiError,        setAiError]        = useState("");
  const [aiPreview,      setAiPreview]      = useState(null);

  useEffect(()=>save(STORAGE_KEYS.recipes,recipes),[recipes]);
  useEffect(()=>save(STORAGE_KEYS.mealPlan,mealPlan),[mealPlan]);
  useEffect(()=>save(STORAGE_KEYS.users,users),[users]);
  useEffect(()=>save(STORAGE_KEYS.currentUser,currentUser),[currentUser]);
  useEffect(()=>save(STORAGE_KEYS.checkedItems,checkedItems),[checkedItems]);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  // ── AUTH ────────────────────────────────────────────────────────────────────
  const handleAuth = () => {
    setAuthError("");
    if (authMode==="signup") {
      if (!authForm.name||!authForm.email||!authForm.password) return setAuthError("Please fill in all fields.");
      if (users.find(u=>u.email===authForm.email)) return setAuthError("That email is already registered.");
      const newUser = {id:Date.now().toString(),name:authForm.name,email:authForm.email,password:authForm.password,dietPrefs:[],joinedAt:new Date().toISOString()};
      setUsers(p=>[...p,newUser]); setCurrentUser(newUser);
      showToast(`Welcome to MealFlow, ${newUser.name}! 🎉`);
    } else {
      const user = users.find(u=>u.email===authForm.email&&u.password===authForm.password);
      if (!user) return setAuthError("Incorrect email or password.");
      setCurrentUser(user); showToast(`Welcome back, ${user.name}! 👋`);
    }
    setAuthForm({name:"",email:"",password:""}); setScreen("home");
  };
  const logout = () => { setCurrentUser(null); showToast("Logged out.","info"); };

  // ── FILTER ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(()=>recipes.filter(r=>{
    const dietMatch = activeDiet==="All"||r.tags.includes(activeDiet);
    const catMatch  = activeCategory==="All"||r.category===activeCategory;
    const srchMatch = r.name.toLowerCase().includes(search.toLowerCase())||r.desc.toLowerCase().includes(search.toLowerCase());
    return dietMatch&&catMatch&&srchMatch;
  }),[recipes,activeDiet,activeCategory,search]);

  // ── MEAL PLAN ────────────────────────────────────────────────────────────────
  const addToMealPlan = (day,slot,recipe) => { setMealPlan(p=>({...p,[`${day}-${slot}`]:recipe})); showToast(`${recipe.emoji} Added to ${day} ${slot}!`); };
  const removeFromPlan = (key) => setMealPlan(p=>{const n={...p};delete n[key];return n;});
  const plannedCount = Object.keys(mealPlan).length;

  // ── NUTRITION ────────────────────────────────────────────────────────────────
  const scaledNutrition = (recipe,servings) => {
    const ratio = servings/(recipe.baseServings||4);
    return {calories:Math.round((recipe.calories||0)*ratio),protein:Math.round((recipe.protein||0)*ratio),carbs:Math.round((recipe.carbs||0)*ratio),fat:Math.round((recipe.fat||0)*ratio)};
  };
  const scaledIngredients = (recipe,servings) => {
    const ratio = servings/(recipe.baseServings||4);
    return recipe.ingredients.map(ing=>({...ing,qty:typeof ing.qty==="number"?Math.round(ing.qty*ratio*4)/4:ing.qty}));
  };

  // ── GROCERY ──────────────────────────────────────────────────────────────────
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

  const weeklyNutrition = useMemo(()=>{
    const vals=Object.values(mealPlan);
    return {calories:vals.reduce((s,r)=>s+(r.calories||0),0),protein:vals.reduce((s,r)=>s+(r.protein||0),0),carbs:vals.reduce((s,r)=>s+(r.carbs||0),0),fat:vals.reduce((s,r)=>s+(r.fat||0),0)};
  },[mealPlan]);

  // ── AI RECIPE ENGINE ─────────────────────────────────────────────────────────
  const searchAiRecipes = async () => {
    if (!aiSearch.trim()) return;
    setAiLoading(true); setAiError(""); setAiResults([]);
    try {
      const prompt = `You are a professional recipe database. Generate 6 diverse, detailed recipes for: "${aiSearch}"

Return ONLY a valid JSON array (no markdown, no backticks, no extra text) like this:
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
    "desc": "Short appetizing description.",
    "ingredients": [{"item":"ingredient",  "qty": 2, "unit": "cups"}],
    "steps": ["Step 1.", "Step 2.", "Step 3.", "Step 4."]
  }
]

Rules:
- Tags only from: Keto, Vegetarian, Vegan, Gluten-Free, Dairy-Free, Paleo
- Category only from: Breakfast, Lunch, Dinner, Grilling, Kids Drinks, Adult Drinks, Snacks, Desserts
- Each recipe must have at least 6 ingredients and 4 steps
- Nutrition values must be realistic and accurate per serving
- Make recipes varied (different proteins, styles, difficulty levels)
- For drinks: use "serving" as unit for qty where appropriate
- For grilling recipes: include grill temperature and timing details`;

      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text||"";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const withIds = parsed.map(r=>({...r,id:"ai_"+Date.now()+"_"+Math.random().toString(36).slice(2),source:"ai"}));
      setAiResults(withIds);
    } catch(e) {
      setAiError("Something went wrong. Try a different search term!");
    }
    setAiLoading(false);
  };

  const saveAiRecipe = (recipe) => {
    if (recipes.find(r=>r.name===recipe.name)) { showToast("Already in your recipes!","info"); return; }
    setRecipes(p=>[...p,recipe]);
    showToast(`${recipe.emoji} "${recipe.name}" saved!`);
  };

  const saveAllAiRecipes = () => {
    const newOnes = aiResults.filter(r=>!recipes.find(e=>e.name===r.name));
    if (newOnes.length===0) { showToast("All already saved!","info"); return; }
    setRecipes(p=>[...p,...newOnes]);
    showToast(`✅ ${newOnes.length} recipes saved to your collection!`);
  };

  const currentServings = recipeServings ?? selectedRecipe?.baseServings ?? 4;

  // ── STYLE HELPERS ─────────────────────────────────────────────────────────────
  const pill = (active,color=C.accent)=>({padding:"5px 13px",borderRadius:20,border:`1px solid ${active?color:C.border}`,cursor:"pointer",fontWeight:600,fontSize:12,whiteSpace:"nowrap",background:active?`${color}22`:"transparent",color:active?color:C.muted,transition:"all 0.15s"});
  const btn  = (color=C.accent)=>({background:`linear-gradient(135deg,${color},${color}bb)`,border:"none",color:"#fff",borderRadius:10,padding:"10px 18px",cursor:"pointer",fontWeight:700,fontSize:13});
  const ghost= {background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"9px 16px",cursor:"pointer",fontWeight:600,fontSize:13};
  const inp  = {width:"100%",padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10};
  const statCard = {background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px",textAlign:"center"};
  const modal = {position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,overflowY:"auto",padding:16,display:"flex",alignItems:"flex-start",justifyContent:"center"};
  const modalBox = {background:C.card,borderRadius:18,width:"100%",maxWidth:520,margin:"20px 0",padding:24,border:`1px solid ${C.border}`};
  const tagStyle = (t)=>({padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:tagColors[t]?.bg||"#1e2030",color:tagColors[t]?.text||"#94a3b8"});

  const RecipeCard = ({r, onOpen}) => (
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}
      onClick={()=>onOpen(r)}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=C.accent+"66";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}>
      <div style={{textAlign:"center",fontSize:44,padding:"18px 0 8px"}}>{r.emoji}</div>
      <div style={{padding:"0 14px 14px"}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>{r.name}</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:8,lineHeight:1.5}}>{r.desc}</div>
        <div style={{display:"flex",gap:10,fontSize:11,color:C.muted,marginBottom:8}}>
          <span>⏱ {r.time}</span><span>👤 {r.baseServings}</span><span>🔥 {r.calories} cal</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
          {[{l:"Protein",v:r.protein||0,color:C.green,max:60},{l:"Carbs",v:r.carbs||0,color:C.accent2,max:80},{l:"Fat",v:r.fat||0,color:C.red,max:40}].map(m=>(
            <div key={m.l}>
              <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{m.l} {m.v}g</div>
              <div style={{background:C.border,borderRadius:3,height:4}}>
                <div style={{background:m.color,height:4,borderRadius:3,width:`${Math.min(100,(m.v/m.max)*100)}%`}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {r.tags.map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}
          {r.source==="ai" && <span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#1a1a2e",color:"#818cf8"}}>AI Generated</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif",paddingBottom:90}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {toast && <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?C.green:toast.type==="info"?C.accent:C.red,color:"#fff",padding:"10px 20px",borderRadius:20,fontWeight:700,fontSize:13,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:`linear-gradient(180deg,${C.surface} 0%,${C.bg} 100%)`,borderBottom:`1px solid ${C.border}`,padding:"14px 18px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:20,fontWeight:900,background:`linear-gradient(90deg,${C.accent},${C.accent2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🍴 MealFlow</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {currentUser ? (
              <>
                <div style={{background:C.accent,borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{currentUser.name[0].toUpperCase()}</div>
                <button onClick={logout} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>Sign out</button>
              </>
            ):(
              <button onClick={()=>{setScreen("profile");setAuthMode("login");}} style={btn()}>Sign In</button>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginTop:12,overflowX:"auto",scrollbarWidth:"none"}}>
          {[["home","🍽️ Recipes"],["discover","✨ Discover"],["planner","📅 Plan"],["grocery","🛒 Groceries"],["profile","👤 Profile"]].map(([id,label])=>(
            <button key={id} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,transition:"all 0.15s",background:screen===id?C.accent:"transparent",color:screen===id?"#fff":C.muted,whiteSpace:"nowrap"}}
              onClick={()=>setScreen(id)}>
              {label}{id==="planner"&&plannedCount>0?<span style={{marginLeft:5,background:"#ffffff33",borderRadius:10,padding:"1px 6px",fontSize:10}}>{plannedCount}</span>:null}
            </button>
          ))}
        </div>
      </div>

      {/* ── MY RECIPES ── */}
      {screen==="home" && (
        <div>
          <div style={{padding:"14px 16px 0"}}>
            <input style={{...inp,marginBottom:10}} placeholder="🔍  Search your saved recipes..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {/* Category icons */}
            <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:6,marginBottom:6}}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setActiveCategory(c)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 12px",borderRadius:12,border:`1px solid ${activeCategory===c?C.accent:C.border}`,background:activeCategory===c?`${C.accent}22`:C.card,cursor:"pointer",minWidth:64,transition:"all 0.15s"}}>
                  <span style={{fontSize:20}}>{CATEGORY_ICONS[c]}</span>
                  <span style={{fontSize:10,fontWeight:700,color:activeCategory===c?C.accent:C.muted,whiteSpace:"nowrap"}}>{c}</span>
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
              {DIETS.map(d=><button key={d} style={pill(activeDiet===d)} onClick={()=>setActiveDiet(d)}>{d}</button>)}
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,marginBottom:2}}>{filtered.length} recipe{filtered.length!==1?"s":""} saved</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14,padding:"12px 16px"}}>
            {filtered.map(r=><RecipeCard key={r.id} r={r} onOpen={r=>{setSelectedRecipe(r);setRecipeServings(r.baseServings);}}/>)}
            {filtered.length===0 && (
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:C.muted}}>
                <div style={{fontSize:48}}>🍽️</div>
                <div style={{fontWeight:700,marginTop:8}}>No saved recipes match</div>
                <div style={{fontSize:13,marginTop:4}}>Try the ✨ Discover tab to find new recipes!</div>
                <button style={{...btn(),marginTop:16}} onClick={()=>setScreen("discover")}>Discover Recipes →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DISCOVER (AI ENGINE) ── */}
      {screen==="discover" && (
        <div style={{padding:16}}>
          <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>✨ Discover Recipes</div>
          <div style={{color:C.muted,fontSize:13,marginBottom:16,lineHeight:1.6}}>Search for anything — the AI generates real recipes instantly. Save the ones you love!</div>

          {/* Quick searches */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Popular Searches</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["🔥 Grilling","🍗 Chicken","🥩 Steak","🌮 Tacos","🍝 Pasta","🥗 Salads","🧃 Kids Smoothies","🍹 Summer Cocktails","🍰 Desserts","🥦 Vegetarian","🐟 Seafood","🫙 Meal Prep","⚡ Under 30 min","🌶️ Spicy","🧒 Kid Friendly"].map(tag=>(
                <button key={tag} style={{...pill(aiSearch===tag.slice(2).trim()),fontSize:13,padding:"7px 14px"}} onClick={()=>{setAiSearch(tag.slice(2).trim());}}>{tag}</button>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input style={{...inp,flex:1,marginBottom:0}} placeholder="e.g. grilled chicken, summer cocktails, kid smoothies..." value={aiSearch} onChange={e=>setAiSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchAiRecipes()}/>
            <button style={{...btn(),whiteSpace:"nowrap",opacity:aiLoading?0.6:1}} onClick={searchAiRecipes} disabled={aiLoading}>
              {aiLoading?"🔄 Generating...":"✨ Generate"}
            </button>
          </div>

          {aiError && <div style={{color:C.red,fontSize:13,marginBottom:12}}>{aiError}</div>}

          {aiLoading && (
            <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>👨‍🍳</div>
              <div style={{fontWeight:700,fontSize:16}}>Chef AI is cooking up recipes...</div>
              <div style={{fontSize:13,marginTop:4}}>Generating 6 detailed recipes just for you</div>
            </div>
          )}

          {aiResults.length>0 && !aiLoading && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:15}}>{aiResults.length} recipes generated for "{aiSearch}"</div>
                <button style={btn(C.green)} onClick={saveAllAiRecipes}>💾 Save All</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
                {aiResults.map(r=>(
                  <div key={r.id} style={{position:"relative"}}>
                    <RecipeCard r={r} onOpen={r=>{setAiPreview(r);setRecipeServings(r.baseServings);}}/>
                    <button style={{...btn(C.green),position:"absolute",bottom:14,right:14,padding:"6px 12px",fontSize:12}} onClick={e=>{e.stopPropagation();saveAiRecipe(r);}}>+ Save</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {aiResults.length===0 && !aiLoading && !aiError && (
            <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
              <div style={{fontSize:56}}>🔍</div>
              <div style={{fontWeight:700,marginTop:8,fontSize:16}}>What are you craving?</div>
              <div style={{fontSize:13,marginTop:4}}>Type anything above or tap a quick search — the possibilities are endless!</div>
            </div>
          )}
        </div>
      )}

      {/* ── PLANNER ── */}
      {screen==="planner" && (
        <div style={{padding:16}}>
          <div style={{fontWeight:900,fontSize:20,marginBottom:4}}>📅 Weekly Meal Planner</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Tap any empty slot to add a recipe.</div>
          {plannedCount>0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[{l:"Calories",v:weeklyNutrition.calories,u:"",c:C.accent},{l:"Protein",v:weeklyNutrition.protein,u:"g",c:C.green},{l:"Carbs",v:weeklyNutrition.carbs,u:"g",c:C.accent2},{l:"Fat",v:weeklyNutrition.fat,u:"g",c:C.red}].map(n=>(
                <div key={n.l} style={statCard}><div style={{fontSize:16,fontWeight:900,color:n.c}}>{n.v}{n.u}</div><div style={{fontSize:10,color:C.muted}}>{n.l}/week</div></div>
              ))}
            </div>
          )}
          <div style={{overflowX:"auto"}}>
            <div style={{minWidth:520}}>
              <div style={{display:"grid",gridTemplateColumns:"84px repeat(3,1fr)",gap:2,marginBottom:2}}>
                <div/>
                {MEAL_SLOTS.map(sl=><div key={sl} style={{fontSize:11,fontWeight:700,color:C.muted,textAlign:"center",padding:"6px 0"}}>{sl}</div>)}
              </div>
              {DAYS.map(day=>(
                <div key={day} style={{display:"grid",gridTemplateColumns:"84px repeat(3,1fr)",gap:2,marginBottom:2}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.muted,display:"flex",alignItems:"center",paddingLeft:4}}>{day.slice(0,3)}</div>
                  {MEAL_SLOTS.map(slot=>{
                    const key=`${day}-${slot}`;const recipe=mealPlan[key];
                    return (
                      <div key={slot} style={{background:recipe?`${C.accent}18`:C.card,border:`1px solid ${recipe?C.accent+"44":C.border}`,borderRadius:8,padding:8,minHeight:54,cursor:"pointer"}}
                        onClick={()=>!recipe&&setPlanPicker({day,slot})}>
                        {recipe?(
                          <div>
                            <div style={{fontSize:18}}>{recipe.emoji}</div>
                            <div style={{fontSize:10,fontWeight:700,lineHeight:1.2,marginBottom:3}}>{recipe.name.length>22?recipe.name.slice(0,22)+"…":recipe.name}</div>
                            <div style={{fontSize:9,color:C.muted}}>🔥{recipe.calories}cal</div>
                            <button onClick={e=>{e.stopPropagation();removeFromPlan(key);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:9,padding:0,marginTop:2}}>✕ remove</button>
                          </div>
                        ):(
                          <div style={{color:C.border,textAlign:"center",lineHeight:"38px",fontSize:20}}>+</div>
                        )}
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
      {screen==="grocery" && (
        <div style={{padding:16}}>
          <div style={{fontWeight:900,fontSize:20,marginBottom:4}}>🛒 Grocery List</div>
          {groceryList.length===0?(
            <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
              <div style={{fontSize:48}}>🛒</div>
              <div style={{fontWeight:700,marginTop:8}}>Your list is empty</div>
              <div style={{fontSize:13,marginTop:4}}>Add recipes to your Meal Plan — the grocery list builds itself!</div>
              <button style={{...btn(),marginTop:16}} onClick={()=>setScreen("planner")}>Go to Planner →</button>
            </div>
          ):(
            <>
              <div style={{fontSize:13,color:C.muted,marginBottom:14}}>{groceryList.length} items · {groceryList.filter(i=>checkedItems[i.item]).length} checked off</div>
              <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"0 16px"}}>
                {groceryList.map((ing,i)=>{
                  const checked=checkedItems[ing.item];
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<groceryList.length-1?`1px solid ${C.border}`:"none",opacity:checked?0.45:1,cursor:"pointer"}}
                      onClick={()=>setCheckedItems(p=>({...p,[ing.item]:!p[ing.item]}))}>
                      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?C.green:C.border}`,background:checked?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {checked&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,textDecoration:checked?"line-through":"none"}}>{ing.item}</div>
                        <div style={{fontSize:11,color:C.muted}}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit} · used in {ing.recipes.length} meal{ing.recipes.length>1?"s":""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button style={ghost} onClick={()=>setCheckedItems({})}>Clear checks</button>
                <button style={btn()} onClick={()=>{const t=groceryList.map(i=>`• ${i.item}: ${typeof i.qty==="number"?i.qty:""} ${i.unit}`).join("\n");navigator.clipboard?.writeText(t).then(()=>showToast("Copied! 📋"));}}>📋 Copy List</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PROFILE ── */}
      {screen==="profile" && (
        <div style={{padding:16,maxWidth:420,margin:"0 auto"}}>
          {currentUser?(
            <>
              <div style={{textAlign:"center",padding:"24px 0 20px"}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#fff",margin:"0 auto 12px"}}>{currentUser.name[0].toUpperCase()}</div>
                <div style={{fontWeight:900,fontSize:22}}>{currentUser.name}</div>
                <div style={{color:C.muted,fontSize:14}}>{currentUser.email}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>Member since {new Date(currentUser.joinedAt).toLocaleDateString()}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                <div style={statCard}><div style={{fontSize:24,fontWeight:900,color:C.accent}}>{recipes.filter(r=>r.source!=="built-in").length}</div><div style={{fontSize:12,color:C.muted}}>Saved Recipes</div></div>
                <div style={statCard}><div style={{fontSize:24,fontWeight:900,color:C.green}}>{plannedCount}</div><div style={{fontSize:12,color:C.muted}}>Meals Planned</div></div>
              </div>
              <div style={{fontWeight:700,marginBottom:10}}>My Diet Preferences</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
                {DIETS.filter(d=>d!=="All").map(d=>{
                  const active=currentUser.dietPrefs?.includes(d);
                  return <button key={d} style={{...pill(active,C.green)}} onClick={()=>{const prefs=currentUser.dietPrefs||[];const updated=active?prefs.filter(p=>p!==d):[...prefs,d];const u={...currentUser,dietPrefs:updated};setCurrentUser(u);setUsers(p=>p.map(u2=>u2.id===currentUser.id?u:u2));}}>{active?"✓ ":""}{d}</button>;
                })}
              </div>
              <button style={{...ghost,width:"100%"}} onClick={logout}>Sign Out</button>
            </>
          ):(
            <div style={{paddingTop:30}}>
              <div style={{fontWeight:900,fontSize:22,marginBottom:4,textAlign:"center"}}>{authMode==="login"?"Welcome back 👋":"Create your account ✨"}</div>
              <div style={{color:C.muted,fontSize:13,textAlign:"center",marginBottom:24}}>{authMode==="login"?"Sign in to save recipes and meal plans":"Free forever — sign up to get started"}</div>
              {authMode==="signup"&&<input style={inp} placeholder="Your name" value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))}/>}
              <input style={inp} placeholder="Email address" type="email" value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))}/>
              <input style={inp} placeholder="Password" type="password" value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
              {authError&&<div style={{color:C.red,fontSize:13,marginBottom:10}}>{authError}</div>}
              <button style={{...btn(),width:"100%",padding:"12px 0",marginBottom:12}} onClick={handleAuth}>{authMode==="login"?"Sign In":"Create Account"}</button>
              <div style={{textAlign:"center",fontSize:13,color:C.muted}}>
                {authMode==="login"?"Don't have an account? ":"Already have an account? "}
                <span style={{color:C.accent,cursor:"pointer",fontWeight:700}} onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>{authMode==="login"?"Sign up free":"Sign in"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RECIPE DETAIL MODAL (saved recipes) ── */}
      {selectedRecipe && (
        <div style={modal} onClick={()=>setSelectedRecipe(null)}>
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghost} onClick={()=>setSelectedRecipe(null)}>← Back</button>
            <div style={{textAlign:"center",fontSize:56,margin:"12px 0 6px"}}>{selectedRecipe.emoji}</div>
            <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>{selectedRecipe.name}</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:10,lineHeight:1.5}}>{selectedRecipe.desc}</div>
            <div style={{display:"flex",gap:14,fontSize:12,color:C.muted,marginBottom:10}}>
              <span>⏱ {selectedRecipe.time}</span><span>🔥 {scaledNutrition(selectedRecipe,currentServings).calories} cal</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>{selectedRecipe.tags.map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}</div>
            <div style={{background:C.surface,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:14}}>Servings</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>setRecipeServings(Math.max(1,currentServings-1))} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontWeight:900,fontSize:20,minWidth:24,textAlign:"center"}}>{currentServings}</span>
                <button onClick={()=>setRecipeServings(currentServings+1)} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {(()=>{const n=scaledNutrition(selectedRecipe,currentServings);return [{l:"Calories",v:n.calories,c:C.accent},{l:"Protein",v:n.protein+"g",c:C.green},{l:"Carbs",v:n.carbs+"g",c:C.accent2},{l:"Fat",v:n.fat+"g",c:C.red}].map(m=>(<div key={m.l} style={{...statCard,padding:"10px 8px"}}><div style={{fontSize:15,fontWeight:900,color:m.c}}>{m.v}</div><div style={{fontSize:10,color:C.muted}}>{m.l}</div></div>));})()}
            </div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>Ingredients</div>
            {scaledIngredients(selectedRecipe,currentServings).map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span>{ing.item}</span><span style={{color:C.accent,fontWeight:700}}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit}</span>
              </div>
            ))}
            <div style={{fontWeight:800,fontSize:15,margin:"16px 0 8px"}}>Steps</div>
            {selectedRecipe.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:24,height:24,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:13,lineHeight:1.6,paddingTop:3}}>{step}</div>
              </div>
            ))}
            <button style={{...btn(),width:"100%",padding:"12px 0",marginTop:20}} onClick={()=>{setPlanPicker({recipe:selectedRecipe});setSelectedRecipe(null);}}>+ Add to Meal Plan</button>
          </div>
        </div>
      )}

      {/* ── AI RECIPE PREVIEW MODAL ── */}
      {aiPreview && (
        <div style={modal} onClick={()=>setAiPreview(null)}>
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghost} onClick={()=>setAiPreview(null)}>← Back</button>
            <div style={{textAlign:"center",fontSize:56,margin:"12px 0 6px"}}>{aiPreview.emoji}</div>
            <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>{aiPreview.name}</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:10,lineHeight:1.5}}>{aiPreview.desc}</div>
            <div style={{display:"flex",gap:14,fontSize:12,color:C.muted,marginBottom:10}}>
              <span>⏱ {aiPreview.time}</span><span>👤 {aiPreview.baseServings} servings</span><span>🔥 {aiPreview.calories} cal</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>{aiPreview.tags.map(t=><span key={t} style={tagStyle(t)}>{t}</span>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[{l:"Calories",v:aiPreview.calories,c:C.accent},{l:"Protein",v:(aiPreview.protein||0)+"g",c:C.green},{l:"Carbs",v:(aiPreview.carbs||0)+"g",c:C.accent2},{l:"Fat",v:(aiPreview.fat||0)+"g",c:C.red}].map(m=>(<div key={m.l} style={{...statCard,padding:"10px 8px"}}><div style={{fontSize:15,fontWeight:900,color:m.c}}>{m.v}</div><div style={{fontSize:10,color:C.muted}}>{m.l}</div></div>))}
            </div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>Ingredients</div>
            {aiPreview.ingredients.map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span>{ing.item}</span><span style={{color:C.accent,fontWeight:700}}>{typeof ing.qty==="number"?ing.qty:""} {ing.unit}</span>
              </div>
            ))}
            <div style={{fontWeight:800,fontSize:15,margin:"16px 0 8px"}}>Steps</div>
            {aiPreview.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:24,height:24,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:13,lineHeight:1.6,paddingTop:3}}>{step}</div>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button style={{...btn(C.green),flex:1,padding:"12px 0"}} onClick={()=>{saveAiRecipe(aiPreview);setAiPreview(null);}}>💾 Save Recipe</button>
              <button style={{...btn(),flex:1,padding:"12px 0"}} onClick={()=>{saveAiRecipe(aiPreview);setPlanPicker({recipe:aiPreview});setAiPreview(null);}}>+ Add to Meal Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAN PICKER MODAL ── */}
      {planPicker && (
        <div style={modal} onClick={()=>setPlanPicker(null)}>
          <div style={modalBox} onClick={e=>e.stopPropagation()}>
            <button style={ghost} onClick={()=>setPlanPicker(null)}>✕ Cancel</button>
            <div style={{fontWeight:800,fontSize:17,marginBottom:14}}>
              {planPicker.recipe?`Add "${planPicker.recipe.name}" to...`:`Pick a recipe for ${planPicker.day} ${planPicker.slot}`}
            </div>
            {planPicker.recipe?(
              DAYS.map(day=>(
                <div key={day} style={{marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:6}}>{day}</div>
                  <div style={{display:"flex",gap:6}}>
                    {MEAL_SLOTS.map(slot=>{
                      const taken=!!mealPlan[`${day}-${slot}`];
                      return <button key={slot} disabled={taken} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${taken?C.border:C.accent}`,background:taken?C.surface:`${C.accent}22`,color:taken?C.border:C.accent,cursor:taken?"not-allowed":"pointer",fontSize:12,fontWeight:700}}
                        onClick={()=>{addToMealPlan(day,slot,planPicker.recipe);setPlanPicker(null);}}>{taken?"✓":slot}</button>;
                    })}
                  </div>
                </div>
              ))
            ):(
              <div style={{maxHeight:360,overflowY:"auto"}}>
                {recipes.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
                    onClick={()=>{addToMealPlan(planPicker.day,planPicker.slot,r);setPlanPicker(null);}}>
                    <span style={{fontSize:24}}>{r.emoji}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{r.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{r.category} · 🔥{r.calories}cal · P:{r.protein}g C:{r.carbs}g F:{r.fat}g</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
