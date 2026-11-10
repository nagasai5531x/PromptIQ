import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const match = envText.match(/GROQ_API_KEY\s*=\s*([^\r\n]+)/);
const key = match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
console.log('Testing Groq with key prefix:', key.slice(0, 10));

async function main() {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say hello in 5 words' }]
    })
  });

  const d = await res.json();
  console.log('Status:', res.status);
  console.log('Groq response success:', d.choices?.[0]?.message?.content);
}

main().catch(console.error);
