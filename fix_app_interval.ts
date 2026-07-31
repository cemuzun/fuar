import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the zombie interval
content = content.replace(
  "const progressInterval = setInterval(() => {",
  "// @ts-ignore\n    window._orbusInterval && clearInterval(window._orbusInterval);\n    const progressInterval = setInterval(() => {"
);

content = content.replace(
  "      setIsSyncingOrbus(false);\n    }\n  };",
  "      clearInterval(progressInterval);\n      setIsSyncingOrbus(false);\n    }\n  };"
);

// Fix deduplication on extract
const oldTargetShowList = "const targetShowList = extractAll ? shows : (singleTarget ? [singleTarget] : shows);";
const newTargetShowList = `const dedupeTarget = (list: TradeShowEvent[]) => {
      const seen = new Set();
      return list.filter(s => {
        const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const targetShowList = extractAll ? dedupeTarget(shows) : (singleTarget ? [singleTarget] : dedupeTarget(shows));`;
    
content = content.replace(oldTargetShowList, newTargetShowList);

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx fixed");
