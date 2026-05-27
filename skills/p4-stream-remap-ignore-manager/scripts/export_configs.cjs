const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getStreamConfig(streamPath) {
    try {
        const output = execSync(`p4 stream -o ${streamPath}`).toString();
        const extractSection = (sectionName) => {
            const lines = output.split('\n');
            const sectionStart = lines.findIndex(l => l.startsWith(sectionName + ':'));
            if (sectionStart === -1) return [];
            const result = [];
            for (let i = sectionStart + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim() !== '' && !line.startsWith('\t') && !line.startsWith(' ')) break;
                if (line.trim()) result.push(line.trim());
            }
            return result;
        };
        return {
            streamPath,
            remapped: extractSection('Remapped'),
            ignored: extractSection('Ignored')
        };
    } catch (error) {
        return { streamPath, error: error.message };
    }
}

const args = process.argv.slice(2);
const outputDirIndex = args.indexOf('--output-dir');
let outputDir = null;
let streams = args;

if (outputDirIndex !== -1) {
    outputDir = args[outputDirIndex + 1];
    streams = args.filter((_, i) => i !== outputDirIndex && i !== outputDirIndex + 1);
}

if (streams.length === 0) {
    console.log("Usage: node export_configs.cjs <stream1> [stream2] ... [--output-dir <path>]");
    process.exit(1);
}

if (outputDir && !fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

streams.forEach(s => {
    const config = getStreamConfig(s);
    if (config.error) {
        console.error(`Error processing ${s}: ${config.error}`);
        return;
    }
    const fileName = s.replace(/^\/\/|^\//, '').replace(/\//g, '_') + '.md';
    const filePath = outputDir ? path.join(outputDir, fileName) : fileName;
    let content = `# ${config.streamPath}\n\n## Remapped\n`;
    if (config.remapped.length > 0) config.remapped.forEach(line => content += `${line}\n`);
    else content += "_None_\n";
    content += "\n## Ignored\n";
    if (config.ignored.length > 0) config.ignored.forEach(line => content += `${line}\n`);
    else content += "_None_\n";
    fs.writeFileSync(filePath, content);
    console.log(`Exported: ${filePath}`);
});
