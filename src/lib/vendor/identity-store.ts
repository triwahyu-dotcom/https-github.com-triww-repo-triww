import { randomInt, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type VerificationChannel = "email" | "phone";

type VendorIdentityProfile = {
  id: string;
  username: string;
  email: string;
  phone: string;
  emailVerifiedAt: string;
  phoneVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
};

type VendorVerificationChallenge = {
  id: string;
  channel: VerificationChannel;
  target: string;
  code: string;
  expiresAt: string;
  consumedAt: string;
  createdAt: string;
};

type VendorVerificationToken = {
  id: string;
  profileId: string;
  channel: VerificationChannel;
  target: string;
  token: string;
  expiresAt: string;
  usedAt: string;
  createdAt: string;
};

type VendorIdentityState = {
  profiles: VendorIdentityProfile[];
  challenges: VendorVerificationChallenge[];
  tokens: VendorVerificationToken[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const IDENTITY_STATE_PATH = path.join(DATA_DIR, "vendor-identity-state.json");

const EMPTY_STATE: VendorIdentityState = {
  profiles: [],
  challenges: [],
  tokens: [],
};

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

function usernameFromIdentity(email: string, phone: string) {
  return email || phone;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  await ensureDataDir();

  if (!existsSync(IDENTITY_STATE_PATH)) {
    return structuredClone(EMPTY_STATE);
  }

  const content = await readFile(IDENTITY_STATE_PATH, "utf8");
  return JSON.parse(content) as VendorIdentityState;
}

async function writeState(state: VendorIdentityState) {
  await ensureDataDir();
  await writeFile(IDENTITY_STATE_PATH, JSON.stringify(state, null, 2));
}

function normalizeTarget(channel: VerificationChannel, target: string) {
  return channel === "email" ? normalizeEmail(target) : normalizePhone(target);
}

export async function requestVendorVerificationCode(channel: VerificationChannel, target: string) {
  const normalizedTarget = normalizeTarget(channel, target);
  if (!normalizedTarget) {
    throw new Error(`Valid ${channel} is required.`);
  }

  const state = await readState();
  const code = String(randomInt(100000, 999999));
  const challenge: VendorVerificationChallenge = {
    id: randomUUID(),
    channel,
    target: normalizedTarget,
    code,
    expiresAt: addMinutes(new Date(), 10),
    consumedAt: "",
    createdAt: nowIso(),
  };

  state.challenges.unshift(challenge);
  await writeState(state);

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    previewCode: code,
    normalizedTarget,
  };
}

export async function verifyVendorVerificationCode(channel: VerificationChannel, target: string, code: string) {
  const normalizedTarget = normalizeTarget(channel, target);
  const normalizedCode = code.trim();
  const state = await readState();
  const now = new Date();

  const challenge = state.challenges.find(
    (item) =>
      item.channel === channel &&
      item.target === normalizedTarget &&
      item.code === normalizedCode &&
      !item.consumedAt &&
      new Date(item.expiresAt).getTime() > now.getTime(),
  );

  if (!challenge) {
    throw new Error("Verification code is invalid or expired.");
  }

  challenge.consumedAt = nowIso();

  let profile =
    state.profiles.find((item) => item.email && item.email === normalizedTarget) ??
    state.profiles.find((item) => item.phone && item.phone === normalizedTarget);

  if (!profile) {
    profile = {
      id: randomUUID(),
      username: usernameFromIdentity(channel === "email" ? normalizedTarget : "", channel === "phone" ? normalizedTarget : ""),
      email: channel === "email" ? normalizedTarget : "",
      phone: channel === "phone" ? normalizedTarget : "",
      emailVerifiedAt: channel === "email" ? nowIso() : "",
      phoneVerifiedAt: channel === "phone" ? nowIso() : "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.profiles.push(profile);
  } else {
    if (channel === "email") {
      profile.email = normalizedTarget;
      profile.emailVerifiedAt = nowIso();
    }
    if (channel === "phone") {
      profile.phone = normalizedTarget;
      profile.phoneVerifiedAt = nowIso();
    }
    profile.username = usernameFromIdentity(profile.email, profile.phone);
    profile.updatedAt = nowIso();
  }

  const token: VendorVerificationToken = {
    id: randomUUID(),
    profileId: profile.id,
    channel,
    target: normalizedTarget,
    token: randomUUID(),
    expiresAt: addMinutes(new Date(), 60),
    usedAt: "",
    createdAt: nowIso(),
  };

  state.tokens.unshift(token);
  await writeState(state);

  return {
    token: token.token,
    username: profile.username,
    normalizedTarget,
    emailVerifiedAt: profile.emailVerifiedAt,
    phoneVerifiedAt: profile.phoneVerifiedAt,
  };
}

export async function consumeVendorVerificationTokens(input: {
  email: string;
  phone: string;
  emailVerificationToken: string;
  phoneVerificationToken: string;
}) {
  const state = await readState();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const now = new Date();

  const emailToken = input.emailVerificationToken
    ? state.tokens.find(
        (item) =>
          item.token === input.emailVerificationToken &&
          item.channel === "email" &&
          item.target === normalizedEmail &&
          !item.usedAt &&
          new Date(item.expiresAt).getTime() > now.getTime(),
      )
    : null;

  const phoneToken = input.phoneVerificationToken
    ? state.tokens.find(
        (item) =>
          item.token === input.phoneVerificationToken &&
          item.channel === "phone" &&
          item.target === normalizedPhone &&
          !item.usedAt &&
          new Date(item.expiresAt).getTime() > now.getTime(),
      )
    : null;

  if (!emailToken && !phoneToken) {
    throw new Error("Verify email or phone before submitting.");
  }

  const profileId = emailToken?.profileId ?? phoneToken?.profileId ?? "";
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error("Verified identity profile not found.");
  }

  if (emailToken) emailToken.usedAt = nowIso();
  if (phoneToken) phoneToken.usedAt = nowIso();
  await writeState(state);

  return {
    username: profile.username,
    emailVerifiedAt: profile.emailVerifiedAt,
    phoneVerifiedAt: profile.phoneVerifiedAt,
  };
}

