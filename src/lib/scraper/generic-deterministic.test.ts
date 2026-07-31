import { GenericDeterministicAdapter } from './adapters/generic-deterministic.js';
import assert from 'assert';

async function runTests() {
  const adapter = new GenericDeterministicAdapter();
  
  // Test rejecting false labels
  const falseLabelsHtml = `
    <table>
      <tr><td>New Products</td><td>Booth 1</td></tr>
      <tr><td>Welding Machines/Equipment</td><td>Booth 2</td></tr>
      <tr><td>Register as a Visitor</td><td>Booth 3</td></tr>
      <tr><td>Real Company Inc</td><td>Booth 100</td></tr>
      <tr><td>Tech Solutions</td><td>Booth 101</td></tr>
      <tr><td>Home</td><td>Booth 4</td></tr>
    </table>
  `;
  
  const results = await adapter.extractExhibitors('http://test.com', falseLabelsHtml, null, []);
  
  console.log('Extracted:', results.map(r => r.companyName));
  
  assert.equal(results.length, 1, 'Should only extract the real company');
  assert.equal(results[0].companyName, 'Real Company Inc');
  
  console.log('Tests passed!');
}

runTests().catch(console.error);
