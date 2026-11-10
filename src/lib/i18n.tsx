// English + Telugu UI strings. Language is saved in localStorage and read after hydration.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "te";

const en = {
  nav_checker: "Checker",
  nav_builder: "Builder",
  nav_security: "Security",
  nav_library: "Library",
  nav_ab: "A/B Test",
  nav_analytics: "Analytics",
  hero_badge: "Heuristic scoring + AI rewrite",
  hero_title_a: "Prompt",
  hero_title_b: "Quality",
  hero_title_c: "Checker",
  hero_sub:
    "Paste a prompt, get an instant rule-based score across five criteria, compare Before vs After improvements side by side, and optionally let AI rewrite it — while keeping your intent.",
  your_prompt: "Your prompt",
  load_sample: "Load sample",
  try_before_after: "Try Before vs After",
  words: "words",
  category: "Category",
  analyze: "Analyze Prompt",
  improve: "Improve with AI",
  export: "Export report",
  clear: "Clear",
  asking: "Asking Groq",
  ai_analysis: "AI analysis",
  improved_prompt: "Improved prompt",
  copy: "Copy",
  copied: "Copied",
  use_rescore: "Use this prompt & re-score →",
  score: "Score",
  empty_score: "Write a prompt (or load the sample) and click Analyze Prompt.",
  heuristic_note: "Heuristic estimate from text patterns — not an objective measure of quality.",
  suggestions: "Suggestions",
  still_works: "Rule-based analysis still works.",
  before_after: "Before vs After",
  before: "Before",
  after: "After",
  points: "pts",
  added_lines: "Added in rewrite",
  removed_lines: "Removed in rewrite",
  how: "How it works",
  how_sub:
    "The score is computed in your browser using transparent rules (keyword and structure checks). It's a learning aid, not ground truth — a high score doesn't guarantee a great answer.",
  saved_history: "Saved to your history in this browser.",
  security_quick: "Security check",

  // builder
  builder_title: "Smart Prompt Builder",
  builder_sub:
    "Fill in the structural parts of a prompt (task, context, audience, tone, format, constraints). The generated prompt and quality score update live as you type.",
  b_role: "Role / Persona",
  b_task: "Task (what needs to be done)",
  b_context: "Context (background & domain)",
  b_audience: "Target Audience",
  b_format: "Output Format (table, markdown, steps, JSON...)",
  b_length: "Length / Scope",
  b_tone: "Tone & Voice",
  b_constraints: "Constraints & Rules (what to avoid / include)",
  b_example: "Example (optional)",
  b_lang: "Output Language",
  preview: "Generated Prompt Preview",
  send_checker: "Open in Checker",
  save_history: "Save to Library",
  improve_ai: "Improve with AI",

  // security
  sec_title: "Prompt Security Checker",
  sec_sub:
    "Scan a prompt for API keys, passwords, personal data, injection, and suspicious instructions before sending to an AI. Detected secrets are never sent to external AI.",
  scan: "Scan prompt",
  risk: "Risk Level",
  no_issues: "No known risky patterns found. Safe to proceed.",
  fix: "Safety Recommendation",
  matched: "Matched Text",
  sec_note: "Pattern-based scan — catches common risks and leaks, but cannot prove absolute safety.",
  redact_secrets: "Redact Detected Secrets",
  secrets_warning: "Critical secrets detected! Redact them before sending to external AI models.",
  sanitized: "Prompt sanitized! Secrets replaced with safe placeholders.",

  // library & history
  lib_title: "Prompt Library & History",
  lib_tab_library: "Templates",
  lib_tab_history: "My Saved Prompts",
  search: "Search prompts…",
  all: "All",
  use: "Use in Checker",
  favorite: "Favorite",
  del: "Delete",
  clear_history: "Clear history",
  empty_history: "No history yet. Save a prompt in the Builder or Checker to see it here.",
  favorites_only: "Favorites only",
  edit_prompt: "Edit Prompt",
  save_changes: "Save Changes",
  cancel: "Cancel",
  versions: "Versions",
  version: "v",
  restore_version: "Restore",
  export_backup: "Export Backup (JSON)",
  import_backup: "Import Backup (JSON)",
  backup_imported: "prompts imported successfully!",

  // ab testing
  ab_title: "A/B Testing Playground",
  ab_sub:
    "Compare two prompt variations on a shared input using actual server-side Groq execution. Review real response times, compare outputs side-by-side, and submit manual ratings.",
  prompt_a: "Prompt A",
  prompt_b: "Prompt B",
  test_input: "Shared Test Input (optional)",
  run_test: "Run Live A/B Test",
  winner: "AI Winner",
  tie: "Tie",
  heuristic_score: "Heuristic score",
  ai_judge: "AI Judge Evaluation",
  output: "Actual Output",
  latency: "Response Time",
  manual_rating: "Your Rating",
  rate_prompt_a: "Rate Output A",
  rate_prompt_b: "Rate Output B",
  save_result: "Save Test Result",
  test_saved: "A/B test result saved to history!",

  // analytics
  an_title: "Analytics Dashboard",
  an_sub: "Real-time metrics computed from prompts and live A/B tests stored in your browser.",
  total_prompts: "Prompts Analyzed",
  avg_score: "Average Score",
  best_score: "Best Score",
  avg_gain: "Avg. AI Improvement",
  saved_prompts_count: "Saved in Library",
  trend: "Score Trend (Latest Prompts)",
  weak: "Weakest Dimensions (avg % of max)",
  by_category: "Prompts by Category",
  sec_rate: "Security Clean Rate",
  ab_analytics_title: "A/B Test Evaluation Summary",
  ab_tests_run: "Total A/B Tests Run",
  wins_a: "Prompt A Wins",
  wins_b: "Prompt B Wins",
  ties: "Ties",
  avg_latency: "Avg. Response Time",
  an_empty: "No data recorded yet. Analyze or build prompts in the Checker to see analytics.",
  footer: "Prompt Quality Checker · B.Tech CSE mini project",

  // Layout & Navigation
  grp_user_workspace: "USER WORKSPACE",
  grp_administration: "ADMINISTRATION",
  grp_prompt_eng: "PROMPT ENGINEERING",
  grp_benchmark_eval: "BENCHMARK & EVALUATION",
  grp_security_defense: "SECURITY & DEFENSE",
  grp_automation_wf: "AUTOMATION & WORKFLOW",
  grp_collab: "WORKSPACE & COLLAB",
  grp_developer_api: "DEVELOPER & INSIGHTS",
  nav_dashboard: "My Dashboard",
  nav_activity_audit: "Activity Audit",
  nav_profile: "Profile & Settings",
  nav_admin: "Admin Console",
  nav_multimodel: "Multi-Model Matrix",
  nav_evaluator: "AI Benchmark Suite",
  nav_simulator: "Attack Simulator",
  nav_workflow: "Visual Workflow",
  nav_teams: "Teams & Workspace",
  nav_marketplace: "Prompt Marketplace",
  nav_api_portal: "Developer API",
  sign_in: "Sign In",
  sign_out: "Sign Out",
  admin_access: "Admin Access",
  editor_access: "Editor Access",
  viewer_access: "Viewer Access",
  user_access: "User Access",

  // User Dashboard
  dash_title: "Personalized User Dashboard",
  dash_sub: "Real-time prompt engineering metrics, activity history, and account telemetry.",
  dash_welcome: "Welcome back",
  dash_prompts_analyzed: "Prompts Analyzed",
  dash_prompts_optimized: "Prompts Optimized",
  dash_security_scans: "Security Scans",
  dash_benchmarks: "AI Evaluations",
  dash_quick_launch: "Quick Launchpad",
  dash_recent_activity: "Recent User Activity",
  dash_view_all_history: "View All History",
  dash_member_since: "Member Since",
  dash_last_login: "Last Login",
  dash_role: "Platform Role",
  dash_empty_activity: "No activities recorded yet. Start by checking or optimizing a prompt!",

  // Activity History
  act_title: "User Activity Audit Log",
  act_sub: "Complete traceable audit trail of all prompt engineering, benchmarking, security, and optimization actions.",
  act_export_csv: "Export to CSV",
  act_search_placeholder: "Search activity description...",
  act_all_modules: "All Modules",
  act_all_types: "All Types",
  act_col_activity: "Activity",
  act_col_module: "Module",
  act_col_date: "Timestamp",
  act_empty: "No matching activities found.",
  act_page: "Page",
  act_prev: "Previous",
  act_next: "Next",

  // Profile & Settings
  prof_title: "Profile & Security Settings",
  prof_sub: "Manage your identity, change passwords, and control active sessions.",
  prof_name_label: "Full Name",
  prof_email_label: "Email Address",
  prof_avatar_label: "Avatar Image URL",
  prof_save_changes: "Save Profile",
  prof_change_password: "Change Password",
  prof_current_pass: "Current Password",
  prof_new_pass: "New Password",
  prof_confirm_new_pass: "Confirm New Password",
  prof_revoke_sessions: "Revoke All Other Sessions",
  prof_revoke_desc: "Log out from all other browsers and devices.",
  prof_signout: "Sign Out Current Session",

  // Admin Dashboard
  adm_title: "Platform Admin Console",
  adm_sub: "Platform governance, user management, and system-wide telemetry.",
  adm_total_users: "Total Users",
  adm_active_users: "Active Sessions",
  adm_total_acts: "Total Platform Actions",
  adm_module_usage: "Module Utilization",
  adm_user_roster: "User Directory & Roles",
  adm_search_users: "Search users by name or email...",
  adm_col_name: "Name",
  adm_col_email: "Email",
  adm_col_role: "Role",
  adm_col_created: "Registered Date",
  adm_col_last_login: "Last Login",
  adm_global_feed: "Global Activity Feed",

  // Auth
  auth_signin_title: "Sign In to PromptIQ",
  auth_signin_sub: "Access your prompt workspace, evaluation history, and team benchmarks",
  auth_signup_title: "Create Your Account",
  auth_signup_sub: "Join the Enterprise AI Prompt Engineering & Quality Platform",
  auth_full_name: "Full Name",
  auth_email: "Email Address",
  auth_password: "Password",
  auth_confirm_password: "Confirm Password",
  auth_remember_me: "Remember me for 30 days",
  auth_signin_btn: "Sign In",
  auth_signup_btn: "Create Account",
  auth_have_account: "Already have an account?",
  auth_need_account: "Don't have an account?",
  auth_quick_demo: "Quick Demo Accounts",
  auth_demo_admin: "Demo Admin Director",
  auth_demo_member: "Demo Team Member",

  // Multi-Model
  mm_title: "Multi-Model Comparison Matrix",
  mm_sub: "Execute prompts across multiple AI models concurrently with real telemetry.",
  mm_select_models: "Select AI Models to Benchmark",
  mm_prompt_label: "Prompt to Benchmark",
  mm_run_btn: "Run Multi-Model Matrix",
  mm_running: "Executing parallel model calls...",
  mm_best_model: "Best Performing Model",
  mm_tokens: "Tokens",
  mm_latency: "Latency",
  mm_quality: "Quality",
  mm_relevance: "Relevance",
  mm_clarity: "Clarity",
  mm_completeness: "Completeness",

  // Evaluator
  eval_title: "AI Prompt Benchmark & Evaluation Suite",
  eval_sub: "Rigorous 6-dimensional algorithmic scoring with test cases and diagnostics.",
  eval_run_btn: "Run AI Benchmark",
  eval_overall_score: "Overall Benchmark Score",
  eval_weaknesses: "Weaknesses & Missing Info",
  eval_improvements: "Actionable Improvements",
  eval_test_cases: "Evaluation Test Cases",

  // Attack Simulator
  att_title: "Defensive Prompt Attack Simulator",
  att_sub: "Red-team your prompts against injection, jailbreaks, and credential leaks.",
  att_run_btn: "Run Defensive Attack Simulation",
  att_guardrails: "Hardened Prompt Guardrails",
  att_score: "Defense Score",

  // Workflows
  wf_title: "Visual Prompt Workflow Builder",
  wf_sub: "Compose and execute node-based prompt processing and evaluation pipelines.",
  wf_add_node: "Add Node",
  wf_execute: "Execute Pipeline",
  wf_save: "Save Workflow",

  // Teams
  team_title: "Team Collaboration & Workspace",
  team_sub: "Collaborate with team members, share prompts, and leave feedback.",
  team_members: "Members",
  team_invite: "Invite Member",
  team_shared_prompts: "Shared Prompts",
  team_comments: "Comments",

  // Marketplace
  mp_title: "Global Prompt Marketplace",
  mp_sub: "Discover, share, and rate production-grade prompt templates.",
  mp_publish: "Publish Prompt",
  mp_reviews: "Community Reviews",

  // Developer API
  api_title: "Developer API & REST Integrations",
  api_sub: "Programmatically analyze, scan, and optimize prompts via secure REST endpoints.",
  api_keys: "API Keys",
  api_create_key: "Generate API Key",

  // Before vs After
  ba_title: "Before vs After Comparison",
  ba_original: "Original Prompt",
  ba_improved: "Improved Prompt",
  ba_score_diff: "Score Gain",
  ba_checklist: "Key Improvements Made",
  ba_use_improved: "Use Improved Prompt",
};

type Dict = typeof en;

const te: Dict = {
  nav_checker: "చెకర్",
  nav_builder: "బిల్డర్",
  nav_security: "భద్రత",
  nav_library: "లైబ్రరీ",
  nav_ab: "A/B పరీక్ష",
  nav_analytics: "విశ్లేషణ",
  hero_badge: "నియమాల ఆధారిత స్కోరు + AI తిరగరాత",
  hero_title_a: "ప్రాంప్ట్",
  hero_title_b: "నాణ్యత",
  hero_title_c: "చెకర్",
  hero_sub:
    "మీ ప్రాంప్ట్‌ను అతికించండి, ఐదు ప్రమాణాలపై తక్షణ స్కోరు పొందండి, ముందు vs తర్వాత తేడాలను సరిపోల్చండి మరియు AI తో మెరుగుపరచండి.",
  your_prompt: "మీ ప్రాంప్ట్",
  load_sample: "నమూనా లోడ్ చేయండి",
  try_before_after: "ముందు vs తర్వాత చూడండి",
  words: "పదాలు",
  category: "వర్గం",
  analyze: "ప్రాంప్ట్ విశ్లేషించండి",
  improve: "AI తో మెరుగుపరచండి",
  export: "నివేదిక డౌన్‌లోడ్",
  clear: "తుడిచివేయండి",
  asking: "Groq ని అడుగుతోంది",
  ai_analysis: "AI విశ్లేషణ",
  improved_prompt: "మెరుగైన ప్రాంప్ట్",
  copy: "కాపీ",
  copied: "కాపీ అయింది",
  use_rescore: "ఈ ప్రాంప్ట్ వాడి మళ్ళీ స్కోర్ చేయండి →",
  score: "స్కోరు",
  empty_score: "ప్రాంప్ట్ రాసి (లేదా నమూనా లోడ్ చేసి) “ప్రాంప్ట్ విశ్లేషించండి” నొక్కండి.",
  heuristic_note: "ఇది వచన నమూనాల ఆధారంగా అంచనా మాత్రమే — నాణ్యతకు ఖచ్చితమైన కొలమానం కాదు.",
  suggestions: "సూచనలు",
  still_works: "నియమాల ఆధారిత విశ్లేషణ పనిచేస్తూనే ఉంది.",
  before_after: "ముందు vs తర్వాత",
  before: "ముందు",
  after: "తర్వాత",
  points: "పాయింట్లు",
  added_lines: "తిరగరాతలో జోడించినవి",
  removed_lines: "తిరగరాతలో తీసివేసినవి",
  how: "ఇది ఎలా పనిచేస్తుంది",
  how_sub:
    "స్కోరు మీ బ్రౌజర్‌లోనే స్పష్టమైన నియమాలతో (కీవర్డ్, నిర్మాణ తనిఖీలు) లెక్కించబడుతుంది. ఇది నేర్చుకోవడానికి సహాయం — ఎక్కువ స్కోరు మంచి సమాధానానికి హామీ కాదు.",
  saved_history: "ఈ బ్రౌజర్‌లో మీ చరిత్రకు సేవ్ అయింది.",
  security_quick: "భద్రతా తనిఖీ",

  // builder
  builder_title: "స్మార్ట్ ప్రాంప్ట్ బిల్డర్",
  builder_sub:
    "ప్రాంప్ట్ భాగాలను (పని, సందర్భం, ప్రేక్షకులు, శైలి, ఫార్మాట్, నిబంధనలు) పూరించండి. మీరు టైప్ చేస్తుండగానే ప్రాంప్ట్ మరియు స్కోరు మారుతాయి.",
  b_role: "పాత్ర / వ్యక్తిత్వం",
  b_task: "పని (ఏమి చేయాలో స్పష్టంగా)",
  b_context: "సందర్భం (నేపథ్యం & రంగం)",
  b_audience: "లక్ష్య ప్రేక్షకులు",
  b_format: "అవుట్‌పుట్ ఫార్మాట్ (పట్టిక, స్టెప్స్, JSON...)",
  b_length: "పొడవు / పరిధి",
  b_tone: "శైలి & స్వభావం",
  b_constraints: "నిబంధనలు (చేర్చవలసినవి / వద్దనివి)",
  b_example: "ఉదాహరణ (ఐచ్ఛికం)",
  b_lang: "అవుట్‌పుట్ భాష",
  preview: "రూపొందించిన ప్రాంప్ట్ ప్రివ్యూ",
  send_checker: "చెకర్‌లో తెరవండి",
  save_history: "లైబ్రరీలో సేవ్ చేయండి",
  improve_ai: "AI తో మెరుగుపరచండి",

  // security
  sec_title: "ప్రాంప్ట్ భద్రతా తనిఖీ",
  sec_sub:
    "AI కి పంపే ముందు API కీలు, పాస్‌వర్డ్‌లు, రహస్య సమాచారం, ఇంజెక్షన్ ప్రమాదాల కోసం ప్రాంప్ట్‌ను స్కాన్ చేయండి. గుర్తించిన రహస్యాలు AI కి పంపబడవు.",
  scan: "స్కాన్ చేయండి",
  risk: "ప్రమాద స్థాయి",
  no_issues: "తెలిసిన ప్రమాదకర నమూనాలు ఏవీ లేవు. సురక్షితం.",
  fix: "భద్రతా సూచన",
  matched: "గుర్తించిన వచనం",
  sec_note: "నమూనా ఆధారిత స్కాన్ — సాధారణ ప్రమాదాలను పట్టుకుంటుంది, కానీ పూర్తి భద్రతకు హామీ ఇవ్వదు.",
  redact_secrets: "రహస్య సమాచారాన్ని దాచండి (Redact)",
  secrets_warning: "కీలక రహస్యాలు గుర్తించబడ్డాయి! బయటి AI కి పంపే ముందు వాటిని దాచండి.",
  sanitized: "ప్రాంప్ట్ శుద్ధి చేయబడింది! రహస్యాలు సురక్షిత ప్లేస్‌హోల్డర్లతో మార్చబడ్డాయి.",

  // library & history
  lib_title: "ప్రాంప్ట్ లైబ్రరీ & చరిత్ర",
  lib_tab_library: "టెంప్లేట్లు",
  lib_tab_history: "నా సేవ్ చేసిన ప్రాంప్ట్‌లు",
  search: "వెతకండి…",
  all: "అన్నీ",
  use: "చెకర్‌లో వాడండి",
  favorite: "ఇష్టమైనది",
  del: "తొలగించు",
  clear_history: "చరిత్ర తుడిచివేయండి",
  empty_history: "ఇంకా చరిత్ర లేదు. చెకర్ లేదా బిల్డర్‌లో ప్రాంప్ట్ సేవ్ చేయండి.",
  favorites_only: "ఇష్టమైనవి మాత్రమే",
  edit_prompt: "ప్రాంప్ట్ సవరించండి",
  save_changes: "మార్పులు సేవ్ చేయండి",
  cancel: "రద్దు",
  versions: "వెర్షన్లు",
  version: "v",
  restore_version: "పునరుద్ధరించు",
  export_backup: "బ్యాకప్ ఎగుమతి (JSON)",
  import_backup: "బ్యాకప్ దిగుమతి (JSON)",
  backup_imported: "ప్రాంప్ట్‌లు విజయవంతంగా దిగుమతి అయ్యాయి!",

  // ab testing
  ab_title: "A/B పరీక్షా వేదిక",
  ab_sub:
    "ఒకే ఇన్‌పుట్‌పై రెండు ప్రాంప్ట్ వెర్షన్లను Groq తో రన్ చేసి, నిజమైన రెస్పాన్స్ సమయాలను, AI మరియు మీ రేటింగ్‌లతో పోల్చండి. ఎప్పుడూ నకిలీ ఫలితాలు చూపించబడవు.",
  prompt_a: "ప్రాంప్ట్ A",
  prompt_b: "ప్రాంప్ట్ B",
  test_input: "ఉమ్మడి పరీక్ష ఇన్‌పుట్ (ఐచ్ఛికం)",
  run_test: "లైవ్ A/B పరీక్ష నడపండి",
  winner: "AI విజేత",
  tie: "సమానం",
  heuristic_score: "నియమాల స్కోరు",
  ai_judge: "AI న్యాయనిర్ణేత మూల్యాంకనం",
  output: "నిజమైన ఫలితం",
  latency: "రెస్పాన్స్ సమయం",
  manual_rating: "మీ రేటింగ్",
  rate_prompt_a: "ఫలితం A కి రేటింగ్ ఇవ్వండి",
  rate_prompt_b: "ఫలితం B కి రేటింగ్ ఇవ్వండి",
  save_result: "పరీక్ష ఫలితం సేవ్ చేయండి",
  test_saved: "A/B పరీక్ష ఫలితం చరిత్రకు సేవ్ అయింది!",

  // analytics
  an_title: "విశ్లేషణ డాష్‌బోర్డ్",
  an_sub: "మీ బ్రౌజర్ చరిత్రలో సేవ్ అయిన ప్రాంప్ట్‌లు మరియు A/B పరీక్షల ఆధారంగా లెక్కించబడింది.",
  total_prompts: "విశ్లేషించిన ప్రాంప్ట్‌లు",
  avg_score: "సగటు స్కోరు",
  best_score: "అత్యుత్తమ స్కోరు",
  avg_gain: "సగటు AI మెరుగుదల",
  saved_prompts_count: "లైబ్రరీలో సేవ్ అయినవి",
  trend: "స్కోరు ధోరణి (చివరి ప్రాంప్ట్‌లు)",
  weak: "బలహీన ప్రమాణాలు (గరిష్టంలో సగటు %)",
  by_category: "వర్గాల వారీగా",
  sec_rate: "భద్రతా ఉత్తీర్ణత శాతం",
  ab_analytics_title: "A/B పరీక్షల సారాంశం",
  ab_tests_run: "మొత్తం A/B పరీక్షలు",
  wins_a: "ప్రాంప్ట్ A విజయాలు",
  wins_b: "ప్రాంప్ట్ B విజయాలు",
  ties: "సమానం",
  avg_latency: "సగటు రెస్పాన్స్ సమయం",
  an_empty: "ఇంకా డేటా లేదు. విశ్లేషణ చూడటానికి చెకర్‌లో కొన్ని ప్రాంప్ట్‌లు విశ్లేషించండి.",
  footer: "ప్రాంప్ట్ నాణ్యత చెకర్ · B.Tech CSE మినీ ప్రాజెక్ట్",

  // Layout & Navigation
  grp_user_workspace: "యూజర్ వర్క్‌స్పేస్",
  grp_administration: "నిర్వాహక విభాగం",
  grp_prompt_eng: "ప్రాంప్ట్ ఇంజనీరింగ్",
  grp_benchmark_eval: "బెంచ్‌మార్క్ & మూల్యాంకనం",
  grp_security_defense: "భద్రత & రక్షణ",
  grp_automation_wf: "ఆటోమేషన్ & వర్క్‌ఫ్లో",
  grp_collab: "సహకారం & వర్క్‌స్పేస్",
  grp_developer_api: "డెవలపర్ & అంతర్దృష్టులు",
  nav_dashboard: "నా డాష్‌బోర్డ్",
  nav_activity_audit: "కార్యకలాపాల ఆడిట్",
  nav_profile: "ప్రొఫైల్ & సెట్టింగ్‌లు",
  nav_admin: "అడ్మిన్ కన్సోల్",
  nav_multimodel: "మల్టీ-మోడల్ మ్యాట్రిక్స్",
  nav_evaluator: "AI బెంచ్‌మార్క్ సూట్",
  nav_simulator: "దాడి సిమ్యులేటర్",
  nav_workflow: "విజువల్ వర్క్‌ఫ్లో",
  nav_teams: "టీమ్‌లు & వర్క్‌స్పేస్",
  nav_marketplace: "ప్రాంప్ట్ మార్కెట్‌ప్లేస్",
  nav_api_portal: "డెవలపర్ API",
  sign_in: "లాగిన్ అవ్వండి",
  sign_out: "లాగ్ అవుట్",
  admin_access: "అడ్మిన్ యాక్సెస్",
  editor_access: "ఎడిటర్ యాక్సెస్",
  viewer_access: "వీక్షకుల యాక్సెస్",
  user_access: "యూజర్ యాక్సెస్",

  // User Dashboard
  dash_title: "వ్యక్తిగత యూజర్ డాష్‌బోర్డ్",
  dash_sub: "రియల్-టైమ్ ప్రాంప్ట్ గణాంకాలు, కార్యకలాపాల చరిత్ర మరియు ఖాతా సమాచారం.",
  dash_welcome: "స్వాగతం",
  dash_prompts_analyzed: "విశ్లేషించిన ప్రాంప్ట్‌లు",
  dash_prompts_optimized: "మెరుగుపరిచిన ప్రాంప్ట్‌లు",
  dash_security_scans: "భద్రతా తనిఖీలు",
  dash_benchmarks: "AI మూల్యాంకనాలు",
  dash_quick_launch: "శీఘ్ర సాధనాలు",
  dash_recent_activity: "ఇటీవలి కార్యకలాపాలు",
  dash_view_all_history: "పూర్తి చరిత్ర చూడండి",
  dash_member_since: "చేరిన తేదీ",
  dash_last_login: "చివరి లాగిన్",
  dash_role: "ఖాతా పాత్ర",
  dash_empty_activity: "ఇంకా కార్యకలాపాలు లేవు. ప్రాంప్ట్ తనిఖీ లేదా ఆప్టిమైజ్ చేసి ప్రారంభించండి!",

  // Activity History
  act_title: "యూజర్ కార్యకలాపాల ఆడిట్ లాగ్",
  act_sub: "ప్రాంప్ట్ ఇంజనీరింగ్, బెంచ్‌మార్కింగ్, భద్రత మరియు ఆప్టిమైజేషన్ చర్యల పూర్తి రికార్డు.",
  act_export_csv: "CSV గా డౌన్‌లోడ్",
  act_search_placeholder: "కార్యకలాపాలను వెతకండి...",
  act_all_modules: "అన్ని మాడ్యూల్స్",
  act_all_types: "అన్ని రకాలు",
  act_col_activity: "కార్యకలాపం",
  act_col_module: "మాడ్యూల్",
  act_col_date: "తేదీ & సమయం",
  act_empty: "సరిపోలే కార్యకలాపాలు ఏవీ కనిపించలేదు.",
  act_page: "పేజీ",
  act_prev: "మునుపటి",
  act_next: "తదుపరి",

  // Profile & Settings
  prof_title: "ప్రొఫైల్ & భద్రతా సెట్టింగ్‌లు",
  prof_sub: "మీ వివరాలను నిర్వహించండి, పాస్‌వర్డ్ మార్చండి మరియు సెషన్లను నియంత్రించండి.",
  prof_name_label: "పూర్తి పేరు",
  prof_email_label: "ఇమెయిల్ చిరునామా",
  prof_avatar_label: "అవతార్ చిత్రం URL",
  prof_save_changes: "ప్రొఫైల్ సేవ్ చేయండి",
  prof_change_password: "పాస్‌వర్డ్ మార్చండి",
  prof_current_pass: "ప్రస్తుత పాస్‌వర్డ్",
  prof_new_pass: "కొత్త పాస్‌వర్డ్",
  prof_confirm_new_pass: "కొత్త పాస్‌వర్డ్ నిర్ధారించండి",
  prof_revoke_sessions: "మిగిలిన అన్ని సెషన్లను రద్దు చేయండి",
  prof_revoke_desc: "ఇతర బ్రౌజర్లు మరియు పరికరాల నుండి లాగ్ అవుట్ చేయండి.",
  prof_signout: "ఈ సెషన్ నుండి లాగ్ అవుట్ అవ్వండి",

  // Admin Dashboard
  adm_title: "ప్లాట్‌ఫామ్ అడ్మిన్ కన్సోల్",
  adm_sub: "ప్లాట్‌ఫామ్ నియంత్రణ, యూజర్ల నిర్వహణ మరియు సిస్టమ్ గణాంకాలు.",
  adm_total_users: "మొత్తం యూజర్లు",
  adm_active_users: "యాక్టివ్ సెషన్లు",
  adm_total_acts: "మొత్తం ప్లాట్‌ఫామ్ చర్యలు",
  adm_module_usage: "మాడ్యూల్ వినియోగం",
  adm_user_roster: "యూజర్ల జాబితా & పాత్రలు",
  adm_search_users: "పేరు లేదా ఇమెయిల్‌తో వెతకండి...",
  adm_col_name: "పేరు",
  adm_col_email: "ఇమెయిల్",
  adm_col_role: "పాత్ర",
  adm_col_created: "నమోదైన తేదీ",
  adm_col_last_login: "చివరి లాగిన్",
  adm_global_feed: "గ్లోబల్ కార్యకలాపాల ఫీడ్",

  // Auth
  auth_signin_title: "PromptIQ కి లాగిన్ అవ్వండి",
  auth_signin_sub: "మీ ప్రాంప్ట్ వర్క్‌స్పేస్, చరిత్ర మరియు టీమ్ బెంచ్‌మార్క్‌లను యాక్సెస్ చేయండి",
  auth_signup_title: "కొత్త ఖాతాను సృష్టించండి",
  auth_signup_sub: "ఎంటర్‌ప్రైజ్ AI ప్రాంప్ట్ ఇంజనీరింగ్ ప్లాట్‌ఫామ్‌లో చేరండి",
  auth_full_name: "పూర్తి పేరు",
  auth_email: "ఇమెయిల్ చిరునామా",
  auth_password: "పాస్‌వర్డ్",
  auth_confirm_password: "పాస్‌వర్డ్ నిర్ధారించండి",
  auth_remember_me: "నన్ను 30 రోజులు గుర్తుంచుకో",
  auth_signin_btn: "లాగిన్ అవ్వండి",
  auth_signup_btn: "ఖాతా సృష్టించండి",
  auth_have_account: "ఇప్పటికే ఖాతా ఉందా?",
  auth_need_account: "ఖాతా లేదా?",
  auth_quick_demo: "శీఘ్ర డెమో ఖాతాలు",
  auth_demo_admin: "డెమో అడ్మిన్ డైరెక్టర్",
  auth_demo_member: "డెమో టీమ్ మెంబర్",

  // Multi-Model
  mm_title: "మల్టీ-మోడల్ పోలిక మ్యాట్రిక్స్",
  mm_sub: "నిజమైన గణాంకాలతో బహుళ AI మోడల్స్‌పై ఒకేసారి ప్రాంప్ట్‌లను అమలు చేయండి.",
  mm_select_models: "పరీక్షించాల్సిన AI మోడళ్లను ఎంచుకోండి",
  mm_prompt_label: "పరీక్షించవలసిన ప్రాంప్ట్",
  mm_run_btn: "మల్టీ-మోడల్ మ్యాట్రిక్స్ రన్ చేయండి",
  mm_running: "సమాంతర మోడల్ కాల్స్ రన్ అవుతున్నాయి...",
  mm_best_model: "అత్యుత్తమ పనితీరు కనబరిచిన మోడల్",
  mm_tokens: "టోకెన్లు",
  mm_latency: "రెస్పాన్స్ సమయం",
  mm_quality: "నాణ్యత",
  mm_relevance: "సంగతత",
  mm_clarity: "స్పష్టత",
  mm_completeness: "సమగ్రత",

  // Evaluator
  eval_title: "AI ప్రాంప్ట్ బెంచ్‌మార్క్ & మూల్యాంకన సూట్",
  eval_sub: "పరీక్షా కేసులు మరియు విశ్లేషణలతో 6-ప్రమాణాల అల్గారిథమిక్ స్కోరింగ్.",
  eval_run_btn: "AI బెంచ్‌మార్క్ రన్ చేయండి",
  eval_overall_score: "మొత్తం బెంచ్‌మార్క్ స్కోరు",
  eval_weaknesses: "లోపాలు & తప్పిపోయిన వివరాలు",
  eval_improvements: "చేయవలసిన మార్పులు",
  eval_test_cases: "మూల్యాంకన పరీక్ష కేసులు",

  // Attack Simulator
  att_title: "డిఫెన్సివ్ ప్రాంప్ట్ దాడి సిమ్యులేటర్",
  att_sub: "ఇంజెక్షన్లు, జైల్ బ్రేక్‌లు మరియు సమాచార లీక్‌లపై మీ ప్రాంప్ట్‌లను పరీక్షించండి.",
  att_run_btn: "డిఫెన్సివ్ దాడి సిమ్యులేషన్ నడపండి",
  att_guardrails: "పటిష్టమైన ప్రాంప్ట్ రక్షణలు",
  att_score: "రక్షణ స్కోరు",

  // Workflows
  wf_title: "విజువల్ ప్రాంప్ట్ వర్క్‌ఫ్లో బిల్డర్",
  wf_sub: "నోడ్-ఆధారిత ప్రాంప్ట్ ప్రాసెసింగ్ మరియు మూల్యాంకన పైప్‌లైన్‌లను రూపొందించండి.",
  wf_add_node: "నోడ్ జోడించు",
  wf_execute: "పైప్‌లైన్ అమలు చేయండి",
  wf_save: "వర్క్‌ఫ్లో సేవ్ చేయండి",

  // Teams
  team_title: "టీమ్ సహకారం & వర్క్‌స్పేస్",
  team_sub: "సహోద్యోగులతో కలిసి పనిచేయండి, ప్రాంప్ట్‌లను పంచుకోండి మరియు అభిప్రాయాలను నమోదు చేయండి.",
  team_members: "సభ్యులు",
  team_invite: "సభ్యుడిని ఆహ్వానించండి",
  team_shared_prompts: "షేర్ చేసిన ప్రాంప్ట్‌లు",
  team_comments: "వ్యాఖ్యలు",

  // Marketplace
  mp_title: "గ్లోబల్ ప్రాంప్ట్ మార్కెట్‌ప్లేస్",
  mp_sub: "ఉత్తమ ప్రాంప్ట్ టెంప్లేట్లను కనుగొనండి, పంచుకోండి మరియు రేటింగ్ ఇవ్వండి.",
  mp_publish: "ప్రాంప్ట్ ప్రచురించండి",
  mp_reviews: "కమ్యూనిటీ సమీక్షలు",

  // Developer API
  api_title: "డెవలపర్ API & REST అనుసంధానాలు",
  api_sub: "సురక్షితమైన REST ఎండ్‌పాయింట్ల ద్వారా ప్రాంప్ట్‌లను విశ్లేషించండి మరియు ఆప్టిమైజ్ చేయండి.",
  api_keys: "API కీలు",
  api_create_key: "కొత్త API కీ సృష్టించండి",

  // Before vs After
  ba_title: "ముందు vs తర్వాత పోలిక",
  ba_original: "అసలు ప్రాంప్ట్",
  ba_improved: "మెరుగైన ప్రాంప్ట్",
  ba_score_diff: "స్కోరు పెరుగుదల",
  ba_checklist: "చేసిన ముఖ్యమైన మార్పులు",
  ba_use_improved: "మెరుగైన ప్రాంప్ట్‌ను వాడండి",
};

export const CRITERION_TE: Record<string, string> = {
  clarity: "స్పష్టత",
  specificity: "నిర్దిష్టత",
  context: "సందర్భం",
  output: "అవుట్‌పుట్ అవసరాలు",
  constraints: "నిబంధనలు / వివరాలు",
};

export const CATEGORY_TE: Record<string, string> = {
  General: "సాధారణం",
  Coding: "కోడింగ్",
  Writing: "రచన",
  Education: "విద్య",
  Research: "పరిశోధన",
  Business: "వ్యాపారం",
};

export const DICTS: Record<Lang, Dict> = { en, te };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  crit: (key: string, label: string) => string;
  cat: (c: string) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pqc-lang") as Lang | null;
      if (saved === "en" || saved === "te") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pqc-lang", l);
    } catch {}
  };

  const t = DICTS[lang];
  const crit = (key: string, label: string) =>
    lang === "te" && CRITERION_TE[key] ? CRITERION_TE[key] : label;
  const cat = (c: string) =>
    lang === "te" && CATEGORY_TE[c] ? CATEGORY_TE[c] : c;

  return (
    <LangContext.Provider value={{ lang, setLang, t, crit, cat }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}
