require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();

app.use(express.json({ limit: '6mb' }));
app.use(express.static('public'));

app.post('/api/analyze', async (req, res) => {
  const { imageBase64 } = req.body;
  
  if (!imageBase64) {
    return res.status(400).json({ error: 'No image supplied' });
  }

  // Extract base64 string without prefix (e.g., remove "data:image/jpeg;base64,")
  const base64Data = imageBase64.split(',')[1];

  const formData = new FormData();
  formData.append('api_key', process.env.FACEPP_API_KEY);
  formData.append('api_secret', process.env.FACEPP_API_SECRET);
  formData.append('image_base64', base64Data);

  try {
    const response = await fetch('https://api-us.faceplusplus.com/facepp/v1/skinanalyze', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server up on ${PORT}`));
