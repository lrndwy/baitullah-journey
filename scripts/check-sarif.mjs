#!/usr/bin/env node
/**
 * Fails a build when a SARIF report contains a high or critical finding.
 *
 * This exists because uploading a SARIF to GitHub's code scanning requires
 * Advanced Security, which a private repository only has on a paid plan. Without
 * this check, the CodeQL job would produce a report and nobody would ever see
 * it — the analysis would be decorative.
 *
 * Usage: node scripts/check-sarif.mjs <dir-or-file> [--threshold 7]
 *
 * `security-severity` is a CVSS score carried in the rule metadata; 7.0 is the
 * high threshold, 9.0 critical. Results without one are not scored and do not
 * block, which matches how code scanning treats them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const target = process.argv[2] ?? 'sarif-results'
const thresholdFlag = process.argv.indexOf('--threshold')
const threshold = thresholdFlag === -1 ? 7 : Number(process.argv[thresholdFlag + 1])

function sarifFiles(path) {
  if (statSync(path).isFile()) return [path]
  return readdirSync(path)
    .filter((name) => name.endsWith('.sarif'))
    .map((name) => join(path, name))
}

const files = sarifFiles(target)
if (files.length === 0) {
  console.error(`No SARIF files under ${target} — the analysis did not produce a report.`)
  process.exit(1)
}

const findings = []
let scanned = 0

for (const file of files) {
  const sarif = JSON.parse(readFileSync(file, 'utf8'))
  for (const run of sarif.runs ?? []) {
    const severityByRule = new Map(
      (run.tool?.driver?.rules ??[]).map((rule) => [
        rule.id,
        Number(rule.properties?.['security-severity'] ?? 0),
      ]),
    )

    for (const result of run.results ?? []) {
      scanned += 1
      // The score lives on the rule, and a result may override it.
      const score = Number(
        result.properties?.['security-severity'] ?? severityByRule.get(result.ruleId) ?? 0,
      )
      if (score >= threshold) {
        findings.push({
          file,
          rule: result.ruleId,
          score,
          level: result.level ?? 'warning',
          location: result.locations?.[0]?.physicalLocation?.artifactLocation?.uri ?? '(no location)',
          line: result.locations?.[0]?.physicalLocation?.region?.startLine,
        })
      }
    }
  }
}

for (const finding of findings) {
  const at = finding.line ? `${finding.location}:${finding.line}` : finding.location
  console.error(`${finding.score.toFixed(1)}  ${finding.rule}  ${at}`)
}

console.log(
  findings.length === 0
    ? `${scanned} result(s) scanned, none at or above ${threshold}.`
    : `${findings.length} finding(s) at or above ${threshold} (${scanned} scanned).`,
)

process.exit(findings.length === 0 ? 0 : 1)
