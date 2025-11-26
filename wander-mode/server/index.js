// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GOOGLE_KEY = process.env.GOOGLE_KEY;


function randomCoords() {
  const cities = [
    { lat: 40.7128, lng: -74.006 },      // New York
    { lat: 43.65107, lng: -79.347015 },  // Toronto
    { lat: 48.8566, lng: 2.3522 },       // Paris
    { lat: 35.6762, lng: 139.6503 },     // Tokyo
    { lat: 41.9028, lng: 12.4964 },      // Rome
    { lat: 51.5074, lng: -0.1278 },      // London
  ];
  const index = Math.floor(Math.random() * cities.length);
  return cities[index];
}

// 1) TELEPORT 
app.get("/teleport", (req, res) => {
  const coord = randomCoords();
  console.log("Teleporting to:", coord);
  res.json(coord);
});

// 2) STREET VIEW 
app.get("/streetview", (req, res) => {
  const { lat, lng } = req.query;

  if (!GOOGLE_KEY) {
    console.error("Missing GOOGLE_KEY");
    return res.status(500).json({ error: "Missing GOOGLE_KEY in .env" });
  }
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const url = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_KEY}&location=${lat},${lng}&heading=210&pitch=10&fov=80`;

  res.json({ url });
});


function getFallbackPlaces(lat, lng) {
  const baseLat = Number(lat) || 0;
  const baseLng = Number(lng) || 0;

  return [
    {
      id: "fallback-1",
      name: "Sample Café",
      distance: 200,
      address: "123 Example Street",
      categories: "cafe",
      lat: baseLat,
      lng: baseLng,
    },
    {
      id: "fallback-2",
      name: "Neighbourhood Coffee",
      distance: 450,
      address: "456 Demo Avenue",
      categories: "coffee_shop",
      lat: baseLat,
      lng: baseLng,
    },
  ];
}

// 3) PLACES
app.get("/places", async (req, res) => {
  const { lat, lng, type = "cafe" } = req.query;

  if (!GOOGLE_KEY) {
    console.error("Missing GOOGLE_KEY for Places");
    return res.status(500).json({ error: "Missing GOOGLE_KEY in .env" });
  }
  if (!lat || !lng) {
    return res
      .status(400)
      .json({ error: "lat and lng are required query parameters" });
  }


  const googleType = type === "bar" ? "bar" : "cafe";

  console.log("Requesting Google Places for", {
    lat,
    lng,
    type,
    googleType,
  });

  try {
    const resp = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          key: GOOGLE_KEY,
          location: `${lat},${lng}`,
          radius: 1500, // 1.5 km
          type: googleType,
        },
      }
    );

    const results = resp.data.results || [];
    console.log("Google Places returned", results.length, "places");

    if (!results.length) {
      console.warn("Google Places returned 0 results – using fallback cafés");
      return res.json(getFallbackPlaces(lat, lng));
    }

    const items = results.map((p) => ({
      id: p.place_id,
      name: p.name,
      distance: null, // Nearby Search doesn't give distance directly
      address: p.vicinity || p.formatted_address,
      categories: (p.types || []).join(", "),
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    }));

    res.json(items);
  } catch (err) {
    console.error(
      "Google Places error:",
      err.response?.status,
      err.response?.data || err.message
    );

    console.warn("Using fallback cafés due to Places error");
    res.json(getFallbackPlaces(lat, lng));
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("GOOGLE_KEY present:", !!GOOGLE_KEY);
});
