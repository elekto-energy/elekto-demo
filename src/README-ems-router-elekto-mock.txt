# ELEKTO Router + Mock Wallet Patch

- Adds react-router and clickable sidebar
- ELEKTO wallet page + sidebar "Send ELEKTO" modal
- Mock mode via `src/utils/elektoConfig.json` (mock true/false)
- Token address preset: 0x6a333Ff2233aED4faA5404c4D119Ec7628Bb33dA

Install:
1) Copy into your project so files land under `src/...`
2) npm i react-router-dom ethers
3) npm run dev

Toggle real chain:
- Set `"mock": false` in `elektoConfig.json`
- Ensure MetaMask is installed and connected to Polygon (or your network)
