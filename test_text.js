async function run() {
  const res = await fetch('http://localhost:3000/api/extract/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: 'Pack Expo', tradeShowName: 'Pack Expo', city: 'Chicago', state: 'IL' })
  });
  console.log(await res.text());
}
run();
