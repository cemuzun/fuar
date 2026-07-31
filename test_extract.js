async function run() {
  const res = await fetch('http://localhost:3000/api/extract/generate-roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tradeShowName: 'Pack Expo', city: 'Chicago', state: 'IL', count: 2 })
  });
  console.log(await res.text());
}
run();
