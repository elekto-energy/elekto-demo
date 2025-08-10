// src/services/elektoService.js
import { MOCK_ELEKTO, ELEKTO_CONTRACT_ADDRESS } from "../config";

let mockBalance = 42.5; // startvärde för mock

export async function getBalance(address) {
  if (MOCK_ELEKTO) {
    console.log("[MOCK] Hämta balans för", address);
    return mockBalance;
  }
  // Här skulle riktig ethers.js kod gå in
  return 0;
}

export async function sendTokens(to, amount) {
  if (MOCK_ELEKTO) {
    console.log(`[MOCK] Skickar ${amount} ELEKTO till ${to}`);
    mockBalance -= amount;
    return { success: true, txHash: "0xMOCKTX" };
  }
  // Här skulle riktig ethers.js kod gå in
  return { success: false };
}
