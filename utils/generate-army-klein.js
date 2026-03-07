#!/usr/bin/env node

/**
 * Generate ALL player army units using Klein model only
 * Consistent style: facing left, grim dark fantasy
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const OUTPUT_DIR = path.join(__dirname, 'temp', 'klein-army');

const MODEL = 'klein';
const WIDTH = 256;
const HEIGHT = 256;

// All 9 player units with consistent base prompt
const UNITS = [
    {
        name: 'knight',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, knight in steel armor with sword and shield, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'archer',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, archer with bow and green cloak, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'wizard',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, wizard with staff and blue robes, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'berserker',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, berserker with two axes and fur armor, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'paladin',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, paladin in silver armor with red cape hammer and blue shield, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'ranger',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, ranger with longbow and brown leather armor, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'rogue',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, rogue with daggers and dark hood, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'cleric',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, cleric with holy symbol and white robes, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    },
    {
        name: 'sorcerer',
        prompt: 'pixel art game sprite, chunky large pixels, low resolution 64x64 style, sorcerer with glowing staff and purple robes, facing left, side view, simple flat colors, grim dark fantasy game asset, 256x256'
    }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(prompt, outputPath, seed) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${MODEL}&width=${WIDTH}&height=${HEIGHT}&seed=${seed}&nologo=true&key=${API_KEY}`;
        
        const chunks = [];
        
        https.get(url, (response) => {
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
    console.log('⚔️  Generating Player Army - Klein Model Only\n');
    console.log(`Model: ${MODEL}`);
    console.log(`Units: ${UNITS.length}`);
    console.log(`Output: ${OUTPUT_DIR}\n`);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    let success = 0;
    let failed = 0;
    
    for (const unit of UNITS) {
        const outputPath = path.join(OUTPUT_DIR, `${unit.name}.png`);
        
        if (fs.existsSync(outputPath)) {
            console.log(`⏭️  ${unit.name}.png already exists`);
            success++;
            continue;
        }
        
        console.log(`⏳ Generating ${unit.name}.png...`);
        
        try {
            // Use different seeds for variety but same style
            const seed = 42 + UNITS.indexOf(unit);
            await downloadImage(unit.prompt, outputPath, seed);
            const stats = fs.statSync(outputPath);
            console.log(`   ✅ ${unit.name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
            success++;
        } catch (err) {
            console.log(`   ❌ ${unit.name}: ${err.message}`);
            failed++;
        }
        
        await sleep(2000);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Done! ${success}/${UNITS.length} generated`);
    console.log(`Saved to: ${OUTPUT_DIR}`);
    console.log('\nNext: Run remove-background.js on these images');
}

main().catch(console.error);
