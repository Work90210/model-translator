/**
 * Syncs CHANGELOG.md entries into the Fumadocs changelog MDX page.
 *
 * Called by the release-please workflow after a new release is created.
 * Reads the root CHANGELOG.md (maintained by release-please) and writes
 * a formatted version to apps/web/content/docs/changelog.mdx.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CHANGELOG_PATH = resolve(ROOT, 'CHANGELOG.md');
const MDX_PATH = resolve(ROOT, 'apps/web/content/docs/changelog.mdx');

const MDX_HEADER = `---
title: Changelog
description: Release history and notable changes for APIFold.
---

`;

function parseChangelog(content) {
  const sections = [];
  let current = null;

  for (const line of content.split('\n')) {
    // Match version headers: ## [0.2.0](link) (2026-04-15) or ## 0.2.0
    const versionMatch = line.match(
      /^## \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?/,
    );
    if (versionMatch) {
      current = {
        version: versionMatch[1],
        date: versionMatch[2] ?? '',
        lines: [],
      };
      sections.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  return sections;
}

function formatForMdx(sections) {
  const formatted = sections.map((section) => {
    const dateStr = section.date
      ? ` -- ${new Date(section.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      : '';
    const header = `## v${section.version}${dateStr}`;
    const body = section.lines.join('\n').trim();
    return `${header}\n\n${body}`;
  });

  return formatted.join('\n\n---\n\n');
}

function main() {
  if (!existsSync(CHANGELOG_PATH)) {
    console.log('No CHANGELOG.md found, skipping sync.');
    return;
  }

  const changelog = readFileSync(CHANGELOG_PATH, 'utf-8');
  const sections = parseChangelog(changelog);

  if (sections.length === 0) {
    console.log('No version sections found in CHANGELOG.md, skipping.');
    return;
  }

  const mdxContent = MDX_HEADER + formatForMdx(sections) + '\n';
  writeFileSync(MDX_PATH, mdxContent);
  console.log(
    `Synced ${sections.length} release(s) to ${MDX_PATH}`,
  );
}

main();
