#!/usr/bin/env node

/**
 * Generate Paladin animation frames using all available Pollinations models
 * Creates 3 frames per model: idle, walking, attacking
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const BASE_TEMP_DIR = path.join(__dirname, 'temp');

// Paladin animation prompts
const ANIMATIONS = {
    idle: 'pixel art game sprite, chunky large pixels, low resolution, paladin knight in silver armor with hammer and shield, standing idle pose, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    walk1: 'pixel art game sprite, chunky large pixels, low resolution, paladin knight in silver armor with hammer and shield, walking pose left leg forward, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    walk2: 'pixel art game sprite, chunky large pixels, low resolution, paladin knight in silver armor with hammer and shield, walking pose right leg forward, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    attack: 'pixel art game sprite, chunky large pixels, low resolution, paladin knight in silver armor with hammer and shield, attacking pose hammer raised, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64'
};

// Models to test - cheapest first
const MODELS = [
    { name: 'flux', label: 'Flux Schnell' },
    { name: 'flux-2-dev', label: 'FLUX.2 Dev' },
    { name: 'zimage', label: 'Z-Image Turbo' },
    { name: 'imagen-4', label: 'Imagen 4' }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(model, prompt, outputPath) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${model}&width=64&height=64&seed=42&nologo=true&key=${API_KEY}`;
        
        const chunks = [];
        
        https.get(url, (response) => {
            if (response.statusCode === 402) {
                reject(new Error('PAYMENT_REQUIRED - Model requires paid tier'));
                return;
            }
            if (response.statusCode === 429) {
                reject(new Error('RATE_LIMITED'));
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            response.on('data', (chunk) => chunks.push(chunk));
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                fs.writeFileSync(outputPath, buffer);
                resolve();
            });
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    console.log('⚔️  Generating Paladin Animation Test Suite\n');
    console.log('Models to test:', MODELS.map(m => m.name).join(', '));
    console.log('Animations:', Object.keys(ANIMATIONS).join(', '));
    console.log('');
    
    // Ensure base temp directory exists
    if (!fs.existsSync(BASE_TEMP_DIR)) {
        fs.mkdirSync(BASE_TEMP_DIR, { recursive: true });
    }
    
    const results = [];
    
    for (const model of MODELS) {
        console.log(`\n📦 Testing Model: ${model.label} (${model.name})`);
        console.log('─'.repeat(50));
        
        // Create model-specific directory
        const modelDir = path.join(BASE_TEMP_DIR, model.name);
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }
        
        let modelSuccess = 0;
        let modelFailed = 0;
        
        for (const [animName, prompt] of Object.entries(ANIMATIONS)) {
            const filename = `paladin_${animName}.png`;
            const outputPath = path.join(modelDir, filename);
            
            // Skip if already exists
            if (fs.existsSync(outputPath)) {
                console.log(`  ⏭️  ${filename} already exists`);
                modelSuccess++;
                continue;
            }
            
            console.log(`  ⏳ Generating ${filename}...`);
            
            try {
                await downloadImage(model.name, prompt, outputPath);
                const stats = fs.statSync(outputPath);
                console.log(`  ✅ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
                modelSuccess++;
            } catch (err) {
                console.log(`  ❌ ${filename}: ${err.message}`);
                modelFailed++;
            }
            
            // Delay between requests to be nice to the API
            await sleep(1500);
        }
        
        results.push({
            model: model.name,
            label: model.label,
            success: modelSuccess,
            failed: modelFailed
        });
        
        // Longer delay between models
        await sleep(3000);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    results.forEach(r => {
        const status = r.failed === 0 ? '✅' : (r.success === 0 ? '❌' : '⚠️');
        console.log(`${status} ${r.label}: ${r.success}/${r.success + r.failed} generated`);
    });
    
    console.log('\nFiles saved in:');
    MODELS.forEach(m => {
        console.log(`  - utils/temp/${m.name}/`);
    });
}

main().catch(console.error);
