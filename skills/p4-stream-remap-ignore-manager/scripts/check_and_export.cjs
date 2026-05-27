const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Extracts Remapped and Ignored sections from P4 stream output.
 */
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

/**
 * Highlights matches and returns if any were found.
 */
function processLine(line, targets, isRemap = false) {
    let formattedLine = line;
    let matchFound = false;

    if (isRemap) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            formattedLine = `${parts[0]}  ➔  ${parts[1]}`;
        }
    }

    targets.forEach(target => {
        if (line.toLowerCase().includes(target.toLowerCase())) {
            const regex = new RegExp(`(${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            formattedLine = formattedLine.replace(regex, '**$1**');
            matchFound = true;
        }
    });

    return { 
        text: matchFound ? `🚩 ${formattedLine}` : `　 ${formattedLine}`,
        matchFound 
    };
}

const args = process.argv.slice(2);
const outputDirIndex = args.indexOf('--output-dir');
const targetPathsIndex = args.indexOf('--targets');

if (targetPathsIndex === -1 || outputDirIndex === -1) {
    console.log("Usage: node check_and_export.cjs --targets \"path1,path2\" --output-dir <path> <stream1> [stream2] ...");
    process.exit(1);
}

const targetPaths = args[targetPathsIndex + 1].split(',').map(p => p.trim());
const outputDir = args[outputDirIndex + 1];
const streams = args.filter((arg, i) => {
    return i !== outputDirIndex && i !== outputDirIndex + 1 && 
           i !== targetPathsIndex && i !== targetPathsIndex + 1 &&
           arg !== '--output-dir' && arg !== '--targets';
});

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const streamResults = streams.map(s => {
    const config = getStreamConfig(s);
    if (config.error) return { streamPath: s, error: config.error };
    
    let matchesCount = 0;
    const remappedProcessed = config.remapped.map(l => {
        const res = processLine(l, targetPaths, true);
        if (res.matchFound) matchesCount++;
        return res.text;
    });
    const ignoredProcessed = config.ignored.map(l => {
        const res = processLine(l, targetPaths, false);
        if (res.matchFound) matchesCount++;
        return res.text;
    });

    return {
        streamPath: s,
        remapped: remappedProcessed,
        ignored: ignoredProcessed,
        matchesCount
    };
});

const consolidatedPath = path.join(outputDir, "Comparison_Summary.md");
let fullContent = `<div id="top"></div>\n\n# 🔍 Stream Comparison Summary Report\n\n`;

fullContent += `## 📋 Check Items Path\n`;
targetPaths.forEach(p => {
    fullContent += `- \`${p}\` \n`;
});
fullContent += `\n---\n\n`;

// Quick Navigation with Status Icons
fullContent += `## 🧭 Quick Navigation\n`;
streamResults.forEach((res, index) => {
    const anchor = `stream-${index}`;
    const statusIcon = res.error ? "❌" : (res.matchesCount > 0 ? "⚠️" : "✅");
    const matchCountStr = res.matchesCount > 0 ? ` (${res.matchesCount} matches)` : "";
    fullContent += `- ${statusIcon} [${res.streamPath}](#${anchor})${matchCountStr}\n`;
});
fullContent += `\n---\n\n`;

// Detailed Sections
streamResults.forEach((res, index) => {
    const anchor = `stream-${index}`;
    fullContent += `<h1 id="${anchor}">📂 ${res.streamPath}</h1>\n\n`;

    if (res.error) {
        fullContent += `> ❌ **Error:** ${res.error}\n\n---\n\n`;
        return;
    }

    const statusMsg = res.matchesCount > 0 
        ? `⚠️ Found **${res.matchesCount}** matches in this stream.` 
        : `✅ No matches found.`;
    fullContent += `> ${statusMsg}\n\n`;

    fullContent += `### 🔄 Remapped\n`;
    if (res.remapped.length > 0) {
        fullContent += "```text\n";
        res.remapped.forEach(line => {
            fullContent += `${line}\n`;
        });
        fullContent += "```\n";
    } else {
        fullContent += "_None_\n";
    }
    fullContent += "\n";

    fullContent += `### 🚫 Ignored\n`;
    if (res.ignored.length > 0) {
        fullContent += "```text\n";
        res.ignored.forEach(line => {
            fullContent += `${line}\n`;
        });
        fullContent += "```\n";
    } else {
        fullContent += "_None_\n";
    }

    fullContent += `\n[Back to Top](#top)\n\n`;
    fullContent += `--- \n\n`;
});

fs.writeFileSync(consolidatedPath, fullContent);
console.log(`Successfully generated unified report: ${consolidatedPath}`);
