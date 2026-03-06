#!/usr/bin/env node

/**
 * Generate 3 knight sprites with 3 cheapest models for comparison
 */

const fs = require('fs');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';

// Prompt - facing LEFT TO RIGHT, low pixel style
const PROMPT = 'pixel art game sprite, chunky large pixels, low resolution pixel art, medieval knight in plate armor with sword and shield, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64';

// 3 cheapest models to test
const MODELS = [
    { name: 'flux', file: 'knight-1.png' },
    { name: 'zimage', file: 'knight-2.png' },
    { name: 'klein', file: 'knight-3.png' }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadImage(prompt, model, outputPath) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${model}&width=64&height=64&seed=42&nologo=true&key=${API_KEY}`;
        
        const chunks = [];
        
        https.get(url, (response) => {
            response.on('data', (chunk) => chunks.push(chunk));
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                
                if (response.statusCode !== 200) {
                    let errorMsg = `HTTP ${response.statusCode}`;
                    try {
                        const errorData = JSON.parse(buffer.toString());
                        if (errorData.error && errorData.error.message) {
                            errorMsg = `${response.statusCode}: ${errorData.error.message}`;
                        }
                    } catch (e) {
                        const text = buffer.toString().substring(0, 200);
                        if (text) errorMsg = `${response.statusCode}: ${text}`;
                    }
                    reject(new Error(errorMsg));
                    return;
                }
                
                try {
                    fs.writeFileSync(outputPath, buffer);
                    resolve();
                } catch (err) {
                    reject(new Error(`Failed to write: ${err.message}`));
                }
            });
        }).on('error', (err) => reject(new Error(`Network: ${err.message}`)));
    });
}

async function main() {
    console.log('⚔️  Generating 3 knight variants for model comparison\n');
    console.log(`Prompt: ${PROMPT}\n`);
    
    for (const { name, file } of MODELS) {
        const outputPath = `images/player/${file}`;
        console.log(`🎨 Generating ${file} with model: ${name}...`);
        
        try {
            await downloadImage(PROMPT, name, outputPath);
            const stats = fs.statSync(outputPath);
            console.log(`   ✅ ${file} - ${(stats.size / 1024).toFixed(1)} KB\n`);
        } catch (err) {
            console.log(`   ❌ ${file} failed: ${err.message}\n`);
        }
        
        await sleep(2000);
    }
    
    console.log('Done! Check images/player/ for the results.');
}

main().catch(console.error);
