const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find the generateContent in generate-roster
code = code.replace(
`      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {`,
`      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed googleSearch for generate-roster');
