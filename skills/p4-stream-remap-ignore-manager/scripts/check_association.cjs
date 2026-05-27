const { execSync } = require('child_process');

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
const targetPath = args[0];
const streams = args.slice(1);

if (!targetPath || streams.length === 0) {
    console.log("Usage: node check_association.cjs <target_path> <stream1> [stream2] ...");
    process.exit(1);
}

console.log(`# Path Association Check: \`${targetPath}\` (Remapped & Ignored Only)\n`);

streams.forEach(s => {
    const config = getStreamConfig(s);
    if (config.error) {
        console.log(`## Stream: ${s}\n**Error:** ${config.error}\n`);
        return;
    }
    const associations = [];
    config.remapped.forEach(line => { if (line.includes(targetPath)) associations.push(`- [Remapped] \`${line}\``); });
    config.ignored.forEach(line => { if (line.includes(targetPath)) associations.push(`- [Ignored] \`${line}\``); });

    console.log(`## Stream: ${config.streamPath}`);
    if (associations.length > 0) associations.forEach(a => console.log(a));
    else console.log("_No Remapped or Ignored association found_");
    console.log("\n---\n");
});
