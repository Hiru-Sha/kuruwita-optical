// ============================================================
//  aiAnalyze.js — AI frame photo analysis using Claude vision
//  POST /api/inventory/ai-analyze
//  Accepts: front_image, arm_image, tag_image (base64)
//  Returns: brand, model, color, frame_type, frame_shape,
//           frame_material, frame_size, sell_price, notes
// ============================================================
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const https   = require('https');

function callClaude(messages, max_tokens=600) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens,
      messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON from Claude')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function makeImageBlock(base64) {
  // Strip data URL prefix if present
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  const media = base64.includes('png') ? 'image/png' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: media, data } };
}

router.post('/ai-analyze', auth, async (req, res) => {
  const { front_image, arm_image, tag_image } = req.body;

  if (!front_image && !arm_image) {
    return res.status(400).json({ error: 'At least front or arm photo required' });
  }

  try {
    // Build message content with all provided images
    const content = [];

    if (front_image) {
      content.push(makeImageBlock(front_image));
      content.push({ type: 'text', text: 'This is the FRONT of the eyeglass frame.' });
    }
    if (arm_image) {
      content.push(makeImageBlock(arm_image));
      content.push({ type: 'text', text: 'This is the ARM/TEMPLE of the frame (shows brand name and model number).' });
    }
    if (tag_image) {
      content.push(makeImageBlock(tag_image));
      content.push({ type: 'text', text: 'This is the PRICE TAG of the frame.' });
    }

    content.push({
      type: 'text',
      text: `Analyze these eyeglass frame photos and extract all details.

Return ONLY valid JSON with these fields (no explanation, no markdown):
{
  "brand": "brand name if visible on arm, else empty string",
  "model": "model number/code if visible on arm (e.g. RB3025, CT6853), else empty string",
  "color": "frame color you can see (Black/Gold/Silver/Brown/Blue/Grey/Red/Green/Pink/Purple/Tortoise/Transparent/White/Rose Gold/Gunmetal)",
  "frame_type": "Full rim OR Half rim OR Rimless — based on front photo",
  "frame_shape": "Round/Oval/Rectangle/Square/Cat-eye/Aviator/Wayfarer/Butterfly — based on front photo",
  "frame_material": "Plastic/Metal/TR90/Titanium/Acetate/Mixed — based on appearance",
  "frame_size": "Small/Medium/Large — estimate from proportions",
  "sell_price": number or null if price tag not readable,
  "cost_price": null,
  "confidence": "High/Medium/Low",
  "notes": "any extra observations like special features, damage, or uncertain fields"
}`
    });

    const response = await callClaude([{ role: 'user', content }]);

    const text = response?.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse AI response');

    const result = JSON.parse(jsonMatch[0]);

    // Sanitize fields to match our dropdowns
    const COLORS    = ['Black','Gold','Silver','Brown','Blue','Grey','Red','Green','Pink','Purple','Tortoise','Transparent','White','Rose Gold','Gunmetal'];
    const TYPES     = ['Full rim','Half rim','Rimless'];
    const SHAPES    = ['Round','Oval','Rectangle','Square','Cat-eye','Aviator','Wayfarer','Butterfly','Hexagon','Geometric'];
    const MATERIALS = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
    const SIZES     = ['Small','Medium','Large','Extra Large'];

    const match = (val, list) => list.find(l => l.toLowerCase() === (val||'').toLowerCase()) || list.find(l => (val||'').toLowerCase().includes(l.toLowerCase())) || null;

    res.json({
      brand:          result.brand          || '',
      model:          result.model          || '',
      color:          match(result.color, COLORS)       || result.color || 'Black',
      frame_type:     match(result.frame_type, TYPES)   || 'Full rim',
      frame_shape:    match(result.frame_shape, SHAPES) || 'Rectangle',
      frame_material: match(result.frame_material, MATERIALS) || 'Plastic',
      frame_size:     match(result.frame_size, SIZES)   || 'Medium',
      sell_price:     result.sell_price ? parseFloat(result.sell_price) : null,
      cost_price:     null,
      confidence:     result.confidence    || 'Medium',
      notes:          result.notes         || '',
    });

  } catch(e) {
    console.error('AI analyze error:', e.message);
    res.status(500).json({ error: 'AI analysis failed: ' + e.message });
  }
});

module.exports = router;