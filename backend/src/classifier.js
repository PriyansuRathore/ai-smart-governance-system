const categories = {
  road: {
    keywords: ['road', 'pothole', 'street', 'pavement', 'traffic', 'highway', 'bridge', 'footpath', 'sidewalk', 'divider', 'tar', 'asphalt', 'crack', 'bump', 'jam', 'congestion', 'signal', 'zebra crossing', 'speed breaker', 'traffic jam', 'traffic signal'],
    department: 'Public Works Department',
  },
  water: {
    keywords: ['water', 'pipe', 'leak', 'drainage', 'flood', 'sewage', 'tap', 'supply', 'plumbing', 'drain', 'manhole', 'sewer', 'waterlog', 'pipeline'],
    department: 'Water Supply Department',
  },
  electricity: {
    keywords: ['electricity', 'power', 'light', 'electric', 'outage', 'wire', 'transformer', 'voltage', 'streetlight', 'cable', 'pole', 'sparking', 'current'],
    department: 'Electricity Department',
  },
  garbage: {
    keywords: ['garbage', 'waste', 'trash', 'litter', 'dump', 'sanitation', 'rubbish', 'bin', 'smell', 'dustbin', 'debris', 'compost'],
    department: 'Sanitation Department',
  },
  emergency: {
    keywords: ['accident', 'injured', 'bleeding', 'hurt', 'victim', 'crash', 'wounded', 'blood', 'ambulance', 'unconscious', 'collapsed person', 'person hit'],
    department: 'Emergency & Medical Services',
  },
  fire: {
    keywords: ['fire', 'burning', 'flame', 'smoke', 'blaze', 'explosion', 'burnt', 'on fire'],
    department: 'Fire Department',
  },
  building: {
    keywords: ['building', 'wall', 'collapse', 'collapsed', 'construction', 'structure', 'roof', 'ceiling', 'foundation', 'crack in wall', 'unsafe building'],
    department: 'Civil Engineering Department',
  },
  tree: {
    keywords: ['tree', 'branch', 'fallen tree', 'overgrown', 'uprooted', 'tree fell'],
    department: 'Parks & Horticulture Department',
  },
  animal: {
    keywords: ['dog', 'stray', 'animal', 'bite', 'cattle', 'cow', 'monkey', 'snake', 'carcass', 'stray dog', 'dog attack'],
    department: 'Animal Control Department',
  },
  public_property: {
    keywords: ['bench', 'bus stop', 'toilet', 'urinal', 'park', 'graffiti', 'vandalism', 'shelter', 'signboard', 'public property', 'broken bench'],
    department: 'Municipal Corporation',
  },
  pollution: {
    keywords: ['pollution', 'smoke', 'chemical', 'toxic', 'noise', 'factory', 'air quality', 'fumes', 'polluted', 'contamination'],
    department: 'Environment Department',
  },
};

const HIGH_PRIORITY_KEYWORDS = [
  'accident', 'injury', 'injured', 'dead', 'death', 'died', 'kill', 'killed',
  'fire', 'burning', 'explosion', 'collapse', 'collapsed', 'emergency',
  'flood', 'drowning', 'electrocution', 'shock', 'sparking', 'fallen wire',
  'high speed', 'hit', 'crash', 'bleeding', 'hospital', 'ambulance',
  'dangerous', 'fatal', 'severe', 'critical', 'urgent', 'immediate',
  'toxic', 'chemical', 'unconscious', 'snake bite', 'dog attack',
];

const MEDIUM_PRIORITY_KEYWORDS = [
  'broken', 'damaged', 'blocked', 'overflow', 'leaking', 'burst',
  'no water', 'no power', 'no electricity', 'outage', 'pothole',
  'stray', 'smell', 'dirty', 'contaminated', 'unsafe', 'hazard',
  'fallen tree', 'uprooted', 'graffiti', 'vandalism',
];

function detectPriority(text) {
  const lower = text.toLowerCase();
  if (HIGH_PRIORITY_KEYWORDS.some((kw) => lower.includes(kw))) return 'high';
  if (MEDIUM_PRIORITY_KEYWORDS.some((kw) => lower.includes(kw))) return 'medium';
  return 'low';
}

function classifyComplaint(text) {
  const lower = text.toLowerCase();
  let bestMatch = { category: 'other', department: 'General Administration', score: 0 };

  for (const [category, data] of Object.entries(categories)) {
    const score = data.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestMatch.score) {
      bestMatch = { category, department: data.department, score };
    }
  }

  return {
    category:   bestMatch.category,
    department: bestMatch.department,
    priority:   detectPriority(text),
  };
}

module.exports = { classifyComplaint };
