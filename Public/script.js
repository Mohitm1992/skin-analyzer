const video       = document.getElementById('video');
const canvas      = document.getElementById('canvas');
const snapBtn     = document.getElementById('snap');
const startBtn    = document.getElementById('startCam');
const fileInp     = document.getElementById('fileInput');
const preview     = document.getElementById('preview');
const results     = document.getElementById('results');
const loader      = document.getElementById('loader');
const summaryOut  = document.getElementById('summaryOut');
const recommendOut = document.getElementById('recommendOut');

// -- Camera workflow --
let stream = null;

startBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = stream;
    snapBtn.disabled = false;
  } catch (err) {
    alert('Camera access denied or not available.');
  }
});

snapBtn.addEventListener('click', () => {
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataURL = canvas.toDataURL('image/jpeg', 0.9);
  showPreviewAndAnalyze(dataURL);
});

// -- File upload workflow --
fileInp.addEventListener('change', () => {
  const file = fileInp.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    showPreviewAndAnalyze(e.target.result);
  };
  reader.readAsDataURL(file);
});

// -- Skincare recommendations and mappings --
const presenceMap = {
  0: 'None',
  1: 'Slight',
  2: 'Moderate',
  3: 'Severe'
};

const skinTypeMap = {
  0: 'Oily',
  1: 'Dry',
  2: 'Normal',
  3: 'Combination'
};

const recommendations = {
  acne: {
    0: "Good! No acne detected. Maintain regular gentle cleansing.",
    1: "Mild acne present. Consider salicylic acid cleansers and spot treatments with benzoyl peroxide.",
    2: "Moderate acne. Use gentle exfoliants and consult dermatologist for retinoid treatments.",
    3: "Severe acne detected. Seek professional advice for prescription treatment."
  },
  dark_circle: {
    0: "No dark circles detected.",
    1: "Mild dark circles. Try hydrating eye creams with caffeine or vitamin K.",
    2: "Moderate dark circles. Use targeted eye serums with antioxidants and ensure adequate sleep.",
    3: "Severe dark circles. Consider medical consultation for underlying causes."
  },
  skin_type: {
    'Oily': "Use lightweight, oil-free moisturizers and mattifying sunscreens to control shine.",
    'Dry': "Use rich, hydrating moisturizers containing hyaluronic acid or ceramides.",
    'Normal': "Maintain a balanced skincare routine with gentle cleansing and moisturizing.",
    'Combination': "Use targeted care: mattify oily zones and hydrate dry areas."
  }
};

// -- Generate readable summary from JSON data --
function generateReadableSummary(data) {
  if (!data || !data.result) return "No analysis data available.";

  const r = data.result;
  let summary = [];

  // Skin type
  const skinTypeCode = r.skin_type ? r.skin_type.skin_type : null;
  if (skinTypeCode !== null && skinTypeMap.hasOwnProperty(skinTypeCode)) {
    summary.push(`Your skin type is ${skinTypeMap[skinTypeCode]}.`);
  }

  // Acne
  const acne = r.acne ? presenceMap[r.acne.value] || 'Unknown' : 'Unknown';
  summary.push(`Acne level: ${acne}.`);

  // Dark circles
  const darkCircle = r.dark_circle ? presenceMap[r.dark_circle.value] || 'Unknown' : 'Unknown';
  summary.push(`Dark circles: ${darkCircle}.`);

  // Eye puffiness
  const eyePouch = r.eye_pouch ? presenceMap[r.eye_pouch.value] || 'Unknown' : 'Unknown';
  summary.push(`Eye puffiness: ${eyePouch}.`);

  // Wrinkles (forehead + crows feet + glabella)
  const foreheadWrinkle = r.forehead_wrinkle ? presenceMap[r.forehead_wrinkle.value] || 'Unknown' : 'Unknown';
  const crowFeet = r.crows_feet ? presenceMap[r.crows_feet.value] || 'Unknown' : 'Unknown';
  const glabellaWrinkle = r.glabella_wrinkle ? presenceMap[r.glabella_wrinkle.value] || 'Unknown' : 'Unknown';
  summary.push(`Wrinkles: Forehead (${foreheadWrinkle}), Crow's feet (${crowFeet}), Glabella (${glabellaWrinkle}).`);

  // Nasolabial folds
  const nasolabial = r.nasolabial_fold ? presenceMap[r.nasolabial_fold.value] || 'Unknown' : 'Unknown';
  summary.push(`Smile lines (nasolabial folds): ${nasolabial}.`);

  // Skin spots & blackheads
  const skinSpot = r.skin_spot ? presenceMap[r.skin_spot.value] || 'Unknown' : 'Unknown';
  const blackhead = r.blackhead ? presenceMap[r.blackhead.value] || 'Unknown' : 'Unknown';
  summary.push(`Skin spots: ${skinSpot}, Blackheads: ${blackhead}.`);

  return summary.join('\n');
}

// -- Generate skincare product & routine recommendations --
function generateRecommendations(data) {
  if (!data || !data.result) return "";

  const r = data.result;
  let recs = [];

  // Acne
  if (r.acne) {
    const level = r.acne.value;
    recs.push("Acne Care: " + recommendations.acne[level]);
  }

  // Dark circles
  if (r.dark_circle) {
    const level = r.dark_circle.value;
    recs.push("Dark Circles: " + recommendations.dark_circle[level]);
  }

  // Skin type care
  const skinTypeCode = r.skin_type ? r.skin_type.skin_type : null;
  const skinTypeName = skinTypeMap[skinTypeCode] || 'Unknown';
  if (skinTypeName !== 'Unknown') {
    recs.push("Skin Type Care: " + recommendations.skin_type[skinTypeName]);
  }

  return recs.join('\n\n');
}

// -- Show preview and analyze image --
async function showPreviewAndAnalyze(dataURL) {
  preview.src = dataURL;
  preview.classList.remove('hidden');
  results.classList.remove('hidden');
  loader.classList.remove('hidden');

  summaryOut.textContent = '';
  recommendOut.textContent = '';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataURL })
    });

    if (!res.ok) {
      throw new Error('Failed to get analysis from server');
    }

    const data = await res.json();

    loader.classList.add('hidden');

    // Display friendly summary and recommendations
    summaryOut.textContent = generateReadableSummary(data);
    recommendOut.textContent = generateRecommendations(data);

  } catch (err) {
    loader.classList.add('hidden');
    summaryOut.textContent = 'Error: ' + err.message;
    recommendOut.textContent = '';
  }
}
