import { ethers } from "ethers";
import cfg from "@/utils/elektoConfig.json";

const LS_KEY = "elekto_mock_balance";

function getMockBalance() {
  const s = localStorage.getItem(LS_KEY);
  if (s == null) {
    localStorage.setItem(LS_KEY, "250");
    return 250;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function setMockBalance(val) {
  localStorage.setItem(LS_KEY, String(val));
}

export async function ensureWallet() {
  if (cfg.mock) return { provider: null, signer: null, account: "MOCK", mock: true };
  if (!window.ethereum) throw new Error("MetaMask saknas.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, account: accounts[0], mock: false };
}

export function getContract(signerOrProvider) {
  if (cfg.mock) return null;
  const c = new ethers.Contract(cfg.contractAddress, [
    {"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function","stateMutability":"view"},
    {"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function","stateMutability":"nonpayable"},
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function","stateMutability":"view"},
    {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function","stateMutability":"view"}
  ], signerOrProvider);
  return c;
}

export async function getBalance(signer) {
  const dec = cfg.decimals ?? 18;
  if (cfg.mock) {
    const bal = getMockBalance();
    return bal;
  }
  const user = await signer.getAddress();
  const contract = getContract(signer);
  const raw = await contract.balanceOf(user);
  return Number(ethers.formatUnits(raw, dec));
}

export async function sendTokens({ signer, to, amount }) {
  const dec = cfg.decimals ?? 18;
  if (cfg.mock) {
    const current = getMockBalance();
    const val = Number(amount);
    if (!to) throw new Error("Saknar mottagaradress (mock).");
    if (!Number.isFinite(val) || val <= 0) throw new Error("Belopp ogiltigt.");
    if (val > current) throw new Error("Otillräckligt saldo (mock).");
    const next = +(current - val).toFixed(4);
    setMockBalance(next);
    const hash = "mock:" + Math.random().toString(36).slice(2);
    return { hash, mock: true };
  }
  const contract = getContract(signer);
  const value = ethers.parseUnits(String(amount), dec);
  const tx = await contract.transfer(to, value);
  return tx;
}
