// ============================================================
//  aiAnalyze.js — Frame photo analysis using Google Vision API
//  POST /api/inventory/ai-analyze
//  Free tier: 1000 images/month
// ============================================================
const router = require('express').Router();
const auth   = require('../middleware/auth');
const https  = require('https');

function callVision(base64Image, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [
          { type: 'TEXT_DETECTION',     maxResults: 50 },
          { type: 'LABEL_DETECTION',    maxResults: 20 },
          { type: 'IMAGE_PROPERTIES',   maxResults: 5  },
          { type: 'OBJECT_LOCALIZATION',maxResults: 10 },
        ]
      }]
    });

    const options = {
      hostname: 'vision.googleapis.com',
      path:     `/v1/images:annotate?key=${apiKey}`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON from Vision API')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Extract clean text lines from Vision response
function extractText(visionRes) {
  const ann = visionRes?.responses?.[0]?.textAnnotations;
  if (!ann || !ann.length) return [];
  // First annotation is full text, rest are individual words
  const full = ann[0]?.description || '';
  return full.split('\n').map(l => l.trim()).filter(Boolean);
}

// Extract dominant colors
function extractColors(visionRes) {
  const props = visionRes?.responses?.[0]?.imagePropertiesAnnotation?.dominantColors?.colors || [];
  return props.slice(0,3).map(c => ({
    r: Math.round(c.color?.red||0),
    g: Math.round(c.color?.green||0),
    b: Math.round(c.color?.blue||0),
    score: c.score,
  }));
}

// Extract labels
function extractLabels(visionRes) {
  return (visionRes?.responses?.[0]?.labelAnnotations || []).map(l => l.description.toLowerCase());
}

// Map RGB to frame color name
function rgbToColorName(r, g, b) {
  const colors = [
    { name:'Black',       r:30,  g:30,  b:30  },
    { name:'White',       r:240, g:240, b:240 },
    { name:'Gold',        r:200, g:160, b:50  },
    { name:'Silver',      r:180, g:180, b:180 },
    { name:'Brown',       r:139, g:90,  b:43  },
    { name:'Tortoise',    r:150, g:100, b:40  },
    { name:'Blue',        r:30,  g:80,  b:180 },
    { name:'Red',         r:200, g:30,  b:30  },
    { name:'Pink',        r:220, g:120, b:140 },
    { name:'Purple',      r:120, g:60,  b:160 },
    { name:'Green',       r:40,  g:140, b:60  },
    { name:'Gunmetal',    r:80,  g:90,  b:100 },
    { name:'Rose Gold',   r:200, g:140, b:130 },
    { name:'Transparent', r:200, g:220, b:230 },
  ];
  let best = 'Black', bestDist = Infinity;
  colors.forEach(c => {
    const dist = Math.sqrt((r-c.r)**2 + (g-c.g)**2 + (b-c.b)**2);
    if (dist < bestDist) { bestDist = dist; best = c.name; }
  });
  return best;
}

// Guess frame shape from labels
function guessShape(labels) {
  if (labels.some(l => l.includes('aviator') || l.includes('teardrop'))) return 'Aviator';
  if (labels.some(l => l.includes('round') || l.includes('circle')))    return 'Round';
  if (labels.some(l => l.includes('oval')))                              return 'Oval';
  if (labels.some(l => l.includes('cat') || l.includes('wayfarer')))    return 'Cat-eye';
  if (labels.some(l => l.includes('square')))                            return 'Square';
  return 'Rectangle';
}

// Guess frame type from labels
function guessType(labels) {
  if (labels.some(l => l.includes('rimless') || l.includes('frameless'))) return 'Rimless';
  if (labels.some(l => l.includes('half')))                               return 'Half rim';
  return 'Full rim';
}

// Guess material from labels
function guessMaterial(labels) {
  if (labels.some(l => l.includes('metal') || l.includes('steel') || l.includes('titanium'))) return 'Metal';
  if (labels.some(l => l.includes('titanium'))) return 'Titanium';
  if (labels.some(l => l.includes('acetate'))) return 'Acetate';
  if (labels.some(l => l.includes('tr90') || l.includes('nylon'))) return 'TR90';
  return 'Plastic';
}

// Extract brand and model from text lines (arm photo)
function extractBrandModel(lines) {
  // Common optical brands
  const BRANDS = ['RayBan','Ray-Ban','Oakley','Gucci','Prada','Versace','Chanel','Dior',
    'Police','Carrera','Hugo Boss','Tommy Hilfiger','Calvin Klein','Emporio Armani',
    'Armani','Hellen Keller','Titan','Fastrack','Vincent Chase','Vogue','Persol',
    'Silhouette','Lindberg','Maui Jim','Costa','Wiley X','Bollé'];

  let brand = '', model = '';

  // Look for brand name in text
  for (const line of lines) {
    for (const b of BRANDS) {
      if (line.toLowerCase().includes(b.toLowerCase())) {
        brand = b;
        break;
      }
    }
    if (brand) break;
  }

  // Look for model number — alphanumeric codes like RB3025, CT6853-57-17, S1012
  const modelPattern = /\b([A-Z]{1,4}\d{3,6}[-\s]?\d{0,3}[-\s]?\d{0,3})\b/;
  for (const line of lines) {
    const match = line.match(modelPattern);
    if (match) { model = match[1].trim(); break; }
  }

  // If no brand found, use first meaningful line (2-20 chars, mostly letters)
  if (!brand) {
    for (const line of lines) {
      if (line.length >= 3 && line.length <= 25 && /^[A-Za-z\s&.-]+$/.test(line) && !/^\d+$/.test(line)) {
        brand = line;
        break;
      }
    }
  }

  return { brand, model };
}

// Extract price from tag photo
function extractPrice(lines) {
  for (const line of lines) {
    // Look for price patterns: Rs.8500, 8,500, Rs 8500, 8500.00
    const match = line.match(/(?:Rs\.?\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/);
    if (match) {
      const num = parseFloat(match[1].replace(/[,\s]/g, ''));
      if (num >= 100 && num <= 500000) return num; // Reasonable price range
    }
  }
  return null;
}

// ── Main route ────────────────────────────────────────────────
router.post('/ai-analyze', auth, async (req, res) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GOOGLE_VISION_API_KEY not set in Railway. Add it in Railway → Variables.'
    });
  }

  const { front_image, arm_image, tag_image } = req.body;
  if (!front_image && !arm_image) {
    return res.status(400).json({ error: 'At least front or arm photo required' });
  }

  try {
    // Strip data URL prefixes
    const strip = (b64) => b64 && (b64.includes(',') ? b64.split(',')[1] : b64);

    // Call Vision API for each provided image in parallel
    const calls = [];
    if (front_image) calls.push(callVision(strip(front_image), apiKey));
    else             calls.push(null);
    if (arm_image)   calls.push(callVision(strip(arm_image), apiKey));
    else             calls.push(null);
    if (tag_image)   calls.push(callVision(strip(tag_image), apiKey));
    else             calls.push(null);

    const [frontRes, armRes, tagRes] = await Promise.all(
      calls.map(c => c || Promise.resolve(null))
    );

    // Extract data from each image
    const frontLabels = frontRes ? extractLabels(frontRes) : [];
    const frontColors = frontRes ? extractColors(frontRes) : [];
    const armLines    = armRes   ? extractText(armRes)     : [];
    const tagLines    = tagRes   ? extractText(tagRes)     : [];

    // Also get text from front (may have brand printed on front)
    const frontLines  = frontRes ? extractText(frontRes)   : [];

    // Combine arm + front text for brand/model detection
    const allLines = [...armLines, ...frontLines];
    const { brand, model } = extractBrandModel(allLines);

    // Color from dominant color of front image
    const color = frontColors.length
      ? rgbToColorName(frontColors[0].r, frontColors[0].g, frontColors[0].b)
      : 'Black';

    // Shape, type, material from labels
    const shape    = guessShape(frontLabels);
    const type     = guessType(frontLabels);
    const material = guessMaterial(frontLabels);

    // Price from tag
    const price = tagRes ? extractPrice(tagLines) : null;

    // Confidence based on how much we found
    const found = [brand, model, color !== 'Black' || frontColors.length].filter(Boolean).length;
    const confidence = found >= 2 ? 'High' : found === 1 ? 'Medium' : 'Low';

    const notes = [];
    if (!brand) notes.push('Brand not detected — check arm photo');
    if (!model) notes.push('Model number not found — may not be visible');
    if (!price && tag_image) notes.push('Price not readable from tag');

    res.json({
      brand,
      model,
      color,
      frame_type:     type,
      frame_shape:    shape,
      frame_material: material,
      frame_size:     'Medium',
      sell_price:     price,
      cost_price:     null,
      confidence,
      notes: notes.join(' · ') || 'Analysis complete',
      // Debug info
      _detected_text: armLines.slice(0,5),
    });

  } catch(e) {
    console.error('Vision API error:', e.message);
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

module.exports = router;