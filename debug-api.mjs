import axios from 'axios';

const addr = process.argv[2] || 'dyt1faucet00000000000';
const url = `https://dytallix.com/rpc/account/${addr}`;

console.log('Fetching from:', url);

try {
  const response = await axios.get(url);
  console.log('\nRaw API Response:');
  console.log(JSON.stringify(response.data, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
}
