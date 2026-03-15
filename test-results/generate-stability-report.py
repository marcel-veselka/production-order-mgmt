#!/usr/bin/env python3
"""Generate stability comparison report from 5 batch runs."""
import json, os, re, time, sys, statistics, html as html_mod

DIR = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(os.path.dirname(DIR), "openspec", "test-plan.md")
REPORT = os.path.join(DIR, "stability-report.html")
STAB_DIR = os.path.join(DIR, "stability")
NUM_BATCHES = 5
NUM_TCS = 250

SECTIONS = [
    ("Auth", range(1, 31)),
    ("Dashboard", range(31, 56)),
    ("Orders", range(56, 126)),
    ("Workflows", range(126, 191)),
    ("Settings", range(191, 231)),
    ("Cross-cutting", range(231, 251)),
]


def parse_plan():
    tc_meta = {}
    for line in open(PLAN):
        m = re.match(r'\|\s*(TC\d{3})\s*\|\s*(.+?)\s*\|\s*(\d)\s*\|\s*(.+?)\s*\|', line)
        if m:
            tc_meta[m.group(1)] = {
                "title": m.group(2).strip(),
                "priority": int(m.group(3)),
                "role": m.group(4).strip(),
            }
    return tc_meta


def load_batch(batch_num):
    """Load merged results for a batch. Returns (results_list, num_groups) or (None, 0)."""
    path = os.path.join(STAB_DIR, f"batch-{batch_num}", "results.json")
    if os.path.exists(path):
        try:
            data = json.load(open(path))
            rmap = {r["tc"]: r for r in data}
            results = [rmap.get(f"TC{i:03d}", {"tc": f"TC{i:03d}", "status": "NOT_RUN", "duration_ms": 0, "notes": "", "attempts": 1, "retries": []}) for i in range(1, NUM_TCS + 1)]
            return results, 10  # results.json = fully merged = 10 groups
        except:
            pass
    # Try merging group files
    batch_dir = os.path.join(STAB_DIR, f"batch-{batch_num}")
    if not os.path.isdir(batch_dir):
        return None, 0
    rmap = {}
    num_groups = 0
    for f in sorted(os.listdir(batch_dir)):
        if f.startswith("group-") and f.endswith(".json"):
            try:
                for r in json.load(open(os.path.join(batch_dir, f))):
                    rmap[r["tc"]] = r
                num_groups += 1
            except:
                pass
    if not rmap:
        return None, 0
    results = [rmap.get(f"TC{i:03d}", {"tc": f"TC{i:03d}", "status": "NOT_RUN", "duration_ms": 0, "notes": "", "attempts": 1, "retries": []}) for i in range(1, NUM_TCS + 1)]
    return results, num_groups


def fmt_dur(ms):
    if not ms or ms <= 0:
        return "\u2014"
    if ms < 1000:
        return f"{ms}ms"
    s = ms / 1000
    if s < 60:
        return f"{s:.1f}s"
    m = int(s // 60)
    s = s % 60
    return f"{m}m {s:.0f}s"


def esc(text):
    return html_mod.escape(str(text)) if text else ""


def get_batch_progress():
    """Get live progress info for all batches — groups saved, TCs completed."""
    progress = {}
    for b in range(1, NUM_BATCHES + 1):
        batch_dir = os.path.join(STAB_DIR, f"batch-{b}")
        groups_done = 0
        tcs_done = 0
        tcs_pass = 0
        tcs_fail = 0
        if os.path.isdir(batch_dir):
            for f in sorted(os.listdir(batch_dir)):
                if f.startswith("group-") and f.endswith(".json"):
                    try:
                        data = json.load(open(os.path.join(batch_dir, f)))
                        groups_done += 1
                        tcs_done += len(data)
                        tcs_pass += sum(1 for r in data if r.get("status") == "PASS")
                        tcs_fail += sum(1 for r in data if r.get("status") == "FAIL")
                    except:
                        pass
        progress[b] = {"groups": groups_done, "tcs": tcs_done, "pass": tcs_pass, "fail": tcs_fail}
    return progress


def generate_html(batches, tc_meta):
    """batches: list of (batch_num, results_list_or_None, num_groups)"""
    # A batch is "completed" only when all 10 groups are done
    completed = [(b, r) for b, r, ng in batches if r is not None and ng >= 10]
    # All batches with any data (for progress display)
    with_data = [(b, r, ng) for b, r, ng in batches if r is not None]
    num_done = len(completed)
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    batch_progress = get_batch_progress()

    # All batches with any data (completed or partial) for display
    all_with_data = [(b, r) for b, r, ng in batches if r is not None]

    # ===== Cross-batch analysis =====
    # For each TC, collect statuses across all batches with data (including partial)
    tc_cross = {}  # tc -> {statuses: [...], durations: [...], attempts: [...], retries_details: [...]}
    for i in range(1, NUM_TCS + 1):
        tc = f"TC{i:03d}"
        statuses = []
        durations = []
        attempts_list = []
        retries_all = []
        for b, results in all_with_data:
            r = results[i - 1]
            statuses.append(r["status"])
            if r.get("duration_ms", 0) > 0:
                durations.append(r["duration_ms"])
            attempts_list.append(r.get("attempts", 1))
            retries_all.extend(r.get("retries", []))
        tc_cross[tc] = {
            "statuses": statuses,
            "durations": durations,
            "attempts": attempts_list,
            "retries": retries_all,
        }

    # Stability metrics
    stable_pass = 0
    stable_fail = 0
    stable_skip = 0
    flaky_tcs = []
    retry_dependent = []
    all_unique_statuses = set()

    for tc, data in tc_cross.items():
        unique = set(s for s in data["statuses"] if s != "NOT_RUN")
        all_unique_statuses.update(unique)
        non_skip = [s for s in data["statuses"] if s not in ("SKIP", "NOT_RUN")]
        # For flakiness, only consider statuses that actually ran (exclude SKIP/NOT_RUN)
        unique_ran = set(non_skip)

        if len(unique) == 0:
            continue
        elif len(unique_ran) == 0:
            # Only SKIP/NOT_RUN — count as skipped
            stable_skip += 1
        elif len(unique_ran) == 1:
            s = list(unique_ran)[0]
            if s == "PASS":
                stable_pass += 1
            elif s == "FAIL":
                stable_fail += 1
        else:
            # Actually flaky: produced both PASS and FAIL across batches
            flaky_tcs.append(tc)

        if data["attempts"] and max(data["attempts"]) > 1:
            retry_dependent.append(tc)

    # Flakiness score per TC: % of batches differing from majority
    flakiness_scores = {}
    for tc, data in tc_cross.items():
        non_skip = [s for s in data["statuses"] if s not in ("SKIP", "NOT_RUN")]
        if len(non_skip) == 0:
            flakiness_scores[tc] = 0
            continue
        from collections import Counter
        counts = Counter(non_skip)
        majority = counts.most_common(1)[0][1]
        minority = len(non_skip) - majority
        flakiness_scores[tc] = minority / len(non_skip) * 100 if len(non_skip) > 0 else 0

    # Retry-saved: tests that failed on first attempt but passed after retry
    retry_saved = []
    for tc, data in tc_cross.items():
        if data["attempts"] and max(data["attempts"]) > 1:
            # Check if any batch had retries that "saved" the test
            for b, results in all_with_data:
                r = results[int(tc[2:]) - 1]
                if r.get("attempts", 1) > 1 and r["status"] == "PASS":
                    retry_saved.append(tc)
                    break

    # Overall stability score
    total_evaluated = stable_pass + stable_fail + stable_skip + len(flaky_tcs)
    stability_score = stable_pass / total_evaluated * 100 if total_evaluated > 0 else 0

    # Interim pass rate from all available data
    all_pass_count = sum(1 for tc, data in tc_cross.items() if any(s == "PASS" for s in data["statuses"]))
    all_fail_count = sum(1 for tc, data in tc_cross.items() if any(s == "FAIL" for s in data["statuses"]))
    all_executed = all_pass_count + all_fail_count
    interim_pass_rate = all_pass_count / all_executed * 100 if all_executed > 0 else 0

    # Assessment
    if num_done < 2:
        assessment = "Collecting Data"
        assessment_color = "#2563eb"
        if all_executed > 0:
            assessment_desc = f"Running stability tests \u2014 {num_done} of {NUM_BATCHES} batches complete. Interim pass rate: {interim_pass_rate:.1f}% ({all_pass_count}/{all_executed} tests). Full stability assessment requires at least 2 completed batches."
        else:
            assessment_desc = f"Running stability tests \u2014 {num_done} of {NUM_BATCHES} batches complete. No results yet. Full stability assessment requires at least 2 completed batches."
    elif stability_score >= 95 and len(flaky_tcs) <= 3:
        assessment = "Ship Ready"
        assessment_color = "#16a34a"
        assessment_desc = f"The test suite is stable and ready for release. {stable_pass} of {total_evaluated} tests pass consistently across all {num_done} batches with {len(flaky_tcs)} flaky test(s)."
    elif stability_score >= 85 and len(flaky_tcs) <= 10:
        assessment = "Ship with Caution"
        assessment_color = "#f59e0b"
        assessment_desc = f"{len(flaky_tcs)} test(s) show inconsistent results across runs. Review flaky tests below before shipping. {stable_pass} of {total_evaluated} tests are fully stable."
    else:
        assessment = "Do Not Ship"
        assessment_color = "#dc2626"
        assessment_desc = f"Significant instability detected. {len(flaky_tcs)} flaky tests and {stable_fail} consistent failures across {num_done} batches. Address issues before release."

    # Recommendations
    recommendations = []
    # Identify high-failure-rate flaky tests (fail in >= 50% of runs) — these are likely real bugs
    high_fail_rate = []
    mostly_passing_flaky = []
    for tc in flaky_tcs:
        data = tc_cross[tc]
        non_skip = [s for s in data["statuses"] if s not in ("SKIP", "NOT_RUN")]
        from collections import Counter
        counts = Counter(non_skip)
        if len(non_skip) >= 2 and counts.get("FAIL", 0) >= counts.get("PASS", 0):
            high_fail_rate.append(tc)
        else:
            mostly_passing_flaky.append(tc)
    if high_fail_rate:
        recommendations.append(f"{len(high_fail_rate)} test(s) fail in 50%+ of batches (likely real bugs, not just flaky): {', '.join(high_fail_rate[:8])}")
    if stable_fail > 0:
        fail_tcs = [tc for tc, data in tc_cross.items() if set(data["statuses"]) == {"FAIL"}]
        recommendations.append(f"{stable_fail} test(s) fail consistently across all batches (real bugs): {', '.join(fail_tcs[:8])}")
    if mostly_passing_flaky:
        recommendations.append(f"Investigate {len(mostly_passing_flaky)} flaky test(s) that produce different results across runs: {', '.join(mostly_passing_flaky[:8])}{'...' if len(mostly_passing_flaky) > 8 else ''}")
    elif flaky_tcs and not high_fail_rate:
        recommendations.append(f"Investigate {len(flaky_tcs)} flaky test(s) that produce different results across runs: {', '.join(flaky_tcs[:8])}{'...' if len(flaky_tcs) > 8 else ''}")
    if len(retry_saved) > 0:
        recommendations.append(f"{len(retry_saved)} test(s) needed retries to pass, indicating timing or state sensitivity: {', '.join(retry_saved[:8])}")
    # Duration variance — use higher threshold (CV > 80%) for actionable signal
    high_variance = []
    for tc, data in tc_cross.items():
        if len(data["durations"]) >= 3:
            avg = statistics.mean(data["durations"])
            sd = statistics.stdev(data["durations"])
            if avg > 0 and sd / avg > 0.5:
                high_variance.append((tc, avg, sd))
    # For recommendations, only mention truly high-variance tests (CV > 100%) to avoid noise
    severe_variance = [x for x in high_variance if x[1] > 0 and x[2] / x[1] > 1.0]
    if severe_variance:
        recommendations.append(f"{len(severe_variance)} test(s) show variable execution times (CV > 100%) — typically caused by environment load, not code defects")
    if not recommendations:
        if num_done >= 2:
            recommendations.append("No issues detected. All tests pass consistently across batches. The test suite is stable and reliable.")
        elif all_executed > 0:
            recommendations.append(f"Early results look clean ({all_pass_count}/{all_executed} passing). Full stability assessment will be available after 2 or more batches complete.")
        else:
            recommendations.append("Waiting for test results. No data available yet.")

    # ===== Flakiness by feature =====
    flaky_by_feature = []
    for name, tc_range in SECTIONS:
        tcs = [f"TC{i:03d}" for i in tc_range]
        flaky_count = sum(1 for tc in tcs if tc in flaky_tcs)
        flaky_by_feature.append((name, flaky_count, len(tcs)))

    # ===== Build HTML =====
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stability Report — 5-Batch Comparison</title>
<style>
  :root {{ --green:#16a34a; --red:#dc2626; --amber:#f59e0b; --gray:#6b7280; --blue:#2563eb; --purple:#8b5cf6; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f8fafc; color:#1e293b; padding:24px 24px 60px; }}
  .container {{ max-width:1500px; margin:0 auto; }}

  .refresh-strip {{ position:fixed; top:0; left:0; right:0; height:3px; background:#e2e8f0; z-index:1000; }}
  .refresh-strip .fill {{ height:100%; background:var(--blue); }}
  .refresh-meta {{ position:fixed; top:6px; right:16px; font-size:11px; color:#94a3b8; z-index:1001;
                    font-variant-numeric:tabular-nums; background:rgba(248,250,252,.9); padding:2px 8px; border-radius:4px; }}

  h1 {{ font-size:22px; font-weight:700; }}
  .subtitle {{ color:#64748b; font-size:13px; margin-bottom:8px; }}
  .methodology {{ color:#94a3b8; font-size:12px; margin-bottom:20px; font-style:italic; }}
  h2 {{ font-size:16px; margin:28px 0 10px; color:#334155; }}
  h2 .section-desc {{ display:block; font-size:12px; font-weight:400; color:#94a3b8; margin-top:2px; }}
  h3 {{ font-size:14px; margin:0 0 10px; color:#334155; }}

  .verdict-banner {{ border-radius:10px; padding:20px 24px; margin-bottom:20px; display:flex; align-items:center; gap:20px; }}
  .verdict-banner .verdict-icon {{ font-size:36px; line-height:1; }}
  .verdict-banner .verdict-text {{ flex:1; }}
  .verdict-banner .verdict-label {{ font-size:24px; font-weight:800; margin-bottom:4px; }}
  .verdict-banner .verdict-desc {{ font-size:14px; opacity:.85; }}

  .cards {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:10px; margin-bottom:20px; }}
  .card {{ background:#fff; border-radius:8px; padding:14px 12px; box-shadow:0 1px 3px rgba(0,0,0,.08); text-align:center; }}
  .card .val {{ font-size:28px; font-weight:700; line-height:1.1; }}
  .card .lbl {{ font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }}
  .card .sub {{ font-size:10px; color:#94a3b8; margin-top:1px; }}

  .exec-box {{ background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:20px; }}
  .exec-box .assess {{ display:inline-block; padding:4px 12px; border-radius:6px; font-weight:700; font-size:14px; margin-bottom:8px; }}
  .exec-box .desc {{ font-size:13px; color:#475569; margin-bottom:12px; }}
  .exec-box ul {{ font-size:13px; color:#475569; padding-left:20px; }}
  .exec-box li {{ margin-bottom:6px; }}

  .note {{ background:#fef3c7; border-left:4px solid var(--amber); border-radius:0 6px 6px 0; padding:10px 16px; margin-bottom:20px; font-size:13px; }}

  table {{ width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden;
           box-shadow:0 1px 3px rgba(0,0,0,.06); margin-bottom:20px; font-size:13px; }}
  th {{ background:#f1f5f9; padding:8px 10px; text-align:left; font-size:11px; text-transform:uppercase;
       letter-spacing:.4px; color:#64748b; border-bottom:2px solid #e2e8f0; position:sticky; top:0; z-index:10; }}
  td {{ padding:6px 10px; border-bottom:1px solid #f1f5f9; }}
  tr:hover {{ background:#f8fafc; }}
  .r {{ text-align:right; font-variant-numeric:tabular-nums; }}

  .st {{ display:inline-block; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:600; text-transform:uppercase; }}
  .st.pass {{ background:#dcfce7; color:var(--green); }}
  .st.fail {{ background:#fee2e2; color:var(--red); }}
  .st.skip {{ background:#fef3c7; color:#b45309; }}
  .st.not_run {{ background:#f3f4f6; color:var(--gray); }}
  .st.flaky {{ background:#fef3c7; color:#92400e; }}

  .p {{ display:inline-block; width:18px; height:18px; border-radius:50%; text-align:center; line-height:18px; font-size:9px; font-weight:700; color:#fff; }}
  .p1 {{ background:var(--red); }} .p2 {{ background:var(--amber); }} .p3 {{ background:var(--blue); }}
  .p4 {{ background:var(--purple); }} .p5 {{ background:var(--gray); }}

  .nt {{ max-width:350px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64748b; font-size:12px; }}

  .retry-badge {{ display:inline-block; padding:1px 4px; border-radius:3px; font-size:9px; font-weight:600;
                   background:#fee2e2; color:var(--red); margin-left:3px; }}

  .grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }}
  @media (max-width:900px) {{ .grid2 {{ grid-template-columns:1fr; }} }}
  .panel {{ background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.06); padding:16px; }}

  .histo {{ display:flex; align-items:flex-end; gap:6px; height:80px; padding:8px 0; }}
  .hbar {{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; }}
  .hbar .hfill {{ width:100%; border-radius:3px 3px 0 0; min-height:2px; }}
  .hbar .hlbl {{ font-size:10px; color:#64748b; margin-top:4px; }}
  .hbar .hval {{ font-size:10px; font-weight:600; color:#1e293b; margin-bottom:2px; }}

  .dbar {{ height:6px; border-radius:3px; background:#e2e8f0; }}
  .dbar .dfill {{ height:100%; border-radius:3px; }}

  .sbar {{ display:flex; height:12px; border-radius:6px; overflow:hidden; }}
  .sbar .pass {{ background:var(--green); }} .sbar .fail {{ background:var(--red); }}
  .sbar .skip {{ background:var(--amber); }} .sbar .notrun {{ background:#d1d5db; }}

  /* Heatmap cell */
  .hm {{ width:20px; height:20px; border-radius:3px; display:inline-block; margin:1px; }}
  .hm.g {{ background:#dcfce7; }} .hm.r {{ background:#fee2e2; }} .hm.y {{ background:#fef3c7; }}
  .hm.gray {{ background:#f3f4f6; }}

  /* Tabs */
  .tab-bar {{ display:flex; gap:2px; margin-bottom:0; background:#e2e8f0; border-radius:8px 8px 0 0; padding:4px 4px 0; }}
  .tab-btn {{ padding:8px 20px; font-size:13px; font-weight:600; border:none; background:#e2e8f0; color:#64748b;
              cursor:pointer; border-radius:6px 6px 0 0; transition:all .2s; }}
  .tab-btn.active {{ background:#fff; color:#1e293b; box-shadow:0 -1px 3px rgba(0,0,0,.06); }}
  .tab-btn:hover {{ color:#1e293b; }}
  .tab-content {{ display:none; background:#fff; border-radius:0 0 8px 8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.06); margin-bottom:20px; }}
  .tab-content.active {{ display:block; }}

  .sec {{ background:#1e293b; color:#fff; padding:10px 14px; font-size:13px; font-weight:600; border-radius:8px 8px 0 0; margin-top:16px; }}
  .sec span {{ font-weight:400; color:#94a3b8; margin-left:8px; }}

  .flaky-row {{ background:#fffbeb !important; }}

  /* Blinking in-progress group indicator */
  @keyframes pulse-orange {{
    0%, 100% {{ background:#f59e0b; opacity:1; }}
    50% {{ background:#fbbf24; opacity:0.5; }}
  }}
  .grp-run {{ animation: pulse-orange 1.5s ease-in-out infinite; color:#fff !important; }}

  .filter-btn.active {{ background:#f1f5f9 !important; border-color:#94a3b8 !important; }}
  .filter-btn:hover {{ background:#f8fafc !important; }}
  .legend {{ margin-top:32px; padding:14px; background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.06); font-size:11px; color:#94a3b8; }}

  @media print {{
    .refresh-strip, .refresh-meta {{ display:none !important; }}
    body {{ padding:12px; background:#fff; }}
    .note {{ break-inside:avoid; }}
    .verdict-banner {{ break-inside:avoid; }}
    .cards {{ break-inside:avoid; }}
    .panel {{ break-inside:avoid; }}
    table {{ font-size:11px; }}
    .tab-content {{ display:block !important; break-before:page; }}
    .tab-bar {{ display:none; }}
    .tab-content::before {{ content:attr(data-batch-label); display:block; font-size:16px; font-weight:700; margin-bottom:12px; color:#334155; }}
  }}
</style>
</head>
<body>

{"" if num_done >= NUM_BATCHES else '<div class="refresh-strip"><div class="fill" id="rf"></div></div>' + chr(10) + '<div class="refresh-meta" id="cd">15s</div>'}
<script>
(function() {{
  if ({num_done} >= {NUM_BATCHES}) return; // All batches complete — no auto-refresh needed
  var total=15, left=total;
  var cd=document.getElementById('cd'), bar=document.getElementById('rf');
  if (!cd || !bar) return;
  bar.style.width='100%'; bar.style.transition='none'; void bar.offsetWidth;
  bar.style.transition='width '+total+'s linear'; bar.style.width='0%';
  cd.textContent=left+'s';
  var iv=setInterval(function(){{
    left--;
    if(left>=0) cd.textContent=left+'s';
    if(left<=0) {{
      clearInterval(iv);
      // Save scroll position right before reload
      try {{ sessionStorage.setItem('stability-scroll', window.scrollY); }} catch(e) {{}}
      location.reload();
    }}
  }}, 1000);
  // Restore scroll position after reload
  try {{
    var s = sessionStorage.getItem('stability-scroll');
    if (s) setTimeout(function(){{ window.scrollTo(0, parseInt(s)); }}, 50);
  }} catch(e) {{}}
}})();
</script>

<div class="container">
<h1>Production Order Management — Stability Report</h1>
<p class="subtitle">5-Batch Comparison &middot; {ts} &middot; {"<strong style='color:var(--green)'>FINAL</strong> &mdash; " if num_done >= NUM_BATCHES else ""}{num_done}/{NUM_BATCHES} batches complete &middot; {NUM_TCS} test cases &middot; 10 parallel sessions &middot; 3 retries</p>
<p class="methodology">Methodology: Each test case is executed {NUM_BATCHES} times in independent batches to detect intermittent failures, environment sensitivity, and flaky behavior.</p>
"""

    # ===== Verdict Banner (top of page, "Can we ship?" at a glance) =====
    if assessment == "Collecting Data":
        verdict_bg = "#eff6ff"
        verdict_fg = "#1e40af"
        verdict_icon = "&#9881;"  # gear
    elif assessment == "Ship Ready":
        verdict_bg = "#f0fdf4"
        verdict_fg = "#15803d"
        verdict_icon = "&#10004;"  # checkmark
    elif assessment == "Ship with Caution":
        verdict_bg = "#fffbeb"
        verdict_fg = "#92400e"
        verdict_icon = "&#9888;"  # warning
    else:
        verdict_bg = "#fef2f2"
        verdict_fg = "#991b1b"
        verdict_icon = "&#10006;"  # X

    html += f'<div class="verdict-banner" style="background:{verdict_bg};color:{verdict_fg};border:2px solid {verdict_fg}22">'
    html += f'<div class="verdict-icon">{verdict_icon}</div>'
    html += f'<div class="verdict-text"><div class="verdict-label">{assessment}</div>'
    html += f'<div class="verdict-desc">{assessment_desc}</div></div></div>'

    # Progress indicator
    any_activity = any(bp["groups"] > 0 or bp["tcs"] > 0 for bp in batch_progress.values())
    if num_done < NUM_BATCHES:
        html += f'<div class="note"><strong>In Progress:</strong> {num_done} of {NUM_BATCHES} batches complete. Report auto-refreshes every 15 seconds.</div>'

    # Detect current batch from status file
    current_batch = 0
    status_file = os.path.join(STAB_DIR, "current-batch.txt")
    if os.path.exists(status_file):
        try:
            current_batch = int(open(status_file).read().strip())
        except:
            pass

    # Live progress dashboard — collapsible when all batches complete
    all_complete = num_done >= NUM_BATCHES
    # Total execution summary across all batches
    total_executions = sum(bp["tcs"] for bp in batch_progress.values())
    total_pass_all = sum(bp["pass"] for bp in batch_progress.values())
    total_fail_all = sum(bp["fail"] for bp in batch_progress.values())
    total_skip_all = total_executions - total_pass_all - total_fail_all
    collapse_id_prog = "batch-progress"
    if all_complete:
        html += f'<div class="panel" style="margin-bottom:20px"><h3 style="cursor:pointer;user-select:none" onclick="toggleSection(\'{collapse_id_prog}\')">'
        html += f'<span id="{collapse_id_prog}-arrow" style="margin-right:6px">&#9654;</span>'
        html += f'Batch Execution Progress <span style="font-weight:400;color:#94a3b8;font-size:12px">— {num_done}/{NUM_BATCHES} complete &middot; {total_executions} total executions &middot; {total_pass_all} pass &middot; {total_fail_all} fail &middot; {total_skip_all} skip</span></h3>'
        html += f'<div id="{collapse_id_prog}" style="display:none">'
        html += '<p style="font-size:12px;color:#94a3b8;margin:4px 0 10px">Each batch runs all 250 tests independently. Comparing results across batches reveals flaky tests.</p>'
    else:
        html += '<div class="panel" style="margin-bottom:20px"><h3>Batch Execution Progress</h3><p style="font-size:12px;color:#94a3b8;margin:-6px 0 10px">Each batch runs all 250 tests independently. Comparing results across batches reveals flaky tests.</p>'
    html += '<table style="box-shadow:none"><tr><th>Batch</th><th>Status</th><th style="width:200px">Groups (of 10)</th><th>TCs Done</th><th>Pass</th><th>Fail</th><th style="min-width:250px">Progress</th></tr>'
    for b in range(1, NUM_BATCHES + 1):
        bp = batch_progress[b]
        is_complete = any(bb == b for bb, _ in completed)
        is_partial = not is_complete and bp["groups"] > 0
        if is_complete:
            status_html = '<span class="st pass">COMPLETE</span>'
            bar_color = "var(--green)"
        elif is_partial or b == current_batch:
            status_html = f'<span class="st" style="background:#dbeafe;color:var(--blue)">RUNNING ({bp["groups"]}/10)</span>'
            bar_color = "var(--blue)"
        elif b < current_batch:
            status_html = '<span class="st pass">COMPLETE</span>'
            bar_color = "var(--green)"
        else:
            status_html = '<span class="st not_run">PENDING</span>'
            bar_color = "#d1d5db"

        pct = bp["tcs"] / NUM_TCS * 100 if NUM_TCS > 0 else 0
        is_current_batch = (b == current_batch)
        groups_bar = ""
        for g in range(1, 11):
            gfile = os.path.join(STAB_DIR, f"batch-{b}", f"group-{g:02d}.json")
            if os.path.exists(gfile):
                groups_bar += '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:var(--green);margin:1px;font-size:9px;color:#fff;text-align:center;line-height:16px">' + str(g) + '</span>'
            elif is_current_batch and not is_complete:
                groups_bar += '<span class="grp-run" style="display:inline-block;width:16px;height:16px;border-radius:3px;margin:1px;font-size:9px;text-align:center;line-height:16px">' + str(g) + '</span>'
            else:
                groups_bar += '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:#e2e8f0;margin:1px;font-size:9px;color:#94a3b8;text-align:center;line-height:16px">' + str(g) + '</span>'

        html += f'<tr><td><strong>Batch {b}</strong></td><td>{status_html}</td>'
        html += f'<td>{groups_bar}</td>'
        html += f'<td style="font-variant-numeric:tabular-nums">{bp["tcs"]}/{NUM_TCS}</td>'
        html += f'<td style="color:var(--green);font-variant-numeric:tabular-nums">{bp["pass"]}</td>'
        html += f'<td style="color:var(--red);font-variant-numeric:tabular-nums">{bp["fail"] if bp["fail"] else "—"}</td>'
        pass_pct = bp["pass"] / NUM_TCS * 100 if NUM_TCS > 0 else 0
        fail_pct = bp["fail"] / NUM_TCS * 100 if NUM_TCS > 0 else 0
        html += f'<td><div class="sbar" style="height:14px;border-radius:7px">'
        if bp["pass"] > 0:
            html += f'<div class="pass" style="width:{pass_pct:.1f}%"></div>'
        if bp["fail"] > 0:
            html += f'<div class="fail" style="width:{fail_pct:.1f}%"></div>'
        remaining_pct = 100 - pass_pct - fail_pct
        if remaining_pct > 0:
            html += f'<div class="notrun" style="width:{remaining_pct:.1f}%"></div>'
        html += '</div>'
        html += f'<div style="font-size:10px;color:#94a3b8;margin-top:2px">{pct:.0f}% complete</div></td></tr>'
    html += '</table>'
    if all_complete:
        html += '</div>'  # close collapsible div
    html += '</div>'

    # ===== Executive Summary =====
    html += '<div class="exec-box">'
    html += f'<h2 style="margin:0 0 12px">Key Metrics</h2>'

    if all_executed > 0:
        # Show KPI cards always when there's data (even partial)
        stability_display = f"{stability_score:.1f}%" if num_done >= 2 else f"{interim_pass_rate:.1f}%"
        stability_label = "Stability Score" if num_done >= 2 else "Interim Pass Rate"
        stability_sub = f"consistent across {num_done} batches" if num_done >= 2 else f"from {all_executed} tests run so far"

        flaky_color = "var(--green)" if len(flaky_tcs) == 0 else ("var(--amber)" if len(flaky_tcs) <= 5 else "var(--red)")
        fail_color = "var(--green)" if stable_fail == 0 else "var(--red)"

        html += f"""<div class="cards" style="margin-bottom:12px">
  <div class="card"><div class="val" style="color:{assessment_color}">{stability_display}</div><div class="lbl">{stability_label}</div><div class="sub">{stability_sub}</div></div>
  <div class="card"><div class="val" style="color:{flaky_color}">{len(flaky_tcs)}</div><div class="lbl">Flaky Tests</div><div class="sub">pass in some runs, fail in others</div></div>
  <div class="card"><div class="val" style="color:{fail_color}">{stable_fail}</div><div class="lbl">Consistent Failures</div><div class="sub">fail in every batch (real bugs)</div></div>
  <div class="card"><div class="val" style="color:var(--green)">{stable_pass}</div><div class="lbl">Fully Stable</div><div class="sub">pass in every batch</div></div>
  <div class="card"><div class="val" style="color:var(--purple)">{len(retry_saved)}</div><div class="lbl">Saved by Retry</div><div class="sub">{len(retry_dependent)} tests needed retries; {len(retry_saved)} would fail without them</div></div>
  <div class="card"><div class="val" style="color:#64748b">{total_executions:,}</div><div class="lbl">Total Executions</div><div class="sub">{num_done} batches &times; {NUM_TCS} tests</div></div>
</div>"""
    # Feature health summary bar
    html += '<h3 style="margin-bottom:8px">Feature Health</h3>'
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'
    for name, tc_range in SECTIONS:
        tcs = [f"TC{j:03d}" for j in tc_range]
        fp = sum(1 for tc in tcs if set(s for s in tc_cross.get(tc, {}).get("statuses", []) if s != "NOT_RUN") <= {"PASS"} and len(set(s for s in tc_cross.get(tc, {}).get("statuses", []) if s != "NOT_RUN")) > 0)
        ff = sum(1 for tc in tcs if set(tc_cross.get(tc, {}).get("statuses", [])) == {"FAIL"})
        fk = sum(1 for tc in tcs if tc in flaky_tcs)
        fexec = fp + ff + fk
        if fexec == 0:
            chip_color = "#e2e8f0"
            chip_text = "#64748b"
            pct_text = "N/A"
        elif ff > 0 or fk > 0:
            chip_color = "#fee2e2" if ff > 0 else "#fef3c7"
            chip_text = "var(--red)" if ff > 0 else "#92400e"
            pct_text = f"{fp}/{fexec}"
        else:
            chip_color = "#dcfce7"
            chip_text = "var(--green)"
            pct_text = f"{fp}/{fexec}"
        html += f'<div style="background:{chip_color};border-radius:6px;padding:6px 10px;font-size:11px;color:{chip_text};font-weight:600">{name} <span style="font-weight:400">{pct_text}</span>'
        if ff > 0:
            html += f' <span style="font-size:10px">({ff} fail)</span>'
        if fk > 0:
            html += f' <span style="font-size:10px">({fk} flaky)</span>'
        html += '</div>'
    html += '</div>'

    # Action items styled as priority-ordered list with tags
    html += '<h3>Action Items</h3>'
    html += '<div style="margin-bottom:8px">'
    tagged_any = False
    for rec in recommendations:
        if 'fail consistently' in rec or 'real bugs' in rec:
            html += f'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap">FIX NOW</span><span style="font-size:13px;color:#475569">{esc(rec)}</span></div>'
            tagged_any = True
    for rec in recommendations:
        if 'flaky' in rec.lower() and 'fail consistently' not in rec and 'real bugs' not in rec:
            html += f'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="background:var(--amber);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap">INVESTIGATE</span><span style="font-size:13px;color:#475569">{esc(rec)}</span></div>'
            tagged_any = True
    for rec in recommendations:
        if 'retri' in rec.lower() or 'retry' in rec.lower() or 'variance' in rec.lower() or 'execution times' in rec.lower():
            html += f'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="background:var(--blue);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap">MONITOR</span><span style="font-size:13px;color:#475569">{esc(rec)}</span></div>'
            tagged_any = True
    if not tagged_any:
        for rec in recommendations:
            html += f'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="background:var(--green);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap">OK</span><span style="font-size:13px;color:#475569">{esc(rec)}</span></div>'
    html += '</div>'
    html += '</div>'

    if not all_with_data:
        html += '</div></body></html>'
        return html

    # ===== Stability Matrix =====
    # Count real issues (flaky + failures) separately from retry-only
    matrix_real_issues = len(flaky_tcs) + stable_fail
    matrix_all_issues = matrix_real_issues + len(retry_dependent)
    matrix_summary = f"{matrix_all_issues} test(s) need attention" if matrix_all_issues > 0 else "All tests stable"
    # Default to issues filter when there are real issues (flaky/failures)
    matrix_default_filter = "issues" if matrix_real_issues > 0 else "all"
    html += f'<h2>Stability Matrix<span class="section-desc">Side-by-side view of every test across all batches. Yellow rows = flaky, red = consistent failures.</span></h2>'

    # Filter controls
    # Active state applied based on default filter
    def _fb(mode, label, color=""):
        is_active = mode == matrix_default_filter
        active_cls = " active" if is_active else ""
        active_bg = "background:#f1f5f9;border-color:#94a3b8" if is_active else "background:#fff"
        color_style = f"color:{color};" if color else ""
        return f'<button onclick="filterMatrix(\'{mode}\')" class="filter-btn{active_cls}" id="fb-{mode}" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;{active_bg};font-size:12px;font-weight:600;cursor:pointer;{color_style}">{label}</button>'

    default_shown = matrix_real_issues if matrix_default_filter == "issues" else NUM_TCS
    html += f"""<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
  {_fb("all", f"All ({NUM_TCS})")}
  {_fb("issues", f"Flaky + Failures ({matrix_real_issues})", "var(--red)")}
  {_fb("flaky", f"Flaky ({len(flaky_tcs)})", "#92400e")}
  {_fb("fail", f"Failures ({stable_fail})", "var(--red)")}
  {_fb("retry", f"Retried ({len(retry_dependent)})", "var(--purple)")}
  <span style="margin-left:auto;font-size:11px;color:#94a3b8" id="matrix-count">Showing {default_shown} of {NUM_TCS} tests</span>
</div>"""

    html += '<div style="max-height:500px;overflow-y:auto;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.06)" id="matrix-container">'
    html += '<table id="stability-matrix"><tr><th style="width:70px;position:sticky;left:0;background:#f1f5f9;z-index:11">TC#</th><th>Title</th><th style="width:28px">P</th>'
    for b, _ in all_with_data:
        html += f'<th style="width:80px;text-align:center">Batch {b}</th>'
    html += '<th style="width:70px;text-align:center">Stability</th></tr>'

    for name, tc_range in SECTIONS:
        # Section header row
        tcs_in_section = [f"TC{j:03d}" for j in tc_range]
        section_flaky = sum(1 for tc in tcs_in_section if tc in flaky_tcs)
        section_fail = sum(1 for tc in tcs_in_section if set(tc_cross.get(tc, {}).get("statuses", [])) == {"FAIL"})
        section_retry = sum(1 for tc in tcs_in_section if tc in retry_dependent)
        section_tag = ""
        if section_flaky > 0 or section_fail > 0:
            section_tag = f' <span style="color:var(--red);font-size:11px">({section_flaky} flaky, {section_fail} fail)</span>'
        cols = 3 + len(all_with_data) + 1
        html += f'<tr class="matrix-section-row" data-issues="{section_flaky + section_fail + section_retry}"><td colspan="{cols}" style="background:#f1f5f9;font-weight:700;font-size:12px;padding:8px 10px;border-bottom:2px solid #e2e8f0">{name} ({len(tcs_in_section)} tests){section_tag}</td></tr>'

        for i in tc_range:
            tc = f"TC{i:03d}"
            meta = tc_meta.get(tc, {})
            data = tc_cross.get(tc, {"statuses": [], "attempts": []})
            is_flaky = tc in flaky_tcs
            is_fail = set(s for s in data.get("statuses", []) if s != "NOT_RUN") == {"FAIL"}
            is_retry = tc in retry_dependent
            has_issue = is_flaky or is_fail or is_retry
            row_class_parts = []
            if is_flaky:
                row_class_parts.append("flaky-row")
            data_attrs = f' data-issue="{1 if has_issue else 0}" data-flaky="{1 if is_flaky else 0}" data-fail="{1 if is_fail else 0}" data-retry="{1 if is_retry else 0}"'

            html += f'<tr class="matrix-row {" ".join(row_class_parts)}"{data_attrs}><td style="position:sticky;left:0;background:{("#fffbeb" if is_flaky else "#fff")};z-index:1"><strong>{tc}</strong></td>'
            html += f'<td style="font-size:11px">{esc(meta.get("title", ""))[:60]}</td>'
            prio = meta.get("priority", 0)
            html += f'<td><span class="p p{prio}">{prio}</span></td>'

            for idx, (b, results) in enumerate(all_with_data):
                r = results[i - 1]
                sc = r["status"].lower()
                attempts = r.get("attempts", 1)
                cell = f'<span class="st {sc}">{r["status"]}</span>'
                if attempts > 1:
                    cell += f'<span class="retry-badge">R{attempts}</span>'
                html += f'<td style="text-align:center">{cell}</td>'

            # Stability indicator
            if is_flaky:
                non_skip_s = [s for s in data.get("statuses", []) if s not in ("SKIP", "NOT_RUN")]
                from collections import Counter
                sc_counts = Counter(non_skip_s)
                fail_rate = sc_counts.get("FAIL", 0) / len(non_skip_s) * 100 if non_skip_s else 0
                if fail_rate >= 50:
                    html += f'<td style="text-align:center"><span class="st fail" style="font-weight:700">{fail_rate:.0f}% fail</span></td>'
                else:
                    score = flakiness_scores.get(tc, 0)
                    html += f'<td style="text-align:center"><span class="st flaky">{score:.0f}% flaky</span></td>'
            elif set(data.get("statuses", [])) <= {"PASS"}:
                html += '<td style="text-align:center;color:var(--green);font-weight:600">100%</td>'
            elif set(data.get("statuses", [])) <= {"FAIL"}:
                html += '<td style="text-align:center;color:var(--red);font-weight:600">FAIL</td>'
            elif set(data.get("statuses", [])) <= {"SKIP", "NOT_RUN"}:
                html += '<td style="text-align:center;color:var(--gray)">N/A</td>'
            else:
                html += '<td style="text-align:center;color:var(--green)">100%</td>'

            html += '</tr>'

    html += '</table></div>'

    # ===== Flakiness Dashboard =====
    html += '<h2>Flakiness Dashboard<span class="section-desc">Flaky tests pass sometimes and fail other times without code changes. They erode confidence in your test suite and mask real bugs.</span></h2>'

    # Heatmap
    html += '<div class="panel" style="margin-bottom:16px"><h3>Stability Heatmap (TC001-TC250)</h3>'
    html += '<div style="display:flex;flex-wrap:wrap;gap:1px;max-width:800px">'
    for i in range(1, NUM_TCS + 1):
        tc = f"TC{i:03d}"
        data = tc_cross.get(tc, {"statuses": []})
        unique = set(s for s in data["statuses"] if s != "NOT_RUN")
        if len(unique) == 0:
            cls = "gray"
        elif len(unique) == 1:
            if "PASS" in unique:
                cls = "g"
            elif "FAIL" in unique:
                cls = "r"
            else:
                cls = "gray"
        else:
            cls = "y"
        html += f'<div class="hm {cls}" title="{tc}: {", ".join(data["statuses"])}"></div>'
    html += '</div>'
    html += '<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#94a3b8">'
    html += '<span style="display:flex;align-items:center;gap:4px"><span class="hm g" style="width:12px;height:12px"></span> Stable Pass</span>'
    html += '<span style="display:flex;align-items:center;gap:4px"><span class="hm r" style="width:12px;height:12px"></span> Stable Fail</span>'
    html += '<span style="display:flex;align-items:center;gap:4px"><span class="hm y" style="width:12px;height:12px"></span> Flaky</span>'
    html += '<span style="display:flex;align-items:center;gap:4px"><span class="hm gray" style="width:12px;height:12px"></span> Skip/Not Run</span>'
    html += '</div></div>'

    html += '<div class="grid2" style="align-items:start">'

    # Flakiness by feature
    html += '<div class="panel"><h3>Flakiness by Feature</h3>'
    max_flaky = max((f[1] for f in flaky_by_feature), default=1) or 1
    for name, flaky_count, total in flaky_by_feature:
        w = flaky_count / max_flaky * 100 if max_flaky > 0 else 0
        color = "var(--green)" if flaky_count == 0 else ("var(--amber)" if flaky_count <= 2 else "var(--red)")
        html += f'<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px"><span>{name} <span style="color:#94a3b8">({total} tests)</span></span><span style="font-weight:600;color:{color}">{flaky_count} flaky</span></div>'
        html += f'<div class="dbar"><div class="dfill" style="width:{w:.1f}%;background:{color}"></div></div></div>'
    html += '</div>'

    # Retry impact — sort by total retry attempts across batches, cap at 10
    html += '<div class="panel"><h3>Retry Impact</h3>'
    if retry_saved:
        # Sort by total attempts across batches (most retries first)
        def _retry_sort_key(tc):
            return -sum(r.get("attempts", 1) for b, results in all_with_data for r in [results[int(tc[2:]) - 1]] if r.get("attempts", 1) > 1)
        retry_saved_sorted = sorted(retry_saved, key=_retry_sort_key)
        retry_show_limit = 10
        html += f'<div style="font-size:13px;margin-bottom:10px"><strong>{len(retry_saved)}</strong> tests were saved by retries (failed initially, passed on retry)'
        if len(retry_saved) > retry_show_limit:
            html += f' — showing top {retry_show_limit} by retry count'
        html += ':</div>'
        html += '<table style="box-shadow:none"><tr><th>TC#</th><th>Title</th><th>Details</th></tr>'
        for tc in retry_saved_sorted[:retry_show_limit]:
            meta = tc_meta.get(tc, {})
            # Find batch where retry saved it
            details = []
            for b, results in all_with_data:
                r = results[int(tc[2:]) - 1]
                if r.get("attempts", 1) > 1 and r["status"] == "PASS":
                    details.append(f"Batch {b}: {r.get('attempts', 1)} attempts")
            html += f'<tr><td><strong>{tc}</strong></td><td style="font-size:11px">{esc(meta.get("title", ""))[:50]}</td><td style="font-size:11px">{", ".join(details)}</td></tr>'
        html += '</table>'
    else:
        html += '<div style="font-size:13px;color:var(--green)">No tests needed retries to pass. All results are first-attempt.</div>'
    html += '</div></div>'

    # Flaky tests detail table
    if flaky_tcs:
        html += '<h3 style="margin-top:16px">Flaky Tests Detail</h3>'
        html += '<table><tr><th>TC#</th><th>Title</th><th>P</th><th>Role</th>'
        for b, _ in all_with_data:
            html += f'<th style="text-align:center">B{b}</th>'
        html += '<th>Flakiness</th><th>Notes</th></tr>'
        for tc in flaky_tcs:
            meta = tc_meta.get(tc, {})
            prio = meta.get("priority", 0)
            data = tc_cross[tc]
            score = flakiness_scores.get(tc, 0)
            html += f'<tr class="flaky-row"><td><strong>{tc}</strong></td><td style="font-size:11px">{esc(meta.get("title", ""))[:50]}</td>'
            html += f'<td><span class="p p{prio}">{prio}</span></td><td style="font-size:11px">{esc(meta.get("role", ""))}</td>'
            notes_parts = []
            for idx, (b, results) in enumerate(all_with_data):
                r = results[int(tc[2:]) - 1]
                sc = r["status"].lower()
                attempts = r.get("attempts", 1)
                cell = f'<span class="st {sc}">{r["status"]}</span>'
                if attempts > 1:
                    cell += f'<span class="retry-badge">R{attempts}</span>'
                html += f'<td style="text-align:center">{cell}</td>'
                if r["status"] == "FAIL" and r.get("notes"):
                    notes_parts.append(f'B{b}: {r["notes"][:60]}')
            non_skip_s = [s for s in data["statuses"] if s not in ("SKIP", "NOT_RUN")]
            from collections import Counter
            sc_counts = Counter(non_skip_s)
            fail_rate = sc_counts.get("FAIL", 0) / len(non_skip_s) * 100 if non_skip_s else 0
            if fail_rate >= 50:
                html += f'<td style="text-align:center;color:var(--red)"><strong>{fail_rate:.0f}% fail</strong></td>'
            else:
                html += f'<td style="text-align:center"><strong>{score:.0f}%</strong></td>'
            html += f'<td class="nt" title="{esc("; ".join(notes_parts))}">{esc("; ".join(notes_parts)[:100])}</td></tr>'
        html += '</table>'

    # ===== Duration Consistency =====
    html += '<h2>Duration Consistency<span class="section-desc">Tests with high duration variance across batches may indicate environment instability, resource contention, or timing-dependent behavior.</span></h2>'
    if high_variance:
        high_variance.sort(key=lambda x: -x[2] / x[1] if x[1] > 0 else 0)
        show_limit = 15
        html += f'<div style="font-size:12px;color:#94a3b8;margin-bottom:8px">{len(high_variance)} tests with CV > 50% — showing top {min(show_limit, len(high_variance))} by variance</div>'
        html += '<table><tr><th>TC#</th><th>Title</th><th>P</th>'
        for b, _ in all_with_data:
            html += f'<th class="r">B{b}</th>'
        html += '<th class="r">Avg</th><th class="r">StdDev</th><th class="r">CV%</th></tr>'
        for tc, avg, sd in high_variance[:show_limit]:
            meta = tc_meta.get(tc, {})
            data = tc_cross[tc]
            cv = sd / avg * 100 if avg > 0 else 0
            html += f'<tr><td><strong>{tc}</strong></td><td style="font-size:11px">{esc(meta.get("title", ""))[:45]}</td>'
            html += f'<td><span class="p p{meta.get("priority", 0)}">{meta.get("priority", "")}</span></td>'
            for b, results in all_with_data:
                r = results[int(tc[2:]) - 1]
                d = r.get("duration_ms", 0)
                html += f'<td class="r" style="font-size:11px">{fmt_dur(d)}</td>'
            html += f'<td class="r"><strong>{fmt_dur(int(avg))}</strong></td>'
            html += f'<td class="r">{fmt_dur(int(sd))}</td>'
            html += f'<td class="r" style="color:{"var(--red)" if cv > 80 else "var(--amber)"}">{cv:.0f}%</td></tr>'
        html += '</table>'
    else:
        if num_done < 3:
            html += f'<div class="panel"><div style="font-size:13px;color:var(--blue)">Duration variance analysis requires 3+ completed batches. Currently {num_done} batch(es) complete.</div></div>'
        else:
            html += '<div class="panel"><div style="font-size:13px;color:var(--green)">All tests show consistent duration across batches (stddev &lt; 50% of mean).</div></div>'

    # ===== Batch Tabs =====
    html += '<h2>Batch Details<span class="section-desc">Drill into individual batch results. Each batch represents a complete, independent test run.</span></h2>'
    html += '<div class="tab-bar">'
    for idx, (b, _) in enumerate(all_with_data):
        active = " active" if idx == 0 else ""
        html += f'<button class="tab-btn{active}" onclick="switchTab({idx})" id="tab-btn-{idx}">Batch {b}</button>'
    html += '</div>'

    for idx, (b, results) in enumerate(all_with_data):
        active = " active" if idx == 0 else ""
        results_map = {r["tc"]: r for r in results}

        # Per-batch stats
        bp = sum(1 for r in results if r["status"] == "PASS")
        bf = sum(1 for r in results if r["status"] == "FAIL")
        bs = sum(1 for r in results if r["status"] == "SKIP")
        bn = sum(1 for r in results if r["status"] == "NOT_RUN")
        bex = bp + bf
        brate = f"{bp / bex * 100:.1f}" if bex else "0"
        bdurs = [r.get("duration_ms", 0) for r in results if r["status"] in ("PASS", "FAIL") and r.get("duration_ms", 0) > 0]
        btotal_dur = sum(bdurs)
        bavg_dur = statistics.mean(bdurs) if bdurs else 0
        bmedian_dur = statistics.median(bdurs) if bdurs else 0
        bmax_dur = max(bdurs) if bdurs else 0
        bretries = sum(1 for r in results if r.get("attempts", 1) > 1)

        html += f'<div class="tab-content{active}" id="tab-{idx}" data-batch-label="Batch {b}">'

        # KPI cards for this batch
        html += f"""<div class="cards" style="grid-template-columns:repeat(4, 1fr)">
  <div class="card"><div class="val" style="color:var(--blue)">{brate}%</div><div class="lbl">Pass Rate</div><div class="sub">{bex} executed</div></div>
  <div class="card"><div class="val" style="color:var(--green)">{bp}</div><div class="lbl">Passed</div></div>
  <div class="card"><div class="val" style="color:var(--red)">{bf}</div><div class="lbl">Failed</div></div>
  <div class="card"><div class="val" style="color:var(--gray)">{bs + bn}</div><div class="lbl">Skip/Not Run</div></div>
  <div class="card"><div class="val" style="color:#0ea5e9">{fmt_dur(btotal_dur)}</div><div class="lbl">Total Duration</div></div>
  <div class="card"><div class="val" style="color:var(--purple)">{fmt_dur(int(bavg_dur))}</div><div class="lbl">Avg Duration</div><div class="sub">median {fmt_dur(int(bmedian_dur))}</div></div>
  <div class="card"><div class="val" style="color:var(--amber)">{fmt_dur(bmax_dur)}</div><div class="lbl">Max Duration</div></div>
  <div class="card"><div class="val" style="color:var(--red)">{bretries}</div><div class="lbl">Retried Tests</div></div>
</div>"""

        # Duration histogram for this batch
        bbuckets = [("<1s", 0), ("1-3s", 0), ("3-5s", 0), ("5-10s", 0), ("10-20s", 0), ("20s+", 0)]
        for d in bdurs:
            if d < 1000: bbuckets[0] = (bbuckets[0][0], bbuckets[0][1] + 1)
            elif d < 3000: bbuckets[1] = (bbuckets[1][0], bbuckets[1][1] + 1)
            elif d < 5000: bbuckets[2] = (bbuckets[2][0], bbuckets[2][1] + 1)
            elif d < 10000: bbuckets[3] = (bbuckets[3][0], bbuckets[3][1] + 1)
            elif d < 20000: bbuckets[4] = (bbuckets[4][0], bbuckets[4][1] + 1)
            else: bbuckets[5] = (bbuckets[5][0], bbuckets[5][1] + 1)
        bmax_bucket = max(b2[1] for b2 in bbuckets) if bbuckets else 1

        html += '<div class="grid2"><div class="panel"><h3>Duration Distribution</h3><div class="histo">'
        for label, count in bbuckets:
            h = int(count / bmax_bucket * 60) if bmax_bucket else 0
            html += f'<div class="hbar"><div class="hval">{count}</div><div class="hfill" style="height:{max(h, 2)}px;background:var(--blue)"></div><div class="hlbl">{label}</div></div>'
        html += '</div></div>'

        # Duration by feature for this batch
        html += '<div class="panel"><h3>Duration by Feature</h3>'
        bfeat_durs = []
        for name, tc_range in SECTIONS:
            tcs = [f"TC{j:03d}" for j in tc_range]
            fdurs = [results_map[tc].get("duration_ms", 0) for tc in tcs if tc in results_map and results_map[tc].get("duration_ms", 0) > 0]
            bfeat_durs.append((name, sum(fdurs), statistics.mean(fdurs) if fdurs else 0, max(fdurs) if fdurs else 0, len(fdurs)))
        bmax_feat = max(f[1] for f in bfeat_durs) if bfeat_durs else 1
        for name, td, ad, md, cnt in bfeat_durs:
            w = td / bmax_feat * 100 if bmax_feat else 0
            html += f'<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px"><span>{name}</span><span style="font-weight:600">{fmt_dur(td)}</span></div>'
            html += f'<div class="dbar"><div class="dfill" style="width:{w:.1f}%;background:var(--blue)"></div></div></div>'
        html += '</div></div>'

        # Failed tests for this batch
        bfails = [r for r in results if r["status"] == "FAIL"]
        if bfails:
            html += f'<h3>Failed Tests ({len(bfails)})</h3><table>'
            html += '<tr><th>TC#</th><th>Title</th><th>P</th><th>Role</th><th class="r">Duration</th><th>Attempts</th><th>Notes</th></tr>'
            for r in bfails:
                m = tc_meta.get(r["tc"], {})
                prio = m.get("priority", 0)
                attempts = r.get("attempts", 1)
                att_html = f'{attempts}' if attempts == 1 else f'<span style="color:var(--red);font-weight:600">{attempts}</span>'
                html += f'<tr><td><strong>{r["tc"]}</strong></td><td style="font-size:11px">{esc(m.get("title", ""))[:50]}</td>'
                html += f'<td><span class="p p{prio}">{prio}</span></td><td style="font-size:11px">{esc(m.get("role", ""))}</td>'
                html += f'<td class="r">{fmt_dur(r.get("duration_ms", 0))}</td><td style="text-align:center">{att_html}</td>'
                html += f'<td class="nt" title="{esc(r.get("notes", ""))}">{esc(r.get("notes", "")[:120])}</td></tr>'
            html += '</table>'

        # All results for this batch — collapsible per section
        html += '<h3>All Test Results <span style="font-size:11px;font-weight:400;color:#94a3b8">(click section headers to expand)</span></h3>'
        for sec_idx, (name, tc_range) in enumerate(SECTIONS):
            tcs = [f"TC{j:03d}" for j in tc_range]
            sp = sum(1 for tc in tcs if results_map.get(tc, {}).get("status") == "PASS")
            sf = sum(1 for tc in tcs if results_map.get(tc, {}).get("status") == "FAIL")
            ss = sum(1 for tc in tcs if results_map.get(tc, {}).get("status") == "SKIP")
            sn = sum(1 for tc in tcs if results_map.get(tc, {}).get("status") == "NOT_RUN")
            dur = sum(results_map.get(tc, {}).get("duration_ms", 0) for tc in tcs)
            has_failures = sf > 0
            # Auto-expand sections that have failures
            collapse_id = f"sec-{idx}-{sec_idx}"
            expanded = has_failures
            html += f'<div class="sec" style="cursor:pointer;user-select:none" onclick="toggleSection(\'{collapse_id}\')">'
            html += f'<span id="{collapse_id}-arrow" style="margin-right:6px">{"&#9660;" if expanded else "&#9654;"}</span>'
            html += f'{name}<span>{sp} pass &middot; {sf} fail &middot; {ss + sn} skip/not run &middot; {fmt_dur(dur)}</span></div>'
            html += f'<div id="{collapse_id}" style="display:{"block" if expanded else "none"}">'
            html += '<table><tr><th style="width:70px">TC#</th><th>Title</th><th style="width:28px">P</th>'
            html += '<th style="width:70px">Role</th><th style="width:65px">Status</th>'
            html += '<th class="r" style="width:60px">Duration</th><th style="width:45px">Att.</th><th>Notes</th></tr>'

            for tc in tcs:
                r = results_map.get(tc, {"status": "NOT_RUN", "duration_ms": 0, "notes": "", "attempts": 1})
                m = tc_meta.get(tc, {})
                sc = r["status"].lower()
                prio = m.get("priority", 0)
                attempts = r.get("attempts", 1)
                att_html = f'{attempts}' if attempts == 1 else f'<span style="color:var(--red);font-weight:600">{attempts}<span class="retry-badge">R</span></span>'
                html += f'<tr><td><strong>{tc}</strong></td><td style="font-size:11px">{esc(m.get("title", ""))[:55]}</td>'
                html += f'<td><span class="p p{prio}">{prio}</span></td><td style="font-size:10px">{esc(m.get("role", ""))}</td>'
                html += f'<td><span class="st {sc}">{r["status"]}</span></td>'
                html += f'<td class="r" style="font-size:11px">{fmt_dur(r.get("duration_ms", 0))}</td>'
                html += f'<td style="text-align:center;font-size:11px">{att_html}</td>'
                html += f'<td class="nt" title="{esc(r.get("notes", ""))}">{esc(r.get("notes", "")[:80])}</td></tr>'
            html += '</table></div>'

        html += '</div>'  # end tab-content

    # Tab switching JS + matrix filter JS
    html += """
<script>
function toggleSection(id) {
  var el = document.getElementById(id);
  var arrow = document.getElementById(id + '-arrow');
  if (el.style.display === 'none') { el.style.display = 'block'; arrow.innerHTML = '&#9660;'; }
  else { el.style.display = 'none'; arrow.innerHTML = '&#9654;'; }
}
function switchTab(idx) {
  document.querySelectorAll('.tab-btn').forEach(function(b,i){ b.classList.toggle('active', i===idx); });
  document.querySelectorAll('.tab-content').forEach(function(c,i){ c.classList.toggle('active', i===idx); });
  // Persist selected tab across auto-refresh
  try { sessionStorage.setItem('stability-tab', idx); } catch(e) {}
  try { history.replaceState(null, '', '#tab-' + idx); } catch(e) {}
}
// Restore tab on page load
(function() {
  var idx = 0;
  try { var h = location.hash.match(/tab-(\\d+)/); if (h) idx = parseInt(h[1]); } catch(e) {}
  if (!idx) try { var s = sessionStorage.getItem('stability-tab'); if (s) idx = parseInt(s); } catch(e) {}
  if (idx > 0) switchTab(idx);
})();
function filterMatrix(mode) {
  var rows = document.querySelectorAll('#stability-matrix .matrix-row');
  var sections = document.querySelectorAll('#stability-matrix .matrix-section-row');
  var shown = 0;
  rows.forEach(function(r) {
    var show = mode === 'all' ||
      (mode === 'issues' && (r.dataset.flaky === '1' || r.dataset.fail === '1')) ||
      (mode === 'flaky' && r.dataset.flaky === '1') ||
      (mode === 'fail' && r.dataset.fail === '1') ||
      (mode === 'retry' && r.dataset.retry === '1');
    r.style.display = show ? '' : 'none';
    if (show) shown++;
  });
  // Show/hide section headers based on whether they have visible children
  sections.forEach(function(s) {
    var next = s.nextElementSibling;
    var hasVisible = false;
    while (next && !next.classList.contains('matrix-section-row')) {
      if (next.style.display !== 'none') hasVisible = true;
      next = next.nextElementSibling;
    }
    s.style.display = (mode === 'all' || hasVisible) ? '' : 'none';
  });
  document.getElementById('matrix-count').textContent = 'Showing ' + shown + ' of """ + str(NUM_TCS) + """ tests';
  document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); b.style.background='#fff'; });
  var btn = document.getElementById('fb-' + mode);
  if (btn) { btn.classList.add('active'); btn.style.background='#f1f5f9'; }
  // Persist filter across auto-refresh
  try { sessionStorage.setItem('stability-filter', mode); } catch(e) {}
}
// Restore filter on page load (sessionStorage overrides default)
(function() {
  var defaultFilter = '""" + matrix_default_filter + """';
  try {
    var f = sessionStorage.getItem('stability-filter');
    setTimeout(function(){ filterMatrix(f || defaultFilter); }, 100);
  } catch(e) {
    setTimeout(function(){ filterMatrix(defaultFilter); }, 100);
  }
})();

</script>
"""

    # Legend
    html += """<div class="legend">
  <strong>Legend</strong>
  <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:8px">
    <div style="display:flex;align-items:center;gap:4px"><span class="st pass">PASS</span> Passed on first attempt</div>
    <div style="display:flex;align-items:center;gap:4px"><span class="st fail">FAIL</span> Failed after all retries</div>
    <div style="display:flex;align-items:center;gap:4px"><span class="st skip">SKIP</span> Skipped (precondition not met)</div>
    <div style="display:flex;align-items:center;gap:4px"><span class="st not_run">NOT_RUN</span> Not yet executed</div>
    <div style="display:flex;align-items:center;gap:4px"><span class="st flaky">FLAKY</span> Inconsistent across batches</div>
    <div style="display:flex;align-items:center;gap:4px"><span class="retry-badge">R3</span> 3 attempts needed to pass</div>
  </div>
  <div style="margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px">
    <strong>Stability Score</strong> = % of tests passing consistently across all completed batches.
    A score above 95% with 3 or fewer flaky tests is considered ship-ready.
  </div>
</div>
</div>
</body>
</html>"""
    return html


def main():
    loop = "--loop" in sys.argv
    while True:
        tc_meta = parse_plan()
        batches = []
        for b in range(1, NUM_BATCHES + 1):
            results, num_groups = load_batch(b)
            batches.append((b, results, num_groups))
        html = generate_html(batches, tc_meta)
        with open(REPORT, "w") as f:
            f.write(html)
        done = sum(1 for _, r, ng in batches if r is not None and ng >= 10)
        partial = sum(1 for _, r, ng in batches if r is not None and ng < 10)
        print(f"[{time.strftime('%H:%M:%S')}] Stability report: {done}/{NUM_BATCHES} complete, {partial} in progress")
        if not loop:
            break
        time.sleep(10)


if __name__ == "__main__":
    main()
