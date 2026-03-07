#!/usr/bin/env node

/**
 * Generate Paladin animation frames using ALL available Pollinations models
 * Uses high resolution, same seed for consistency across animations
 * 8 models: flux, flux-2-dev, zimage, imagen-4, klein, klein-large, grok-imagine, gptimage
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const BASE_TEMP_DIR = path.join(__dirname, 'temp');

// High resolution - will scale down in game
const WIDTH = 256;
const HEIGHT = 256;

// Same seed for ALL frames of consistency
const SEED = 42;

// Paladin base description - consistent across all animations
const PALADIN_BASE = 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, paladin knight in SILVER armor with RED cape, holding steel hammer and blue shield with gold trim, facing left to right, side view, simple flat colors, grim dark fantasy game asset';

// Animation-specific poses
const ANIMATIONS = {
    idle: `${PALADIN_BASE}, standing idle pose, feet together`,
    walk1: `${PALADIN_BASE}, walking pose left leg forward, right leg back`,
    walk2: `${PALADIN_BASE}, walking pose right leg forward, left leg back`,
    attack: `${PALADIN_BASE}, attacking pose hammer raised overhead, shield forward`
};

// All 8 free models available
const MODELS = [
    { name: 'flux', label: 'Flux Schnell', cost: '0.001' },
    { name: 'flux-2-dev', label: 'FLUX.2 Dev', cost: '0.001' },
    { name: 'zimage', label: 'Z-Image Turbo', cost: '0.002' },
    { name: 'klein', label: 'FLUX.2 Klein 4B', cost: '0.002' },
    { name: 'klein-large', label: 'FLUX.2 Klein 9B', cost: '0.002' },
    { name: 'imagen-4', label: 'Imagen 4', cost: '0.002' },
    { name: 'grok-imagine', label: 'Grok Imagine', cost: '0.002' },
    { name: 'gptimage', label: 'GPT Image Mini', cost: '0.003' }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(model, prompt, outputPath) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        // Use same seed for consistency across animations
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${model}&width=${WIDTH}&height=${HEIGHT}&seed=${SEED}&nologo=true&key=${API_KEY}`;
        
        console.log(`    URL length: ${url.length} chars`);
        
        const chunks = [];
        
        https.get(url, (response) => {
            if (response.statusCode === 402) {
                reject(new Error('PAYMENT_REQUIRED'));
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
    console.log('⚔️  Paladin Animation Test - All Models');
    console.log('==========================================');
    console.log(`Resolution: ${WIDTH}x${HEIGHT} (scale to 64x64 in-game)`);
    console.log(`Seed: ${SEED} (consistent across all frames)`);
    console.log(`Models: ${MODELS.length}`);
    console.log(`Animations per model: ${Object.keys(ANIMATIONS).length}`);
    console.log('');
    
    // Ensure base temp directory exists
    if (!fs.existsSync(BASE_TEMP_DIR)) {
        fs.mkdirSync(BASE_TEMP_DIR, { recursive: true });
    }
    
    const results = [];
    let totalCost = 0;
    
    for (const model of MODELS) {
        console.log(`\n📦 Model: ${model.label} (${model.name})`);
        console.log(`   Cost: ${model.cost} pollen/img`);
        console.log('   ' + '─'.repeat(50));
        
        // Create model-specific directory
        const modelDir = path.join(BASE_TEMP_DIR, model.name);
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }
        
        let modelSuccess = 0;
        let modelFailed = 0;
        let modelCost = 0;
        
        for (const [animName, prompt] of Object.entries(ANIMATIONS)) {
            const filename = `paladin_${animName}.png`;
            const outputPath = path.join(modelDir, filename);
            
            // Skip if already exists
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log(`   ⏭️  ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
                modelSuccess++;
                modelCost += parseFloat(model.cost);
                continue;
            }
            
            console.log(`   ⏳ ${filename}...`);
            
            try {
                await downloadImage(model.name, prompt, outputPath);
                const stats = fs.statSync(outputPath);
                console.log(`   ✅ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
                modelSuccess++;
                modelCost += parseFloat(model.cost);
            } catch (err) {
                console.log(`   ❌ ${filename}: ${err.message}`);
                modelFailed++;
            }
            
            // Delay between requests
            await sleep(2000);
        }
        
        results.push({
            model: model.name,
            label: model.label,
            cost: model.cost,
            success: modelSuccess,
            failed: modelFailed,
            totalCost: modelCost.toFixed(3)
        });
        
        totalCost += modelCost;
        
        // Delay between models
        await sleep(4000);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    results.forEach(r => {
        const status = r.failed === 0 ? '✅' : (r.success === 0 ? '❌' : '⚠️');
        console.log(`${status} ${r.label.padEnd(20)} | ${r.success}/${r.success + r.failed} | ${r.totalCost} pollen`);
    });
    
    console.log('\n' + '-'.repeat(60));
    console.log(`Total estimated cost: ${totalCost.toFixed(3)} pollen`);
    console.log(`Images saved in: utils/temp/{model_name}/`);
    console.log('\nNote: Same seed (42) used for all frames to ensure consistency');
}

main().catch(console.error);
