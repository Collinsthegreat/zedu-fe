#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

const argv = process.argv.slice(2);

function arg(name, fallback) {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
}

const phase = arg("--phase", "prepare");
const repoDir = resolve(arg("--repo", process.cwd()));
const configPath = resolve(
  arg("--config", join(repoDir, ".github/release-manifest.json"))
);
const statePath =
  process.env.RELEASE_STATE_PATH ||
  join(process.env.RUNNER_TEMP || os.tmpdir(), "release-state.json");
const dryRun = argv.includes("--dry-run");
const cfg = JSON.parse(readFileSync(configPath, "utf8"));

const FORK_OWNER = cfg.fork.owner;
const FORK_REPO = cfg.fork.repo;
const UPSTREAM_OWNER = cfg.upstream.owner;
const UPSTREAM_REPO = cfg.upstream.repo;
const FORK = `${FORK_OWNER}/${FORK_REPO}`;
const UPSTREAM = `${UPSTREAM_OWNER}/${UPSTREAM_REPO}`;
const WORK = cfg.branches.work;
const STAGING = cfg.branches.staging;
const RELEASE = cfg.branches.release;
const UPSTREAM_WORK = cfg.branches.upstreamWork;
const TARGET = cfg.branches.upstreamTarget;
const FORK_TOKEN = process.env.FORK_TOKEN || "";
const UPSTREAM_TOKEN = process.env.UPSTREAM_TOKEN || "";
// Fingerprint of the imported bot key. Empty means signing is off and the
// run behaves as before.
const SIGNING_KEY = process.env.RELEASE_SIGNING_KEY_ID || "";
// zeduchat/staging requires verified commits, and a signature only verifies
// when the key belongs to a GitHub account with this exact address. The
// manifest is the default so local runs still work; the repository variable
// lets an operator point at the bot account without touching the manifest.
const BOT_EMAIL = process.env.RELEASE_BOT_EMAIL || cfg.bot.email;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

// Git credentials travel with each command instead of the remote URLs. The
// workflow runs `pnpm install` and `next build` in this same checkout, so a
// token left in .git/config would be readable by candidate-controlled code.
function basicAuth(token) {
  const pair = Buffer.from(`x-access-token:${token}`).toString("base64");
  return `AUTHORIZATION: basic ${pair}`;
}

const GIT_AUTH_ARGS = [
  FORK_TOKEN && [
    "-c",
    `http.https://github.com/${FORK}.git.extraheader=${basicAuth(FORK_TOKEN)}`,
  ],
  UPSTREAM_TOKEN && [
    "-c",
    `http.https://github.com/${UPSTREAM}.git.extraheader=${basicAuth(
      UPSTREAM_TOKEN
    )}`,
  ],
]
  .filter((entry) => entry && entry.length > 0)
  .flat();

class HaltError extends Error {}

function log(message) {
  console.log(`[release-sync] ${message}`);
}

function run(cmd, args, options = {}) {
  const { allowFail = false, input, env } = options;
  const finalArgs = cmd === "git" ? [...GIT_AUTH_ARGS, ...args] : args;
  const baseEnv =
    cmd === "gh" ? { ...GIT_ENV, GH_TOKEN: UPSTREAM_TOKEN } : GIT_ENV;
  const result = spawnSync(cmd, finalArgs, {
    cwd: repoDir,
    env: env ? { ...baseEnv, ...env } : baseEnv,
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) throw result.error;

  if (result.status !== 0 && !allowFail) {
    throw new Error(
      `${cmd} ${args.join(" ")} exited with ${result.status}\n${
        result.stderr || result.stdout
      }`
    );
  }

  return result;
}

function git(args, options) {
  return run("git", args, options);
}

function gitOut(args, options) {
  return run("git", args, options).stdout.trim();
}

function gitResult(args, options) {
  return run("git", args, options);
}

function gh(args, options) {
  return run("gh", args, options).stdout.trim();
}

function ghResult(args, options) {
  return run("gh", args, options);
}

function normalize(entry) {
  return entry.replace(/\/+$/, "");
}

function matchesAny(entries, filePath) {
  return entries.some((entry) => {
    const clean = normalize(entry);
    return filePath === clean || filePath.startsWith(`${clean}/`);
  });
}

function isProtected(filePath) {
  return matchesAny(cfg.protected, filePath);
}

function setup() {
  if (!FORK_TOKEN) throw new Error("FORK_TOKEN is not set");
  if (!UPSTREAM_TOKEN) throw new Error("UPSTREAM_TOKEN is not set");

  const originUrl = `https://github.com/${FORK}.git`;
  const upstreamUrl = `https://github.com/${UPSTREAM}.git`;

  git(["remote", "set-url", "origin", originUrl], { allowFail: true });
  if (
    git(["remote", "add", "upstream", upstreamUrl], { allowFail: true })
      .status !== 0
  ) {
    git(["remote", "set-url", "upstream", upstreamUrl]);
  }
  git(["config", "user.name", cfg.bot.name]);
  git(["config", "user.email", BOT_EMAIL]);
  git(["config", "advice.detachedHead", "false"]);

  enableSigning();
}

// Signs every commit the bot creates. `commit.gpgsign` covers the sync merges
// and the release candidate commit without threading `-S` through each call
// site. Missing key material fails here, before any branch is touched.
function enableSigning() {
  if (!SIGNING_KEY) {
    // Do not inherit a developer's global signing setup for pushed commits.
    git(["config", "commit.gpgsign", "false"], { allowFail: true });
    git(["config", "tag.gpgsign", "false"], { allowFail: true });
    log("RELEASE_SIGNING_KEY_ID is not set; commits will be unsigned.");
    return false;
  }

  const keyring = run("gpg", ["--batch", "--list-secret-keys", SIGNING_KEY], {
    allowFail: true,
  });

  if (keyring.status !== 0) {
    throw new Error(
      `RELEASE_SIGNING_KEY_ID ${SIGNING_KEY} is not in the keyring; ` +
        "import the private key before running this script"
    );
  }

  git(["config", "user.signingkey", SIGNING_KEY]);
  // A developer machine may default to SSH signing; the bot key is OpenPGP.
  git(["config", "gpg.format", "openpgp"]);
  git(["config", "commit.gpgsign", "true"]);
  git(["config", "tag.gpgsign", "true"]);
  log(`Signing commits as ${BOT_EMAIL} with ${SIGNING_KEY}.`);
  return true;
}

// zeduchat/staging only accepts verified signatures, and a valid signature
// from an unknown key still shows as unverified. Check the pushed head before
// opening a PR that could never be merged, and say exactly what is missing.
function assertVerified(sha) {
  if (!SIGNING_KEY) return;

  const result = run(
    "gh",
    ["api", `repos/${FORK}/commits/${sha}`, "--jq", ".commit.verification"],
    { allowFail: true, env: { GH_TOKEN: FORK_TOKEN } }
  );

  if (result.status !== 0) {
    log(`Could not read signature status for ${sha}: ${result.stderr.trim()}`);
    return;
  }

  let verification = {};
  try {
    verification = JSON.parse(result.stdout);
  } catch {
    log(`Could not parse signature status for ${sha}.`);
    return;
  }

  if (verification.verified) return;

  throw new HaltError(
    `Head ${sha} is not a verified commit (${verification.reason || "unknown"}). ` +
      `zeduchat/${TARGET} requires signatures that GitHub can verify: upload the ` +
      `bot's public key to a GitHub account whose verified email is ${BOT_EMAIL}, ` +
      "or point RELEASE_BOT_EMAIL at that address."
  );
}

function fetchAll() {
  git(["fetch", "--prune", "origin"]);
  git(["fetch", "--prune", "upstream"]);
}

function rev(ref) {
  return gitOut(["rev-parse", "--verify", `${ref}^{commit}`]);
}

function isAncestor(ancestor, descendant) {
  return (
    gitResult(["merge-base", "--is-ancestor", ancestor, descendant], {
      allowFail: true,
    }).status === 0
  );
}

function behind(from, to) {
  return Number.parseInt(gitOut(["rev-list", "--count", `${from}..${to}`]), 10);
}

function existsIn(ref, filePath) {
  return (
    gitResult(["cat-file", "-e", `${ref}:${filePath}`], { allowFail: true })
      .status === 0
  );
}

function checkout(branch, ref) {
  git(["checkout", "-q", "-B", branch, ref]);
}

function unmergedFiles() {
  const raw = run("git", [
    "diff",
    "--name-only",
    "--diff-filter=U",
    "-z",
  ]).stdout;
  return raw.split("\0").filter(Boolean);
}

function resolveConflict(filePath, favor) {
  const stage = favor === "ours" ? 2 : 3;
  const present =
    gitResult(["cat-file", "-e", `:${stage}:${filePath}`], {
      allowFail: true,
    }).status === 0;

  if (present) {
    git(["checkout", `--${favor}`, "--", filePath]);
  } else {
    git(["rm", "-f", "--ignore-unmatch", "--", filePath], { allowFail: true });
  }

  git(["add", "-A", "--", filePath]);
}

function restoreProtected(ref) {
  for (const entry of cfg.protected) {
    const clean = normalize(entry);
    git(["rm", "-r", "-q", "--ignore-unmatch", "--", clean], {
      allowFail: true,
    });
    git(["clean", "-fdq", "--", clean], { allowFail: true });
    if (existsIn(ref, clean)) git(["checkout", ref, "--", clean]);
  }
  git(["add", "-A"]);
}

function syncBranch({ branch, source, authority, favor, label }) {
  fetchAll();

  const remoteRef = `origin/${branch}`;
  if (isAncestor(source, remoteRef)) return false;

  const temporaryBranch = `sync/${branch.replaceAll("/", "-")}`;
  checkout(temporaryBranch, remoteRef);

  const merge = git(["merge", "--no-ff", "--no-commit", source], {
    allowFail: true,
  });

  if (merge.status !== 0) {
    const conflicts = unmergedFiles();

    if (conflicts.length === 0) {
      git(["merge", "--abort"], { allowFail: true });
      throw new Error(
        `Merging ${source} into ${branch} failed:\n${
          merge.stderr || merge.stdout
        }`
      );
    }

    const blocked = conflicts.filter((filePath) => !isProtected(filePath));

    if (blocked.length > 0) {
      git(["merge", "--abort"], { allowFail: true });
      throw new HaltError(
        `Conflicts outside protected paths while merging ${source} into ${branch}: ${blocked.join(
          ", "
        )}`
      );
    }

    for (const filePath of conflicts) resolveConflict(filePath, favor);
  }

  restoreProtected(authority === "remote" ? remoteRef : authority);

  const hasMerge =
    gitResult(["rev-parse", "-q", "--verify", "MERGE_HEAD"], {
      allowFail: true,
    }).status === 0;

  if (!hasMerge) {
    const dirty = gitOut(["status", "--porcelain", "--untracked-files=no"]);
    if (!dirty) return false;
  }

  git([
    "commit",
    "-q",
    "--no-verify",
    "-m",
    `chore(sync): absorb ${label} into ${branch} [skip release]`,
  ]);

  if (!dryRun) {
    git(["push", "-q", "origin", `HEAD:refs/heads/${branch}`]);
    fetchAll();
  }

  return true;
}

function checkInvariants() {
  const errors = [];

  const workBehind = behind(`origin/${WORK}`, `upstream/${UPSTREAM_WORK}`);
  if (workBehind > 0) {
    errors.push(`${WORK} is ${workBehind} behind upstream/${UPSTREAM_WORK}`);
  }

  const stagingBehind = behind(`origin/${STAGING}`, `upstream/${TARGET}`);
  if (stagingBehind > 0) {
    errors.push(`${STAGING} is ${stagingBehind} behind upstream/${TARGET}`);
  }

  const stagingMissing = behind(`origin/${STAGING}`, `origin/${WORK}`);
  if (stagingMissing > 0) {
    errors.push(`${STAGING} is missing ${stagingMissing} commits from ${WORK}`);
  }

  for (const required of cfg.requiredOnStaging) {
    if (!existsIn(`origin/${STAGING}`, required)) {
      errors.push(`${STAGING} is missing required path ${required}`);
    }
  }

  return errors;
}

function verifyReleaseDiff(base) {
  const raw = run("git", ["diff", "--name-only", "-z", `${base}..HEAD`]).stdout;
  const paths = raw.split("\0").filter(Boolean);
  const allowed = [...cfg.replaceWithUpstream, ...cfg.remove];
  const unexpected = paths.filter((filePath) => !matchesAny(allowed, filePath));

  if (unexpected.length > 0) {
    throw new HaltError(
      `Release candidate changed paths outside the manifest: ${unexpected.join(
        ", "
      )}`
    );
  }
}

function buildReleaseCandidate() {
  checkout(RELEASE, `origin/${STAGING}`);
  const base = rev(`origin/${STAGING}`);

  for (const entry of cfg.replaceWithUpstream) {
    const clean = normalize(entry);
    git(["rm", "-r", "-q", "--ignore-unmatch", "--", clean], {
      allowFail: true,
    });
    git(["clean", "-fdq", "--", clean], { allowFail: true });
    if (existsIn(`upstream/${TARGET}`, clean)) {
      git(["checkout", `upstream/${TARGET}`, "--", clean]);
    }
  }

  for (const entry of cfg.remove) {
    const clean = normalize(entry);
    git(["rm", "-r", "-q", "--ignore-unmatch", "--", clean], {
      allowFail: true,
    });
    git(["clean", "-fdq", "--", clean], { allowFail: true });
  }

  const changed = gitOut(["status", "--porcelain", "--untracked-files=no"]);

  if (changed) {
    const baseDate = gitOut(["show", "-s", "--format=%cI", base]);
    git(
      [
        "commit",
        "-q",
        "--no-verify",
        "-m",
        `chore(release): prepare ${TARGET} release candidate [skip release]`,
      ],
      {
        env: {
          GIT_AUTHOR_DATE: baseDate,
          GIT_COMMITTER_DATE: baseDate,
        },
      }
    );
  }

  const rcSha = rev("HEAD");
  const generatedAt = gitOut(["show", "-s", "--format=%cI", "HEAD"]);
  const noop =
    gitResult(["diff", "--quiet", `upstream/${TARGET}`, "HEAD"], {
      allowFail: true,
    }).status === 0;

  if (!noop) verifyReleaseDiff(base);

  for (const filePath of cfg.mustBeAbsentInRelease) {
    if (existsIn("HEAD", normalize(filePath))) {
      throw new HaltError(
        `Bootcamp path leaked into release candidate: ${filePath}`
      );
    }
  }

  return { rcSha, csSha: base, noop, generatedAt };
}

function writeState(state) {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `noop=${state.noop}\nunchanged=${state.unchanged}\nrc_sha=${state.rcSha}\n`,
      { flag: "a" }
    );
  }
}

function prepare() {
  setup();

  let didWork = 0;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    fetchAll();

    if (behind(`origin/${WORK}`, `upstream/${UPSTREAM_WORK}`) > 0) {
      const changed = syncBranch({
        branch: WORK,
        source: `upstream/${UPSTREAM_WORK}`,
        authority: "remote",
        favor: "ours",
        label: `upstream/${UPSTREAM_WORK}`,
      });
      if (changed) didWork += 1;
    }

    fetchAll();

    if (behind(`origin/${STAGING}`, `upstream/${TARGET}`) > 0) {
      const changed = syncBranch({
        branch: STAGING,
        source: `upstream/${TARGET}`,
        authority: `origin/${WORK}`,
        favor: "ours",
        label: `upstream/${TARGET}`,
      });
      if (changed) didWork += 1;
    }

    fetchAll();

    if (behind(`origin/${STAGING}`, `origin/${WORK}`) > 0) {
      const changed = syncBranch({
        branch: STAGING,
        source: `origin/${WORK}`,
        authority: `origin/${WORK}`,
        favor: "theirs",
        label: WORK,
      });
      if (changed) didWork += 1;
    }

    fetchAll();

    const errors = checkInvariants();
    if (errors.length === 0) break;

    if (didWork === 0) {
      throw new HaltError(
        `Branch invariants failed:\n- ${errors.join("\n- ")}`
      );
    }

    if (attempt === cfg.maxAttempts) {
      throw new HaltError(
        `Branch invariants are still failing after ${attempt} attempts:\n- ${errors.join(
          "\n- "
        )}`
      );
    }
  }

  const result = buildReleaseCandidate();
  const openPr = findOpenPr();
  const unchanged = Boolean(openPr && openPr.headRefOid === result.rcSha);
  const state = {
    phase: "prepared",
    noop: result.noop,
    unchanged,
    branch: RELEASE,
    target: TARGET,
    rcSha: result.rcSha,
    csSha: result.csSha,
    devSha: rev(`origin/${WORK}`),
    targetSha: rev(`upstream/${TARGET}`),
    generatedAt: result.generatedAt,
  };

  writeState(state);
  log(
    state.noop
      ? "Release candidate matches upstream; nothing to release."
      : `Prepared release candidate ${state.rcSha}.`
  );
}

function releaseTitle() {
  return `release: ${FORK_OWNER} ${WORK} -> ${UPSTREAM_REPO}:${TARGET}`;
}

function buildPrBody(state) {
  const range = `upstream/${TARGET}..${state.rcSha}`;
  const mergeLines = gitOut(["log", "--merges", "--format=%s", range])
    .split("\n")
    .filter(Boolean)
    .filter((line) => !/sync\//i.test(line));
  const pullNumbers = [
    ...new Set(
      [...mergeLines.join("\n").matchAll(/Merge pull request #(\d+)/g)].map(
        (match) => match[1]
      )
    ),
  ];
  const commits = gitOut(["log", "--no-merges", "--format=- %s (`%h`)", range])
    .split("\n")
    .filter(
      (line) => line && !/\[skip release\]|chore\((sync|release)\)/i.test(line)
    )
    .slice(0, 80);

  const pullList =
    pullNumbers.length > 0
      ? pullNumbers.map((number) => `- #${number}`).join("\n")
      : "- No pull requests detected in this range.";
  const commitList =
    commits.length > 0
      ? commits.join("\n")
      : "- No commits detected in this range.";

  return [
    "## Release summary",
    "",
    `- Source branch: \`${FORK}:${STAGING}\` at \`${state.csSha}\``,
    `- Work branch: \`${FORK}:${WORK}\` at \`${state.devSha}\``,
    `- Base: \`${UPSTREAM}:${TARGET}\` at \`${state.targetSha}\``,
    `- Release head: \`${FORK}:${state.branch}\` at \`${state.rcSha}\``,
    `- Generated: ${state.generatedAt}`,
    "- Sync checks: 0 commits behind target; contains the latest work branch; protected paths verified.",
    "",
    "## Included pull requests",
    "",
    pullList,
    "",
    "## Commits",
    "",
    commitList,
    "",
    "## Release hygiene",
    "",
    `- Reset to upstream: ${cfg.replaceWithUpstream.join(", ")}`,
    `- Removed: ${cfg.remove.join(", ") || "none"}`,
    "- Build, lint, typecheck, and format checks ran on this head before publishing.",
    "",
    "This pull request is updated automatically on every merge to the work branch. Merge with a merge commit; do not squash.",
    "",
  ].join("\n");
}

// `gh pr list --head` does not accept the "<owner>:<branch>" form, so ask for
// the bare branch and keep only the fork's own PRs. Both PR lookups go through
// here so the filter cannot drift.
function listReleasePrs(state, fields, options = {}) {
  const result = ghResult(
    [
      "pr",
      "list",
      "--repo",
      UPSTREAM,
      "--head",
      RELEASE,
      "--base",
      TARGET,
      "--state",
      state,
      "--json",
      `${fields},headRepositoryOwner`,
      "--limit",
      "50",
    ],
    options
  );

  if (result.status !== 0) return null;

  let list = [];
  try {
    list = JSON.parse(result.stdout.trim() || "[]");
  } catch {
    return null;
  }

  return list.filter(
    (pr) =>
      pr.headRepositoryOwner &&
      pr.headRepositoryOwner.login.toLowerCase() === FORK_OWNER.toLowerCase()
  );
}

function findOpenPr() {
  const list = listReleasePrs("open", "number,url,headRefOid");
  return list && list.length > 0 ? list[0] : null;
}

function closeOpenPr(message) {
  const pr = findOpenPr();
  if (!pr) return;

  ghResult(
    ["pr", "comment", String(pr.number), "--repo", UPSTREAM, "--body", message],
    { allowFail: true }
  );
  ghResult(["pr", "close", String(pr.number), "--repo", UPSTREAM], {
    allowFail: true,
  });
  log(`Closed release PR #${pr.number}.`);
}

function remoteBranchSha(branch) {
  const result = gitResult(
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    { allowFail: true }
  );

  if (result.status !== 0) return null;
  const line = result.stdout.trim().split("\n").filter(Boolean)[0];
  return line ? line.split(/\s+/)[0] : null;
}

function pushReleaseBranch(branch, headSha) {
  gitResult(
    [
      "fetch",
      "-q",
      "origin",
      `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
    ],
    { allowFail: true }
  );

  const remoteSha = remoteBranchSha(branch);
  if (remoteSha === headSha) return false;

  if (remoteSha) {
    git([
      "push",
      "-q",
      "--force-with-lease",
      "origin",
      `HEAD:refs/heads/${branch}`,
    ]);
  } else {
    git(["push", "-q", "-u", "origin", `HEAD:refs/heads/${branch}`]);
  }

  return true;
}

function addReleaseLabel(number) {
  if (!cfg.releaseLabel) return;

  const labelsResult = ghResult(
    [
      "label",
      "list",
      "--repo",
      UPSTREAM,
      "--search",
      cfg.releaseLabel,
      "--json",
      "name",
      "--limit",
      "100",
    ],
    { allowFail: true }
  );

  if (labelsResult.status !== 0) return;

  let labels = [];
  try {
    labels = JSON.parse(labelsResult.stdout || "[]");
  } catch {
    return;
  }

  if (!labels.some((label) => label.name === cfg.releaseLabel)) return;

  ghResult(
    [
      "pr",
      "edit",
      String(number),
      "--repo",
      UPSTREAM,
      "--add-label",
      cfg.releaseLabel,
    ],
    { allowFail: true }
  );
}

function maybeTag() {
  if (!cfg.tagReleases) return;

  const merged = listReleasePrs("merged", "number,mergeCommit,mergedAt", {
    allowFail: true,
  });

  if (!merged) return;

  for (const pr of merged) {
    const sha = pr.mergeCommit && pr.mergeCommit.oid;
    if (!sha || !pr.mergedAt) continue;

    const tagList = gitResult(
      ["ls-remote", "--tags", "upstream", "release-*", "release-*^{}"],
      { allowFail: true }
    );
    if (tagList.status !== 0) return;
    if (tagList.stdout.includes(sha)) continue;

    const date = pr.mergedAt.slice(0, 10);
    const pattern = new RegExp(`refs/tags/release-${date}\\.(\\d+)`, "g");
    const used = [...tagList.stdout.matchAll(pattern)].map((match) =>
      Number(match[1])
    );
    const next = (used.length > 0 ? Math.max(...used) : 0) + 1;
    const tag = `release-${date}.${next}`;

    const created = ghResult(
      [
        "api",
        "--method",
        "POST",
        `repos/${UPSTREAM}/git/refs`,
        "-f",
        `ref=refs/tags/${tag}`,
        "-f",
        `sha=${sha}`,
      ],
      { allowFail: true }
    );

    if (created.status === 0) {
      log(`Tagged ${tag} at ${sha}.`);
    } else {
      log(`Could not tag ${tag}: ${created.stderr.trim()}`);
    }
  }
}

function publish() {
  if (!existsSync(statePath)) {
    throw new Error(`Missing release state at ${statePath}`);
  }

  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.phase !== "prepared") {
    throw new Error("Release state is not in the prepared phase");
  }

  setup();

  if (state.noop) {
    closeOpenPr(
      "No application changes to release. The release candidate matches upstream, so this rolling PR is being closed."
    );
    maybeTag();
    log("No-op release; nothing to publish.");
    return;
  }

  const head = state.rcSha;
  gitResult(
    [
      "fetch",
      "-q",
      "origin",
      `+refs/heads/${state.branch}:refs/remotes/origin/${state.branch}`,
    ],
    { allowFail: true }
  );
  checkout(state.branch, head);
  git(["reset", "--hard", "-q", head]);
  git(["clean", "-fdq"]);

  pushReleaseBranch(state.branch, head);
  assertVerified(head);

  const existing = findOpenPr();

  if (existing && existing.headRefOid === head) {
    log("Release PR is already up to date.");
    maybeTag();
    return;
  }

  const bodyPath = join(
    process.env.RUNNER_TEMP || os.tmpdir(),
    "release-pr-body.md"
  );
  writeFileSync(bodyPath, buildPrBody(state));

  let number = existing ? existing.number : null;

  if (number) {
    gh([
      "pr",
      "edit",
      String(number),
      "--repo",
      UPSTREAM,
      "--title",
      releaseTitle(),
      "--body-file",
      bodyPath,
    ]);
  } else {
    const url = gh([
      "pr",
      "create",
      "--repo",
      UPSTREAM,
      "--head",
      `${FORK_OWNER}:${state.branch}`,
      "--base",
      state.target,
      "--title",
      releaseTitle(),
      "--body-file",
      bodyPath,
    ]);
    const match = url.match(/\/pull\/(\d+)/);
    number = match ? Number(match[1]) : null;
  }

  if (number) addReleaseLabel(number);
  maybeTag();
  log(`Published ${state.branch} to ${UPSTREAM}:${state.target}.`);
}

try {
  if (phase === "prepare") {
    prepare();
  } else if (phase === "publish") {
    publish();
  } else {
    throw new Error(`Unknown phase: ${phase}`);
  }
} catch (error) {
  const kind = error instanceof HaltError ? "HALT" : "ERROR";
  console.error(`[release-sync] ${kind}: ${error.message}`);
  process.exit(1);
}
