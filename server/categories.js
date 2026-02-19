/**
 * Briants Product Categories
 * Structured tree with keyword matching for auto-suggestion
 */

const categoryTree = [
    {
        name: "Arborist Equipment",
        keywords: ["arborist", "tree", "climbing", "rigging", "rope"],
        children: [
            { name: "Accessories", keywords: ["accessory", "accessories"] },
            { name: "Arborist Machinery", keywords: ["arborist machinery", "winch"] },
            { name: "Arborist Ropes - Climbing & Lowering", keywords: ["rope", "climbing rope", "lowering rope"] },
            { name: "Ascenders and Descenders", keywords: ["ascender", "descender"] },
            { name: "Books and Literature for Tree Workers", keywords: ["book", "literature", "guide"] },
            { name: "Cambium Savers", keywords: ["cambium", "saver"] },
            { name: "Climbing Carabiners and Connectors", keywords: ["carabiner", "connector", "karabiner"] },
            { name: "Climbing Gloves", keywords: ["climbing glove"] },
            { name: "Climbing Kit Bags", keywords: ["kit bag", "climbing bag", "rope bag"] },
            { name: "Fall Arresters", keywords: ["fall arrest", "fall protection"] },
            { name: "Fliplines, Lanyards & Accessories", keywords: ["flipline", "lanyard", "work positioning"] },
            { name: "Lifting Slings", keywords: ["lifting sling", "sling"] },
            { name: "Lowering Devices", keywords: ["lowering device", "bollard", "portawrap"] },
            { name: "Prusik Rope - Accessory Cords and Slings", keywords: ["prusik", "accessory cord", "sling"] },
            { name: "Pulleys", keywords: ["pulley", "block"] },
            { name: "Rigging", keywords: ["rigging", "rigging plate", "ring"] },
            { name: "Spare Parts", keywords: ["spare", "replacement part"] },
            { name: "Swivels", keywords: ["swivel"] },
            { name: "Throw lines - Bags and Catapults", keywords: ["throw line", "throwline", "throw bag", "catapult", "big shot"] },
            { name: "Tool Strops", keywords: ["tool strop", "strop", "tool lanyard"] },
            { name: "Tree Climbing Harnesses", keywords: ["harness", "climbing harness", "saddle"] },
            { name: "Tree Climbing Spikes", keywords: ["climbing spike", "spike", "gaff", "spur"] }
        ]
    },
    {
        name: "Brand",
        keywords: [],
        children: [
            { name: "Bayer Garden", keywords: ["bayer"] },
            { name: "Castle Clothing", keywords: ["castle"] },
            { name: "Cofra", keywords: ["cofra"] },
            { name: "DeWalt", keywords: ["dewalt"] },
            { name: "DMM", keywords: ["dmm"] },
            { name: "Duracell", keywords: ["duracell"] },
            { name: "Forgefix", keywords: ["forgefix"] },
            { name: "Gripple", keywords: ["gripple"] },
            { name: "Matabi", keywords: ["matabi"] },
            { name: "Rutland Electric Fencing", keywords: ["rutland"] },
            { name: "Viking", keywords: ["viking"] },
            { name: "Weedol", keywords: ["weedol"] },
            { name: "Wilkinson Sword", keywords: ["wilkinson"] }
        ]
    },
    {
        name: "CLEARANCE",
        keywords: ["clearance", "sale", "discount"],
        children: []
    },
    {
        name: "Clothing and Merchandise",
        keywords: ["clothing", "merch", "apparel", "wear"],
        children: [
            { name: "Clothing", keywords: ["clothing", "clothes"] },
            { name: "Hats and Baseball Caps", keywords: ["hat", "cap", "baseball cap"] },
            { name: "Hoodies and Jumpers", keywords: ["hoodie", "jumper", "sweatshirt"] },
            { name: "Jackets", keywords: ["jacket", "coat"] },
            { name: "Novelty Plaques", keywords: ["plaque", "novelty", "sign"] },
            { name: "Stihl Kids", keywords: ["stihl kids", "children"] },
            { name: "STIHL Merchandise", keywords: ["stihl merch", "stihl merchandise"] },
            { name: "T-Shirts", keywords: ["t-shirt", "tshirt", "tee"] }
        ]
    },
    {
        name: "Fencing and Landscaping",
        keywords: ["fence", "fencing", "landscape", "landscaping", "garden"],
        children: [
            { name: "Aggregates & Garden Gravel", keywords: ["aggregate", "gravel", "stone", "pebble"] },
            { name: "Agricultural Farm Fencing", keywords: ["agricultural fence", "farm fence"] },
            { name: "Artificial Grass", keywords: ["artificial grass", "fake grass", "astro"] },
            { name: "Chainlink Fencing", keywords: ["chainlink", "chain link"] },
            { name: "Cladding", keywords: ["cladding", "clad"] },
            { name: "Closeboard Fencing", keywords: ["closeboard", "close board"] },
            { name: "Composite Decking", keywords: ["composite deck", "composite board"] },
            { name: "Concrete Fencing", keywords: ["concrete fence", "concrete post"] },
            { name: "Decking Supplies", keywords: ["decking", "deck board", "deck screw", "joist"] },
            { name: "Durapost Fencing", keywords: ["durapost"] },
            { name: "Electric Fencing", keywords: ["electric fence", "energiser", "electric fencing"] },
            { name: "Fence Panels", keywords: ["fence panel", "panel"] },
            { name: "Fence Post Caps and Finials", keywords: ["post cap", "finial"] },
            { name: "Fence Posts", keywords: ["fence post", "timber post"] },
            { name: "Fencing Accessories", keywords: ["fencing accessories", "post fix", "bracket"] },
            { name: "Gates", keywords: ["gate", "garden gate", "side gate"] },
            { name: "Gravel Boards", keywords: ["gravel board"] },
            { name: "Landscaping and Fencing Tools", keywords: ["landscaping tool", "fencing tool", "post hole"] },
            { name: "Paving", keywords: ["paving", "patio", "slab"] },
            { name: "Picket Fence Materials", keywords: ["picket", "picket fence"] },
            { name: "Post and Rail Fence", keywords: ["post and rail", "rail fence"] },
            { name: "Postcrete and Cement", keywords: ["postcrete", "cement", "concrete mix"] },
            { name: "Rails", keywords: ["rail", "arris rail"] },
            { name: "Sheds and Structures", keywords: ["shed", "summerhouse", "log cabin", "structure"] },
            { name: "Sleepers", keywords: ["sleeper", "railway sleeper"] },
            { name: "Trellis Panels", keywords: ["trellis"] },
            { name: "Wire and Stock Fencing", keywords: ["wire fence", "stock fence", "wire mesh"] },
            { name: "Wood Treatments and Preservatives", keywords: ["wood treatment", "preservative", "stain", "oil", "protector"] },
            { name: "Wooden Stakes and Round Rails", keywords: ["stake", "round rail", "wooden stake"] }
        ]
    },
    {
        name: "Forestry & Agricultural",
        keywords: ["forestry", "agricultural", "woodland", "tree felling"],
        children: [
            { name: "Agricultural Tools", keywords: ["agricultural tool"] },
            { name: "Billhooks - Hedge Laying Tools", keywords: ["billhook", "hedge laying"] },
            { name: "Hay and Manure Forks", keywords: ["hay fork", "manure fork", "pitchfork"] },
            { name: "Scythes", keywords: ["scythe"] },
            { name: "Slashers", keywords: ["slasher"] },
            { name: "Axes", keywords: ["axe", "splitting axe", "felling axe", "hatchet"] },
            { name: "Chainsaw Mills for Timber Milling", keywords: ["chainsaw mill", "timber mill", "milling", "alaskan"] },
            { name: "Drag Tools", keywords: ["drag tool", "log drag", "timber jack", "cant hook", "peavey"] },
            { name: "Felling Wedges", keywords: ["felling wedge", "wedge"] },
            { name: "Forestry Accessories", keywords: ["forestry accessory"] },
            { name: "Measuring - Surveying and Marking out", keywords: ["measuring", "survey", "marking", "tape", "diameter"] },
            { name: "Replacement Handles", keywords: ["replacement handle", "handle"] },
            { name: "Saw Horses", keywords: ["saw horse", "sawhorse", "log horse"] },
            { name: "Sawpod", keywords: ["sawpod"] },
            { name: "SILKY Saws", keywords: ["silky", "silky saw"] }
        ]
    },
    {
        name: "Garden Machinery",
        keywords: ["machinery", "machine", "engine", "motor", "power tool"],
        children: [
            { name: "Augers and Accessories", keywords: ["auger", "earth auger", "post hole borer"] },
            {
                name: "Chainsaws and Accessories",
                keywords: ["chainsaw"],
                children: [
                    { name: "Chainsaw Accessories", keywords: ["chainsaw accessory", "chainsaw case", "chainsaw bag"] },
                    { name: "Chainsaw Bar & Chain Cut-Kits", keywords: ["cut kit", "bar and chain", "bar & chain"] },
                    { name: "Chainsaw Guide Bars", keywords: ["guide bar", "chainsaw bar"] },
                    {
                        name: "Chainsaw Chains",
                        keywords: ["chainsaw chain", "chain"],
                        children: [
                            { name: "Full Chisel Chains", keywords: ["full chisel"] },
                            { name: "Milling Chains", keywords: ["milling chain", "ripping chain"] },
                            { name: "Semi Chisel Chains", keywords: ["semi chisel"] }
                        ]
                    },
                    { name: "Cordless Chainsaws", keywords: ["cordless chainsaw", "battery chainsaw"] },
                    { name: "Electric Chainsaws", keywords: ["electric chainsaw"] },
                    { name: "Petrol Chainsaws for Agriculture", keywords: ["petrol chainsaw agriculture", "farm chainsaw"] },
                    { name: "Petrol Chainsaws for Domestic Use", keywords: ["petrol chainsaw domestic", "home chainsaw"] },
                    { name: "Petrol Chainsaws for Forestry", keywords: ["petrol chainsaw forestry", "professional chainsaw"] },
                    { name: "Professional Arborist Chainsaws", keywords: ["arborist chainsaw", "top handle chainsaw"] }
                ]
            },
            { name: "Chipper Shredders", keywords: ["chipper", "shredder", "garden shredder"] },
            { name: "Construction", keywords: ["construction", "cut off saw", "disc cutter"] },
            {
                name: "Consumables",
                keywords: ["consumable"],
                children: [
                    { name: "Engine Oils", keywords: ["engine oil", "2 stroke oil", "two stroke", "4 stroke oil", "chain oil"] },
                    { name: "Files and Handles", keywords: ["file", "chainsaw file", "round file", "flat file"] },
                    { name: "Lubricants & Cleaners", keywords: ["lubricant", "cleaner", "resin", "degreaser"] },
                    { name: "Pre Mixed Fuel", keywords: ["pre mixed fuel", "premixed", "aspen", "motomix"] },
                    { name: "Service Kits", keywords: ["service kit", "tune up kit", "maintenance kit"] }
                ]
            },
            {
                name: "Trimmer Line & Blades",
                keywords: ["trimmer line", "strimmer line", "trimmer blade"],
                children: [
                    { name: "AutoCut Heads", keywords: ["autocut"] },
                    { name: "Brushcutter Blades", keywords: ["brushcutter blade", "brush cutter blade"] },
                    { name: "DuroCut Heads", keywords: ["durocut"] },
                    { name: "Polycut Blades & Heads", keywords: ["polycut"] },
                    { name: "Supercut Heads", keywords: ["supercut"] },
                    { name: "Trimmer Line", keywords: ["trimmer line", "strimmer line", "nylon line"] },
                    { name: "Trimmer Spools", keywords: ["trimmer spool", "spool"] }
                ]
            },
            {
                name: "Cordless Garden Machinery",
                keywords: ["cordless", "battery"],
                children: [
                    { name: "Cordless Accessories", keywords: ["cordless accessory", "battery", "charger"] },
                    { name: "Hayter & Toro Cordless", keywords: ["hayter cordless", "toro cordless"] },
                    { name: "Honda Cordless", keywords: ["honda cordless"] },
                    { name: "STIHL AI Line - Small Gardens", keywords: ["stihl ai", "ai system"] },
                    { name: "STIHL AK - Sm, Med & Lge Gardens", keywords: ["stihl ak", "ak system"] },
                    { name: "STIHL AP - Large Gardens & Professional", keywords: ["stihl ap", "ap system"] },
                    { name: "STIHL AS - Small Handheld", keywords: ["stihl as", "as system"] }
                ]
            },
            { name: "Garden Machinery Sale", keywords: ["machinery sale"] },
            {
                name: "Grass Trimmers and Brushcutters",
                keywords: ["trimmer", "brushcutter", "strimmer", "grass trimmer"],
                children: [
                    { name: "Bike Handle Brushcutters", keywords: ["bike handle", "bull handle"] },
                    { name: "Cordless Trimmers & Brushcutters", keywords: ["cordless trimmer", "battery trimmer"] },
                    { name: "Electric Grass Trimmers", keywords: ["electric trimmer"] },
                    { name: "Loop Handle Grass Trimmers", keywords: ["loop handle"] },
                    { name: "Professional Back Pack Brushcutters", keywords: ["backpack brushcutter", "back pack"] },
                    { name: "Professional Clearing Saws", keywords: ["clearing saw"] },
                    { name: "Wheeled Grass Trimmers", keywords: ["wheeled trimmer"] }
                ]
            },
            { name: "Hedge Trimmers", keywords: ["hedge trimmer", "hedge cutter"] },
            { name: "Kombi System - Stihl", keywords: ["kombi", "kombisystem", "kombi tool"] },
            { name: "Lawn Mowers", keywords: ["lawn mower", "mower", "lawnmower"] },
            {
                name: "Lawn Mowers - Robotic",
                keywords: ["robotic mower", "robot mower", "automower", "imow"],
                children: [
                    { name: "Robotic Mower Accessories", keywords: ["robotic mower accessory", "robotic accessory"] },
                    { name: "Robotic Mowers", keywords: ["robotic mower", "robot mower"] }
                ]
            },
            { name: "Leaf Blowers and Vacuum Shredders", keywords: ["leaf blower", "blower", "vacuum shredder", "garden vac"] },
            { name: "Log Splitters", keywords: ["log splitter", "wood splitter"] },
            {
                name: "Machine Accessories",
                keywords: ["machine accessory"],
                children: [
                    { name: "Grass Trimmer & Brushcutter Accessories", keywords: ["trimmer accessory", "guard", "shoulder harness"] },
                    { name: "Hedge Trimmer Accessories", keywords: ["hedge trimmer accessory"] },
                    { name: "Maintenance Tools and Accessories", keywords: ["maintenance tool", "grease gun", "spark plug wrench"] }
                ]
            },
            { name: "Mixers - Cement Mixers", keywords: ["mixer", "cement mixer", "concrete mixer", "belle"] },
            { name: "Multi System - Stihl", keywords: ["multi system", "multisystem"] },
            { name: "Petrol Post Driver", keywords: ["post driver", "post knocker", "post rammer"] },
            { name: "Pole Pruners", keywords: ["pole pruner", "pole saw", "high pruner"] },
            {
                name: "Pressure Washers",
                keywords: ["pressure washer", "power washer", "jet wash"],
                children: [
                    { name: "Electric Pressure Washers", keywords: ["electric pressure washer"] },
                    { name: "Pressure Washer Attachments", keywords: ["pressure washer attachment", "lance", "nozzle", "surface cleaner"] },
                    { name: "Pressure Washer Fluids", keywords: ["pressure washer fluid", "detergent", "cleaning fluid"] }
                ]
            },
            { name: "Scarifiers", keywords: ["scarifier", "lawn scarifier"] },
            {
                name: "Spares and Parts",
                keywords: ["spare", "part", "replacement"],
                children: [
                    { name: "Briggs & Stratton Parts", keywords: ["briggs", "stratton"] },
                    { name: "Hayter Parts", keywords: ["hayter part"] },
                    { name: "Honda Parts", keywords: ["honda part"] },
                    { name: "Kawasaki Parts", keywords: ["kawasaki"] },
                    { name: "MTD Parts", keywords: ["mtd"] },
                    { name: "Sharpening/Grinding Parts", keywords: ["sharpening", "grinding", "grinder"] },
                    { name: "Spark Plugs", keywords: ["spark plug", "ngk", "bosch plug"] },
                    { name: "Toro Parts", keywords: ["toro part"] },
                    { name: "Wheelbarrow Parts", keywords: ["wheelbarrow part", "barrow wheel", "barrow tyre"] }
                ]
            },
            { name: "Spreaders", keywords: ["spreader", "fertiliser spreader", "salt spreader"] },
            { name: "Tillers and Rotovators", keywords: ["tiller", "rotovator", "rotavator", "cultivator"] },
            { name: "Versatool system - Honda", keywords: ["versatool", "honda versatool"] },
            { name: "Wet and Dry Vacuum Cleaners", keywords: ["wet and dry", "vacuum cleaner", "shop vac"] }
        ]
    },
    {
        name: "Gardening Products",
        keywords: ["garden", "gardening"],
        children: [
            { name: "Bins and Incinerators", keywords: ["bin", "incinerator", "garden bin"] },
            { name: "Compost and Bark", keywords: ["compost", "bark", "mulch", "soil"] },
            { name: "Digging Tools", keywords: ["digging", "spade", "fork", "shovel"] },
            { name: "Garden Sundries", keywords: ["sundries", "garden sundry", "twine", "tie"] },
            { name: "Garden Tool and Blade Sharpening", keywords: ["sharpening", "sharpener", "whetstone"] },
            { name: "Hoses - Watering and Sprayers", keywords: ["hose", "watering", "sprayer", "spray"] },
            { name: "Landscape Fabrics and Fruit Cage Netting", keywords: ["landscape fabric", "weed membrane", "netting", "fruit cage"] },
            { name: "Pest Control", keywords: ["pest control", "mouse", "rat", "trap", "mole"] },
            { name: "Plant Feeds and Lawn Care", keywords: ["plant feed", "lawn feed", "fertiliser", "lawn care", "grass seed"] },
            {
                name: "Pruning Tools",
                keywords: ["pruning", "prune", "cut"],
                children: [
                    { name: "Extending Pole Saws", keywords: ["pole saw", "extending saw"] },
                    { name: "Hedge & Lawn Shears", keywords: ["hedge shear", "lawn shear", "shears"] },
                    { name: "Loppers", keywords: ["lopper", "loppers"] },
                    { name: "Pruning Saws", keywords: ["pruning saw", "folding saw"] },
                    { name: "Secateurs", keywords: ["secateur", "secateurs", "bypass", "anvil"] }
                ]
            },
            { name: "Rakes - Brooms and Brushes", keywords: ["rake", "broom", "brush", "leaf rake"] },
            { name: "Replacement Tree Lopper Springs and Parts", keywords: ["lopper spring", "lopper part", "replacement spring"] },
            { name: "Sacks and Bags", keywords: ["sack", "rubble sack", "garden bag", "tonne bag"] },
            { name: "Tree Guards and Ties", keywords: ["tree guard", "tree tie", "tree shelter", "spiral guard"] },
            { name: "Weed Killers and Tree Stump Killers", keywords: ["weed killer", "herbicide", "stump killer", "roundup", "glyphosate"] },
            { name: "Wheel Barrows", keywords: ["wheelbarrow", "barrow"] },
            { name: "Wolf Garten Tools", keywords: ["wolf garten", "wolf-garten", "multi-star"] }
        ]
    },
    {
        name: "Hardware and DIY",
        keywords: ["hardware", "diy", "fixing", "screw", "nail"],
        children: [
            { name: "Clips and Brackets for Fencing", keywords: ["clip", "bracket", "fence clip"] },
            { name: "DIY Tools", keywords: ["diy tool", "hand tool"] },
            { name: "Drill & Screwdriver Bits", keywords: ["drill bit", "screwdriver bit", "driver bit"] },
            { name: "Farm and Entrance Gate Fixings", keywords: ["gate fixing", "hinge", "latch", "gate furniture"] },
            { name: "Glue and Adhesive Tape", keywords: ["glue", "adhesive", "tape", "sealant"] },
            { name: "Hinges and Latches for Garden Gates", keywords: ["hinge", "latch", "gate hinge", "t-hinge"] },
            {
                name: "Ladders",
                keywords: ["ladder"],
                children: [
                    { name: "Access and Work Platforms", keywords: ["platform", "scaffold", "work platform"] },
                    { name: "Combination Ladders", keywords: ["combination ladder"] },
                    { name: "Extending Ladders", keywords: ["extending ladder", "extension ladder"] },
                    { name: "Lightweight Tripod Ladder", keywords: ["tripod ladder"] },
                    { name: "Platform Steps", keywords: ["platform step", "step ladder"] }
                ]
            },
            { name: "Masonry Fixings", keywords: ["masonry", "wall plug", "anchor", "rawl"] },
            { name: "Miscellaneous", keywords: ["misc", "miscellaneous"] },
            { name: "Padlocks and Locking Bolts", keywords: ["padlock", "lock", "locking bolt"] },
            { name: "Screws - Nails - Bolts and Staples", keywords: ["screw", "nail", "bolt", "staple", "coach bolt"] },
            { name: "Sheet Roofing & Accessories", keywords: ["roofing", "corrugated", "bitumen", "roof sheet"] }
        ]
    },
    {
        name: "Mauls and Hatchets",
        keywords: ["maul", "hatchet", "splitting maul", "kindling"],
        children: []
    },
    {
        name: "Milwaukee",
        keywords: ["milwaukee", "m18", "m12"],
        children: []
    },
    {
        name: "PPE & Safety",
        keywords: ["ppe", "safety", "protection", "protective"],
        children: [
            { name: "Arborist Climbing Helmets", keywords: ["climbing helmet", "arborist helmet", "tree helmet", "petzl", "kask"] },
            { name: "Brushcutter Trousers", keywords: ["brushcutter trouser"] },
            {
                name: "Chainsaw Protective Clothing",
                keywords: ["chainsaw protective", "chainsaw clothing"],
                children: [
                    { name: "Chainsaw Boots", keywords: ["chainsaw boot"] },
                    { name: "Chainsaw Gloves", keywords: ["chainsaw glove"] },
                    { name: "Chainsaw Trousers", keywords: ["chainsaw trouser", "class 1", "class 2", "type a", "type c"] }
                ]
            },
            { name: "Ear Protection", keywords: ["ear protection", "ear defender", "ear muff", "ear plug", "hearing"] },
            { name: "First Aid", keywords: ["first aid", "first aid kit", "plaster", "bandage"] },
            { name: "Footwear and Accessories", keywords: ["footwear", "boot", "shoe", "wellington", "safety boot"] },
            { name: "Gloves", keywords: ["glove", "work glove", "rigger"] },
            { name: "Ground working helmets", keywords: ["ground helmet", "hard hat", "safety helmet"] },
            { name: "Hi Vis Clothing", keywords: ["hi vis", "high visibility", "hi-vis", "hiviz", "fluorescent"] },
            { name: "Insulated Digging Tools", keywords: ["insulated", "insulated tool"] },
            { name: "Safety Glasses", keywords: ["safety glasses", "safety goggles", "eye protection"] },
            { name: "Safety Signs", keywords: ["safety sign", "warning sign"] },
            { name: "Torches & Headlamps", keywords: ["torch", "headlamp", "flashlight", "head torch"] }
        ]
    },
    {
        name: "Professional Lawn Mowers",
        keywords: ["professional mower", "commercial mower"],
        children: []
    },
    {
        name: "Real Deals for You",
        keywords: ["real deal", "offer", "bundle"],
        children: []
    },
    {
        name: "Safety Signs & PPE",
        keywords: ["safety sign", "ppe sign"],
        children: []
    },
    {
        name: "Seasonal Products",
        keywords: ["seasonal", "winter", "summer"],
        children: [
            { name: "Charcoal and BBQ", keywords: ["charcoal", "bbq", "barbecue", "briquette"] },
            { name: "Coal and Logs", keywords: ["coal", "log", "firewood", "kindling", "smokeless"] },
            { name: "Ice Scrapers", keywords: ["ice scraper"] },
            { name: "Rock Salt", keywords: ["rock salt", "grit", "de-icing salt"] },
            { name: "Screenwash and De Icer", keywords: ["screenwash", "de-icer", "deicer", "antifreeze"] }
        ]
    }
];

/**
 * Flatten the category tree into a list with full paths
 */
function flattenCategories(tree, parentPath = '') {
    const result = [];
    for (const cat of tree) {
        const fullPath = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
        result.push({
            name: cat.name,
            path: fullPath,
            keywords: cat.keywords || []
        });
        if (cat.children && cat.children.length > 0) {
            result.push(...flattenCategories(cat.children, fullPath));
        }
    }
    return result;
}

const flatCategories = flattenCategories(categoryTree);

/**
 * Suggest categories based on product name and description
 * Returns an array of { path, score } sorted by relevance
 */
export function suggestCategories(name, description = '') {
    const text = `${name} ${description}`.toLowerCase();
    const scored = [];

    for (const cat of flatCategories) {
        let score = 0;
        for (const kw of cat.keywords) {
            if (text.includes(kw.toLowerCase())) {
                // Longer keyword matches are more specific and score higher
                score += kw.length;
            }
        }
        if (score > 0) {
            scored.push({ path: cat.path, name: cat.name, score });
        }
    }

    // Sort by score descending, take top 8
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8);
}

/**
 * Get all categories as a flat list of paths (for the UI dropdown)
 */
export function getAllCategories() {
    return flatCategories.map(c => c.path);
}

export default categoryTree;
