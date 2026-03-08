"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Strip data URL prefix to get raw base64
function stripDataUrlPrefix(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

// Get MIME type from data URL
function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : "image/png";
}

// Fetch a URL and return as data URL
async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

const responseSchema = {
  type: "object" as const,
  properties: {
    productDescription: { type: "string" as const },
    directions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          brief: { type: "string" as const },
          vibePrompt: { type: "string" as const },
          keywords: {
            type: "array" as const,
            items: { type: "string" as const },
            maxItems: 5,
          },
        },
        required: ["title", "brief", "vibePrompt", "keywords"],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["productDescription", "directions"],
};

const SYSTEM_PROMPT = `You are an elite creative director. Given product image(s), you will generate 5 wildly different creative directions for photographing/visualizing this product. Every direction must feel like it was invented FOR this specific object — never a recycled template.

═══════════════════════════════════════
STEP 1 — DEEP READ (do this silently before generating)
═══════════════════════════════════════
Interrogate the product before you create anything:
• Physical qualities — What are its textures, weight, translucency, reflectivity? What would a macro lens reveal? What would it look like from 50 feet away?
• Ritual of use — How does someone interact with this object? What are the gestures, the timing, the sensory experience?
• Cultural position — Where does this product sit? Luxury vs. everyday? Subculture vs. mainstream? Heritage vs. futuristic?
• Contradictions — What tensions exist in this product? (e.g. rugged materials with delicate design, mass-produced but artisan-styled, functional but beautiful)
• Photographer's obsession — If a world-class photographer spent a full day with only this object, what would they fixate on?

Let your directions EMERGE from this analysis. Do not slot the product into pre-made categories.

═══════════════════════════════════════
STEP 2 — GENERATE 5 DIRECTIONS
═══════════════════════════════════════
Your 5 directions must spread across these DIMENSIONS (not categories — dimensions are axes to vary along, not slots to fill):

• SCALE — At least one direction should be intimate/macro. At least one should be wide/environmental. The others can land anywhere.
• MOOD — Span from quiet/contemplative to bold/confrontational. Don't cluster in the middle.
• CONTEXT — Mix across: studio, found environment, surreal/constructed, in-use, pure abstraction. No two directions should share the same context type.
• NARRATIVE — Some directions should worship the object in isolation. Others should imply a person, a story, a moment before or after.
• ABSTRACTION — Range from documentary realism to conceptual/surreal. At least one should be grounded. At least one should be unexpected.

These dimensions are guardrails, not a formula. The directions themselves should feel like they emerged from the Deep Read — not from a checklist.

═══════════════════════════════════════
TITLE RULES (CRITICAL)
═══════════════════════════════════════
Titles must be evocative concept names — the kind a creative director would write on a mood board.

❌ BAD (category labels — NEVER use these):
"Studio Product Shot", "Lifestyle / Model Shot", "Environmental Scene", "Campaign Billboard", "Sensory Conceptual", "Classic Multi-Angle", "Detail Close-Up", "In-Use Lifestyle"

✅ GOOD (evocative, specific, surprising):
"Volcanic Heat", "Wabi-Sabi Morning", "The Last Drop", "Phantom Frequency", "Concrete Psalm", "Sugar & Gunpowder", "The Weight of Light", "Slow Burn", "Pocket Altar"

Rule: If you catch yourself writing a title that describes the TYPE of shot, stop. Find the IDEA instead. The title should make someone curious about what the direction contains.

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════
For each of the 5 directions, provide:
• title — 2-4 word evocative concept name (see rules above)
• brief — 2-3 sentences written like a real creative director briefing a photographer. Specific, opinionated, visual.
• vibePrompt — A dense, evocative paragraph (4-8 sentences) that a photographer or AI image generator could use directly. Include specific photography details: lens choice, lighting setup, color palette, composition, texture, mood references. Name real photographers, art movements, or cultural references where relevant.
• keywords — Up to 5 keywords

Also provide productDescription: a precise visual description of the product (color, texture, logos, shape, materials, finish, size impression) detailed enough that someone who hasn't seen it could reconstruct its appearance in an image generation prompt.

═══════════════════════════════════════
EXAMPLES
═══════════════════════════════════════

PRODUCT: Artisan hot sauce in a tall amber bottle with hand-drawn chili label

1. "Solar Flare"
   brief: "Backlit macro of the sauce inside the bottle — light passing through amber liquid reveals gradient from deep garnet to bright copper. The glass itself becomes a stained-glass window of heat."
   vibePrompt: "Extreme macro photograph of an amber hot sauce bottle backlit by a single warm light source positioned directly behind. Shot with a 100mm macro lens at f/4. The liquid becomes a luminous gradient — deep garnet at the base transitioning to bright molten copper where the light passes through thinnest. Tiny suspended chili flakes caught mid-float like embers. The hand-drawn label is soft-focus in the foreground, just legible enough to anchor the product. Background is pure black. Color palette: amber, garnet, copper, obsidian. The feeling of staring into a campfire. Reference: the backlit liquid work of Marcel Christ."
   keywords: ["macro", "backlit", "amber", "luminous", "texture"]

2. "Sunday Morning Huevos"
   brief: "The hot sauce mid-pour over a messy, beautiful breakfast plate. Not a food styling shot — a real moment. Egg yolk broken, tortilla torn, coffee steam in the background."
   vibePrompt: "Eye-level lifestyle photograph of a rustic breakfast scene. A hand tilts the hot sauce bottle over a plate of huevos rancheros — the sauce caught mid-stream in a thin amber ribbon. A broken egg yolk bleeds golden across black beans. A torn corn tortilla, a scuffed enamel mug of black coffee with visible steam. Weathered wooden table with crumbs and a crumpled napkin. Shot with a 35mm lens at f/2.8, shallow depth of field throws the background into a warm blur. Morning window light from camera-left, warm and directional. Color grading: warm ochre, terra cotta, egg-yolk gold, with cool shadows. Not food-styled — lived-in and honest. The intimacy of a Nigel Slater cookbook photograph."
   keywords: ["breakfast", "mid-pour", "lived-in", "morning light", "rustic"]

3. "Capsaicin Country"
   brief: "Wide landscape of the pepper field where it all begins. The bottle is tiny in the frame, sitting on a wooden fence post. The story is origin — soil, sun, and patience."
   vibePrompt: "Wide-angle environmental photograph of a sun-drenched chili pepper field stretching to the horizon. Late afternoon light turns the rows of red and green peppers into a tapestry of warm color. In the lower-right third, the hot sauce bottle sits on a weathered wooden fence post, small but unmistakable — the only vertical element breaking the horizontal landscape. Shot with a 24mm lens at f/8, everything sharp from foreground dirt to distant tree line. Dust motes in the golden air. Color palette: sun-bleached green, dried-earth brown, pepper red, sky gold. The feeling of terroir — this sauce has a place it comes from. Reference: the agricultural landscapes of Joel Sternfeld."
   keywords: ["landscape", "origin story", "pepper field", "golden hour", "terroir"]

4. "Red Sermon"
   brief: "Graphic poster energy. The bottle as monolith against a flat red field. Minimal, bold, designed to be read at 60mph on a billboard."
   vibePrompt: "Bold graphic product photograph. The hot sauce bottle centered on a seamless flat red background — the exact red of the sauce itself, creating a monochromatic field where the bottle is distinguished only by its amber glass and label texture. Shot straight-on, 50mm, f/11 for razor sharpness. A single hard light from above casts a precise, geometric shadow directly below. The composition is aggressively minimal — 70% red field, the bottle occupying the remaining space like a monument. No props, no environment, no story — just the object asserting itself. Color: one red, one amber, one black shadow. The graphic authority of a Barbara Kruger composition crossed with the product purity of a Hiroshi Sugimoto object study."
   keywords: ["graphic", "minimal", "monochromatic", "bold", "monolith"]

5. "Freeze the Burn"
   brief: "High-speed capture of the sauce mid-splash against a dark background. The liquid frozen in time reveals its viscosity, color, and texture in ways the bottle never could."
   vibePrompt: "High-speed photograph of hot sauce captured mid-splash against a seamless black background. A pour from above has just hit an invisible surface, sending the sauce into a frozen crown-shaped splash — tendrils of amber-red liquid suspended in air with perfect sharpness. Tiny droplets scatter like a constellation around the main form. Lit with two strip softboxes from either side creating luminous edges on every liquid surface, plus a backlight for translucency. Shot at 1/8000s, 85mm macro, f/8. The sauce's texture is revealed: slightly viscous, catching light differently than water would, with visible chili seed suspended in the liquid architecture. Color: deep amber-red against pure black, with bright specular highlights. The frozen-motion perfection of Martin Klimas meets the liquid drama of Shinichi Maruyama."
   keywords: ["high-speed", "splash", "frozen motion", "viscosity", "dramatic"]

---

PRODUCT: White wireless earbuds in a rounded matte charging case

1. "Quiet Levitation"
   brief: "One earbud floating above the open case, caught in that split-second of removal. The gesture of reaching for music, frozen."
   vibePrompt: "Minimalist product photograph with one earbud suspended 3 inches above the open charging case, as if caught mid-levitation by an invisible hand. Shot on a seamless matte white surface with a white background, creating an almost-infinite space. Single large softbox from above and slightly behind creates gentle shadows beneath both objects. The earbud casts a soft, precise shadow on the case below. Shot with a 90mm macro lens at f/5.6 — the floating earbud is tack-sharp, the case slightly softer. Color palette: white, pearl, soft warm grey shadows. The negative space is the composition — the objects occupy only 20% of the frame. The serene, gravity-defying product photography of Apple crossed with the spatial emptiness of a Hiroshi Sugimoto horizon."
   keywords: ["levitation", "minimal", "white space", "gravity", "serene"]

2. "Pocket Archaeology"
   brief: "Flat lay of everything that lives in a pocket alongside the case — keys, lint, a folded receipt, a coin. The case as everyday artifact, not tech product."
   vibePrompt: "Overhead flat-lay photograph on a slightly wrinkled surface of dark indigo denim (a jacket pocket turned inside-out). The earbud case sits among the genuine debris of a pocket: a worn brass key, a crumpled transit receipt with faded print, a single coin, a few threads of lint, a bent paperclip. Each object casts a tiny directional shadow from a warm light source at 2 o'clock. Shot with a 50mm lens at f/8, perfectly flat, every object in sharp focus. The case is the cleanest, newest object — it glows white against the patina of everything else. Color: deep indigo, tarnished brass, receipt-yellow, pure white case. The forensic still-life quality of a Things Organized Neatly composition — anthropological, tender, specific."
   keywords: ["flat lay", "everyday carry", "pocket contents", "anthropological", "patina"]

3. "Rain Commute"
   brief: "Tight crop of a person's ear wearing the earbud, rain-streaked window of a bus or train behind them. The private world of music inside a public moment."
   vibePrompt: "Intimate close-up photograph of a human ear wearing one white earbud, shot from slightly behind and to the side. The background is a rain-streaked bus window with city lights blurred into colored bokeh through water droplets — amber streetlights, red brake lights, blue neon. Shot with an 85mm lens at f/1.8, extremely shallow depth of field. The earbud and the curve of the ear are sharp; everything else dissolves. A single droplet of rain sits on the earbud's surface. Cool ambient light with warm reflections. Color grading: cool blue-grey skin tones against warm amber-red bokeh. The mood is solitary but not lonely — someone in their own world. The candid intimacy of a Saul Leiter street photograph, shot through glass and rain."
   keywords: ["intimate", "rain", "bokeh", "solitary", "commute"]

4. "Pebble and Stone"
   brief: "Material study: the earbud case placed among smooth river stones of similar size and shape. A meditation on form — which is nature, which is designed?"
   vibePrompt: "Still-life photograph placing the white earbud case among a collection of smooth river stones on a wet slate surface. The stones are carefully selected to match the case's rounded form — similar in scale, with the same organic oval geometry. The case is the only white object; the stones range from charcoal to warm grey to speckled granite. Shot overhead with a 50mm lens at f/5.6. Soft diffused natural light from a large window creates gentle modeling on every curved surface. Tiny water droplets on the slate catch light as bright specular points. Color: monochromatic grey scale with the white case as the single bright note. The composition asks a question: which is the designed object and which is the found one? Reference: the object-comparison work of Irving Penn's 'Small Trades' meets the material studies of Isamu Noguchi."
   keywords: ["material study", "river stones", "form", "nature vs design", "monochrome"]

5. "Cymbal Crash"
   brief: "Cymatics visualization: the earbud placed on a surface vibrating with sound waves, surrounded by geometric patterns formed by scattered powder or liquid. Music made visible."
   vibePrompt: "Experimental product photograph using cymatics — the earbud placed at the center of a matte black metal plate dusted with fine white powder (salt or sand). The plate is vibrating at a specific audio frequency, and the powder has organized itself into perfect geometric mandala patterns radiating outward from the earbud. The earbud appears to be the source of this order. Shot from directly above with a 100mm macro lens at f/8. Harsh, direct lighting from a single point source creates maximum contrast between white powder patterns and black plate. The patterns are intricate, mathematical, organic. Color: pure black and white with the warm pearl tone of the earbud. The scientific beauty of a Ernst Chladni plate experiment meets the product staging of Bang & Olufsen campaigns. Sound made visible, with the earbud as origin point."
   keywords: ["cymatics", "sound visualization", "geometric", "experimental", "vibration"]

---

PRODUCT: Handmade ceramic mug with irregular glaze in earth tones

1. "Glaze Atlas"
   brief: "Extreme macro of the glaze surface — the crackle, the pooling, the color variation that makes this mug one-of-a-kind. Topography of craft."
   vibePrompt: "Extreme macro photograph of the ceramic mug's glaze surface, shot so close that the mug becomes an abstract landscape. The glaze reveals its geology: crackle lines like dry riverbeds, areas where pigment pooled thick and glossy against matte ridges, tiny pinholes from the kiln firing, a gradient from warm ochre to deep iron-brown where the glaze ran thin at the rim. Shot with a 100mm macro lens at f/2.8, razor-thin depth of field creates a sense of vast topography — in-focus crackle lines in the center with the glaze blurring into soft color fields at the edges. Single directional light rakes across the surface from camera-left, amplifying every texture. Color: ochre, iron oxide, cream, warm brown. The geological photography of Bernhard Edmaier applied to a handmade object. Every imperfection is the point."
   keywords: ["macro", "glaze", "texture", "topography", "craft"]

2. "Both Hands"
   brief: "Two hands cupping the mug, knuckles slightly white from the warmth. No face, no environment — just the universal gesture of holding something warm."
   vibePrompt: "Intimate close-up photograph of two hands wrapped around the ceramic mug, fingers interlocked, knuckles slightly tensed from gripping. We see from the wrists down — no face, no body, no environment. The hands are real and imperfect: visible veins, a small scar, short nails. Wisps of steam rise from the top edge of the mug into soft focus. Shot with a 50mm lens at f/2, shallow depth of field keeps the hands and mug sharp while the background falls to a warm, undefined blur. Soft overcast window light from above and slightly behind creates a gentle rim light on the knuckles and steam. Color: warm skin tones, earth-toned glaze, cream steam against a dark umber background. The quiet humanity of a Rinko Kawauchi photograph — small moments made sacred."
   keywords: ["hands", "warmth", "intimate", "steam", "human"]

3. "Kiln Room"
   brief: "Documentary shot of the mug still on the kiln shelf among others, in the potter's studio. Provenance — where this object was born."
   vibePrompt: "Documentary-style environmental photograph of the ceramic mug sitting on a kiln shelf inside a working pottery studio. The mug is among — but distinct from — other ceramic pieces in various stages of completion. The kiln's interior is visible behind: brick walls, element coils, a cone pack. Shelves of raw clay, glazing buckets, and tools fill the background. Natural light enters from a high window, mixing with the warm tungsten of a work lamp. Dust motes float in the light beam. Shot with a 35mm lens at f/4, the mug is in focus in the mid-ground while the studio context provides depth. Color: warm clay tones, kiln-brick red, dusty natural light, tool-steel grey. The workshop documentation of a Gentl & Hyers editorial — reverence for process without preciousness."
   keywords: ["documentary", "pottery studio", "kiln", "provenance", "process"]

4. "Poured Paint"
   brief: "The mug half-submerged in a pool of liquid glaze the same color as its own surface. Object and material merging — where does the mug end and the glaze begin?"
   vibePrompt: "Surreal conceptual photograph of the ceramic mug partially submerged in a shallow pool of liquid ceramic glaze that matches its own surface color. The mug sinks into its own material origin — the liquid glaze laps against the fired glaze, same pigment in two states. The liquid surface is mirror-still, reflecting the mug and creating a symmetry. Shot at eye level with a 50mm lens at f/5.6. A single large softbox from above creates a clean reflection in the liquid surface and gentle shadows on the mug. The background is seamless and neutral. Color: the earth tones of the mug's glaze — ochre, warm brown, cream — are the ONLY colors in the entire frame. The conceptual object photography of Carl Kleiner meets the material explorations of Ai Weiwei. Craft interrogating its own origins."
   keywords: ["surreal", "liquid glaze", "material origin", "reflection", "conceptual"]

5. "First Light, Last Sip"
   brief: "Diptych concept — same mug, same table, two moments: full and steaming in cold morning light, empty and stained in warm evening light. A day measured in one cup."
   vibePrompt: "A diptych photograph showing the same ceramic mug on the same wooden table in two states. LEFT FRAME: early morning, cool blue-white light streaming through a window, the mug full of dark coffee with visible steam rising, a folded newspaper beside it, the table surface catching hard angular shadows. RIGHT FRAME: same composition, golden hour evening light now warm and horizontal, the mug empty with a coffee ring stain visible inside, the newspaper now open and scattered, a pair of reading glasses folded on top. Shot with a 40mm lens at f/4, same framing for both. The mug is the constant; everything else shifts. LEFT color: cool blue-grey, dark coffee brown, crisp white. RIGHT color: warm amber, honey gold, soft shadow purple. The temporal storytelling of Rineke Dijkstra's portrait series — same frame, different time, meaning emerging from comparison."
   keywords: ["diptych", "time passage", "morning to evening", "ritual", "storytelling"]

---

PRODUCT: Luxury dive watch with titanium case and sapphire crystal

1. "Pressure Test"
   brief: "The watch submerged in dark water, air bubbles clinging to the crystal and bezel. Not a glamour shot — a proof shot. This object belongs in the deep."
   vibePrompt: "Underwater product photograph of the dive watch fully submerged in dark water, shot inside a controlled tank. Air bubbles cling to the sapphire crystal, the bezel edge, and the bracelet links — each bubble a tiny lens refracting light. The watch face is perfectly legible through the water, lume indices glowing faintly green. Shot with a macro lens through the glass tank wall, 100mm, f/5.6. A single strobe fires from above and behind the tank, creating caustic light patterns that dance across the titanium case. The water is dark but clear — deep ocean blue-black with the watch as the single illuminated object. Color: deep navy, titanium silver, lume green, bubble-white. The technical underwater photography of David Doubilet applied to a product shot. This is not a watch on a velvet pillow — it is a tool in its element."
   keywords: ["underwater", "submerged", "bubbles", "lume", "deep blue"]

2. "Titanium Grain"
   brief: "Macro so close you can see the brushed finish on the titanium case — individual grain lines catching light like a landscape of tiny valleys. The material IS the luxury."
   vibePrompt: "Extreme macro photograph of the watch case's brushed titanium surface, shot so close the metal grain becomes an abstract landscape of parallel lines catching directional light. The brushing pattern — applied by hand during finishing — creates a topography of microscopic ridges and valleys. Where the case curves, the grain shifts direction, creating visual borders like tectonic plates meeting. The sapphire crystal edge is visible at the top of frame, its polished surface a stark contrast to the brushed metal. Shot with a 100mm macro lens with extension tubes, f/4, incredibly shallow depth of field. Single hard light from a low angle rakes across the surface, turning every grain line into a bright filament. Color: cool titanium silver-grey with warm highlight streaks. The material-obsessed photography of Hiroshi Sugimoto's 'Mechanical Forms' — industrial precision revealed as beauty."
   keywords: ["macro", "titanium", "brushed finish", "grain", "material"]

3. "Summit Cairn"
   brief: "Wide mountain landscape at altitude — the watch resting on a cairn of stacked stones, snow peaks behind. The scale says: this is a tool for people who go to real places."
   vibePrompt: "Wide environmental photograph shot at high altitude. The dive watch sits atop a hiker's cairn — a small stack of flat stones — in the foreground, with a vast mountain panorama stretching behind. Snow-capped peaks, a glacier valley, wisps of cloud below the camera's elevation. The watch is small in the frame but unmistakable — its titanium catches the harsh high-altitude sunlight. Shot with a 24mm wide-angle lens at f/11, everything sharp from the stones to the distant peaks. The air is thin and clear, colors hyper-saturated by altitude: deep sky blue, snow white, warm stone tan, cool titanium. The watch doesn't dominate the landscape — it belongs to it. The adventure photography of Jimmy Chin meets the product placement restraint of a Patek Philippe print ad. The environment sells the capability."
   keywords: ["mountain", "altitude", "landscape", "adventure", "cairn"]

4. "Dial Noir"
   brief: "Ultra-tight crop of the watch face — just the dial, hands, and indices filling the frame. Noir lighting. The face as portrait."
   vibePrompt: "Tight portrait-style photograph of the watch dial filling the entire frame. Shot through the sapphire crystal with a macro lens, 100mm, f/4. The dial is the face — the hour markers are eyes, the hands tell a story. Dramatic chiaroscuro lighting: a single focused spot from 10 o'clock creates a bright crescent across the upper dial while the lower half falls into deep shadow. The luminous indices glow with their own faint light in the shadowed region. Every detail is visible: the texture of the dial surface (sunburst, matte, or grained), the polished edges of applied indices, the tiny text of the depth rating. The crystal's anti-reflective coating creates a faint purple sheen at the edge of frame. Color: dial color dominant (black, blue, or grey depending on the watch), silver-white for hands and indices, warm spot-light highlight. The dramatic object portraiture of Albert Watson — treating the inanimate with the reverence of a human portrait."
   keywords: ["dial", "portrait", "chiaroscuro", "noir", "close-up"]

5. "12 Hours"
   brief: "Typology grid — 12 photographs of the watch taken at each hour, same angle, as the hands move and the light changes. Time itself as the creative concept."
   vibePrompt: "A 4×3 typology grid of 12 photographs showing the same watch in the same position, shot from the same angle (overhead, flat) on the same grey concrete surface. Each frame is taken at a different hour: 1:00, 2:00, through 12:00. The ONLY changes between frames are the hand positions and the natural light — which shifts from cool blue pre-dawn, through warm morning gold, harsh midday white, amber afternoon, warm sunset orange, to deep blue twilight and black night (where only the lume glows). Each frame is identically composed: watch centered, 50mm lens, f/8. The grid format makes the hand movement and light progression impossible to ignore — time is literally visible across the series. Color: shifts with each frame following the natural light cycle. The serial typological work of Bernd and Hilla Becher meets the horological obsession of Hodinkee editorial — systematic, patient, revealing."
   keywords: ["typology", "grid", "time-lapse", "12 hours", "systematic"]

═══════════════════════════════════════
RULES
═══════════════════════════════════════
• Every direction must be DEEPLY specific to the product you are analyzing. Your Deep Read should be visible in every choice.
• The brief should read like it came from a real creative director briefing a photographer — opinionated, specific, decisive.
• vibePrompt must be dense enough for a photographer or AI image generator to execute directly — lens, light, color, composition, mood, reference.
• Titles must be evocative concepts, NEVER category labels. Re-read the title rules above before writing each title.
• The 5 directions must feel like they came from studying THIS product — not from a template applied to any product.
• If the user provides a brief, use it as the north star — all directions should serve the brief's intent, audience, and tone.

Also provide a productDescription: a precise visual description of the product (color, texture, logos, shape, materials, finish, size impression) detailed enough that someone who hasn't seen it could reconstruct its appearance in an image generation prompt. Focus on visual attributes only.`;

const productAnalysisSchema = {
  type: "object" as const,
  properties: {
    productName: { type: "string" as const },
    brandName: { type: "string" as const },
    visibleText: { type: "array" as const, items: { type: "string" as const } },
    logoDescription: { type: "string" as const },
    shape: { type: "string" as const },
    primaryColors: { type: "array" as const, items: { type: "string" as const } },
    materials: { type: "array" as const, items: { type: "string" as const } },
    sizeImpression: { type: "string" as const },
    category: { type: "string" as const },
    distinguishingFeatures: { type: "string" as const },
    visualDescription: { type: "string" as const },
  },
  required: [
    "productName", "brandName", "visibleText", "logoDescription", "shape",
    "primaryColors", "materials", "sizeImpression", "category",
    "distinguishingFeatures", "visualDescription",
  ],
};

const PRODUCT_ANALYSIS_PROMPT = `You are a product photographer's assistant cataloging a product for a shoot brief. Analyze the product image(s) carefully and extract:

- productName: The full product name as it appears on the packaging
- brandName: The brand name
- visibleText: ALL readable text on the product (labels, ingredients lists, taglines, etc.)
- logoDescription: Describe the logo (shape, colors, style)
- shape: The 3D form of the product (e.g. "cylindrical jar with screw-top lid")
- primaryColors: The dominant colors of the product and packaging
- materials: What the product appears to be made of (e.g. "plastic", "glass", "matte finish")
- sizeImpression: How big the product appears (e.g. "medium jar, fits in one hand")
- category: Product category (e.g. "skincare", "electronics", "beverage")
- distinguishingFeatures: What makes this product visually unique
- visualDescription: A full paragraph description detailed enough that someone who hasn't seen the product could reconstruct its appearance in an image generation prompt. Focus on visual attributes only.

Be precise and thorough. Read ALL text on the product.`;

export const analyzeProductVisuals = action({
  args: {
    imageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    if (!args.imageUrls || args.imageUrls.length === 0) {
      throw new Error("At least one image is required");
    }

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({ text: PRODUCT_ANALYSIS_PROMPT });

    for (const imageUrl of args.imageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: productAnalysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");

    return JSON.parse(text);
  },
});

const adaptInspirationSchema = {
  type: "object" as const,
  properties: {
    title: { type: "string" as const },
    brief: { type: "string" as const },
    vibePrompt: { type: "string" as const },
    keywords: {
      type: "array" as const,
      items: { type: "string" as const },
      maxItems: 5,
    },
  },
  required: ["title", "brief", "vibePrompt", "keywords"],
};

export const adaptInspirationPrompt = action({
  args: {
    templatePrompt: v.string(),
    userNote: v.optional(v.string()),
    productAnalysis: v.object({
      productName: v.string(),
      brandName: v.string(),
      visibleText: v.array(v.string()),
      logoDescription: v.string(),
      shape: v.string(),
      primaryColors: v.array(v.string()),
      materials: v.array(v.string()),
      sizeImpression: v.string(),
      category: v.string(),
      distinguishingFeatures: v.string(),
      visualDescription: v.string(),
    }),
    imageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({
      text: `You are an elite creative director adapting an inspiration prompt for a specific product.

TEMPLATE PROMPT (from inspiration gallery):
"${args.templatePrompt}"

USER'S PRODUCT DETAILS:
- Product: ${args.productAnalysis.productName} by ${args.productAnalysis.brandName}
- Shape: ${args.productAnalysis.shape}
- Colors: ${args.productAnalysis.primaryColors.join(", ")}
- Materials: ${args.productAnalysis.materials.join(", ")}
- Text on product: ${args.productAnalysis.visibleText.join(", ")}
- Logo: ${args.productAnalysis.logoDescription}
- Size: ${args.productAnalysis.sizeImpression}
- Category: ${args.productAnalysis.category}
- Visual description: ${args.productAnalysis.visualDescription}

YOUR TASK:
1. Identify all product-specific details in the template prompt (product name, shape, material, color, text/labels, category-specific references)
2. Replace them with the user's actual product details from the structured analysis above
3. PRESERVE the creative direction: lighting, composition, mood, setting, camera angles, artistic style
4. If the product category differs significantly (e.g. template is for a serum but user has earbuds), adapt environment/interaction references intelligently — keep the mood and aesthetic but adjust physical interactions to make sense
5. The vibePrompt output IS the adapted full prompt — it should be dense enough for a photographer or AI image generator to execute directly
${args.userNote ? `\nUSER INSTRUCTIONS (follow these closely — they override the default adaptation behavior):\n"${args.userNote}"\n` : ""}
Return:
- title: A 2-4 word evocative concept name that fits the adapted direction (not a category label)
- brief: 2-3 sentences briefing a photographer, specific to the user's product in this creative direction
- vibePrompt: The full adapted prompt with the user's product swapped in, preserving the template's creative direction
- keywords: Up to 5 keywords`,
    });

    for (const imageUrl of args.imageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: adaptInspirationSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");

    return JSON.parse(text) as {
      title: string;
      brief: string;
      vibePrompt: string;
      keywords: string[];
    };
  },
});

interface DirectionResult {
  title: string;
  brief: string;
  vibePrompt: string;
  keywords: string[];
}

export const analyzeProduct = action({
  args: {
    imageUrls: v.array(v.string()),
    brief: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    if (!args.imageUrls || args.imageUrls.length === 0) {
      throw new Error("At least one image is required");
    }

    // Build content parts
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    let textPart = SYSTEM_PROMPT;
    if (args.brief) {
      textPart += `\n\nUser brief: ${args.brief}`;
    }
    parts.push({ text: textPart });

    // Add images — convert URLs to data URLs if needed
    for (const imageUrl of args.imageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as {
      productDescription: string;
      directions: DirectionResult[];
    };

    return {
      productDescription: parsed.productDescription,
      directions: parsed.directions,
    };
  },
});

const promptBuilderSchema = {
  type: "object" as const,
  properties: {
    prompts: {
      type: "array" as const,
      items: { type: "string" as const },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ["prompts"],
};

export const buildDirectionPrompts = action({
  args: {
    title: v.string(),
    brief: v.string(),
    vibePrompt: v.string(),
    keywords: v.array(v.string()),
    productDescription: v.string(),
    referenceImageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({
      text: `You write image generation prompts for commercial product photography.

PRODUCT: ${args.productDescription}
DIRECTION: "${args.title}" — ${args.brief}
VIBE: ${args.vibePrompt}

Write exactly 4 image generation prompts. All 4 must faithfully execute the creative direction described above. They are 4 shots from the SAME photoshoot — same concept, same mood, same world — but each varies the composition:

1. The HERO shot — the most direct, iconic execution of this direction
2. A DETAIL variation — tighter crop or different angle, revealing texture or a specific element
3. A WIDER or CONTEXT variation — pulling back slightly or shifting perspective while staying in the same scene/concept
4. A MOMENT variation — capturing motion, process, or a fleeting instant within this direction

Each prompt should be 2-4 sentences. Be specific about what's in the frame, the lighting mood, and the color palette. Mention the product by its actual visual details.

EXAMPLE — Direction: "Sunday Morning Huevos" for an artisan hot sauce bottle:
1. "Eye-level photograph of a hand tilting the amber hot sauce bottle over a plate of huevos rancheros. The sauce is caught mid-pour in a thin ribbon. A broken egg yolk bleeds golden across black beans, a torn corn tortilla beside it. Warm morning window light from the left, rustic wooden table, color palette of ochre, terra cotta, and egg-yolk gold."
2. "Close-up of the hot sauce pooling into the broken egg yolk — amber sauce meeting bright yellow in a swirl. Shallow depth of field, only the pour point is sharp. The plate rim and a coffee mug are soft shapes in the background. Warm, intimate, tactile."
3. "Slightly wider shot of the full breakfast table from above — the plate with huevos rancheros at center, the hot sauce bottle standing beside it, a scuffed enamel mug of coffee, a crumpled napkin, toast crumbs. Everything is real and lived-in, not food-styled. Soft overhead morning light, muted warm tones."
4. "The moment just after the pour — a single drop of hot sauce falls from the bottle's lip toward the plate. The bottle is mid-tilt, slightly out of focus. The drop is frozen and sharp, catching light like amber. Dark background behind the hand, warm light on the plate below."

Notice: all 4 stay in the same world (breakfast table, morning light, the pour). They don't jump to a macro of the label or a pepper field — those would be different directions entirely.`,
    });

    // Add reference images
    for (const imageUrl of args.referenceImageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: promptBuilderSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as { prompts: string[] };
    return { prompts: parsed.prompts };
  },
});

const iterateSchema = {
  type: "object" as const,
  properties: {
    title: { type: "string" as const },
    brief: { type: "string" as const },
    vibePrompt: { type: "string" as const },
    keywords: {
      type: "array" as const,
      items: { type: "string" as const },
      maxItems: 5,
    },
  },
  required: ["title", "brief", "vibePrompt", "keywords"],
};

export const iterateDirection = action({
  args: {
    title: v.string(),
    brief: v.string(),
    vibePrompt: v.string(),
    keywords: v.array(v.string()),
    productDescription: v.string(),
    referenceImageUrls: v.array(v.string()),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({
      text: `You are an elite creative director iterating on a creative direction based on client feedback.

CURRENT DIRECTION:
- Title: ${args.title}
- Brief: ${args.brief}
- Vibe: ${args.vibePrompt}
- Keywords: ${args.keywords.join(", ")}

PRODUCT: ${args.productDescription}

CLIENT FEEDBACK / ITERATION REQUEST:
"${args.feedback}"

Based on this feedback, create a revised version of this creative direction. Keep what works, change what the client is asking for. The new direction should feel like a natural evolution — not a completely different concept (unless the feedback demands it).

Return a single revised creative direction with:
- title: Updated title reflecting the new angle (keep it short, 2-5 words)
- brief: Revised creative brief incorporating the feedback
- vibePrompt: Updated evocative description for AI image generation
- keywords: Up to 5 keywords reflecting the updated direction

Be specific and bold. Don't hedge or water down the direction — commit to the feedback fully.`,
    });

    // Add reference images
    for (const imageUrl of args.referenceImageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: iterateSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as {
      title: string;
      brief: string;
      vibePrompt: string;
      keywords: string[];
    };

    return parsed;
  },
});
