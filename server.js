
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');
const { Client } = require('@googlemaps/google-maps-services-js');

const app = express();
const port = 3000;

const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Replace with your Google Places API key
const client = new Client({});

const locations = {
    Coimbatore: {
        busStand: '10.9986,76.9661', // Replace with actual coordinates
        railwayStation: '11.0002,76.9663' // Replace with actual coordinates
    },
    Trichy: {
        busStand: '10.8263,78.6920', //  10.8263,78.6920   10.799324060791584, 78.6803481229337   Replace with actual coordinates
        railwayStation: '10.8133,78.6956' // Replace with actual coordinates
    },
    Chennai: {
        busStand: '13.0827,80.2707', // Replace with actual coordinates
        railwayStation: '13.0825,80.2767' // Replace with actual coordinates
    },
    Bangalore: {
        busStand: '12.9716,77.5946', // Replace with actual coordinates
        railwayStation: '12.9786,77.5713' // Replace with actual coordinates
    }
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/pgs', async (req, res) => {
    try {
        const city = req.query.city;
        const query = req.query.query;
        const location = locations[city];

        if (!location) {
            return res.status(400).send('Invalid city');
        }

        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        const textSearchResponse = await axios.get(textSearchUrl);
        const places = textSearchResponse.data.results;

        const detailsPromises = places.map(place => {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,formatted_phone_number,geometry,formatted_address,photos&key=${apiKey}`;
            return axios.get(detailsUrl);
        });

        const detailsResponses = await Promise.all(detailsPromises);
        const pgDetails = await Promise.all(detailsResponses.map(async response => {
            const result = response.data.result;

            const origins = [`${result.geometry.location.lat},${result.geometry.location.lng}`];
            const busStandDistanceResponse = await client.distancematrix({
                params: {
                    origins,
                    destinations: [location.busStand],
                    key: apiKey
                }
            });
            const railwayStationDistanceResponse = await client.distancematrix({
                params: {
                    origins,
                    destinations: [location.railwayStation],
                    key: apiKey
                }
            });

            const busStandDistance = busStandDistanceResponse.data.rows[0].elements[0].distance.text;
            const railwayStationDistance = railwayStationDistanceResponse.data.rows[0].elements[0].distance.text;

            const photoUrl = result.photos && result.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`
                : null;

            const latitude = result.geometry.location.lat;
            const longitude = result.geometry.location.lng;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

            return {
                ...result,
                busStandDistance,
                railwayStationDistance,
                photoUrl,
                mapsUrl
            };
        }));

        res.json(pgDetails);
    } catch (error) {
        console.error('Error fetching PG details:', error);
        res.status(500).send('Error fetching PG details');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});










// const apiKey = 'AIzaSyCIawzoTGXQ89zKWCd7sWVzwejy_J__xIc';