#!/usr/bin/env node

/**
 * Remove backgrounds from Klein army sprites
 * Uses sharp to make white/gray backgrounds transparent
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INPUT_DIR = path.join(__dirname, 'temp', 'klein-army');
const OUTPUT_DIR = path.join(__dirname, 'temp', 'klein-army-transparent');

async function removeBackground(inputPath, outputPath) {
    try {
        const { data, info } = await sharp(inputPath)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });
        
        // Threshold for background detection
        // Klein images have white/light gray backgrounds
        const threshold = 240;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // If pixel is very light (near white/gray background), make transparent
            if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0; // Alpha = 0
            }
        }
        
        await sharp(data, {
            raw: { width: info.width, height: info.height, channels: 4 }
        })
        .png()
        .toFile(outputPath);
        
        console.log(`✅ ${path.basename(outputPath)}`);
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }
}

async function main() {
    console.log('🖼️  Removing backgrounds from Klein army\n');
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));
    
    console.log(`Processing ${files.length} images...\n`);
    
    for (const file of files) {
        const inputPath = path.join(INPUT_DIR, file);
        const outputPath = path.join(OUTPUT_DIR, file);
        await removeBackground(inputPath, outputPath);
    }
    
    console.log(`\nDone! Transparent images in: ${OUTPUT_DIR}`);
}

main().catch(console.error);
