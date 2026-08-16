(() => {
  "use strict";

  const TIME_ZONE = "Asia/Manila";
  const SUBJECTS = ["Mathematics", "Language & Reading", "Science", "Reasoning"];
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, number(value)));
  const escapeHtml = value => window.Tuto?.escape?.(value) || String(value ?? "");

  function manilaDateKey(value = new Date()) {
    const candidate = new Date(value);
    const safeDate = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
    const parts = Object.fromEntries(
      dateFormatter.formatToParts(safeDate).filter(part => part.type !== "literal").map(part => [part.type, part.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function dateFromKey(key) {
    return new Date(`${key}T00:00:00Z`);
  }

  function addDays(key, days) {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function startOfWeekKey(key) {
    const date = dateFromKey(key);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - (day - 1));
    return date.toISOString().slice(0, 10);
  }

  function displayDate(key, options = { month: "short", day: "numeric" }) {
    if (!key) return "—";
    return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", ...options }).format(dateFromKey(key));
  }

  function displayDateRange(start, end) {
    if (!start || !end) return "This week";
    const startDate = dateFromKey(start);
    const endDate = dateFromKey(end);
    const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
    const startText = new Intl.DateTimeFormat("en-PH", {
      timeZone: "UTC",
      month: "short",
      day: "numeric"
    }).format(startDate);
    const endText = new Intl.DateTimeFormat("en-PH", {
      timeZone: "UTC",
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric"
    }).format(endDate);
    return `${startText}–${endText}`;
  }

  function formatPercent(value, hasData = true) {
    if (!hasData) return "—";
    const rounded = Math.round(number(value) * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(number(seconds)));
    if (total < 60) return total ? `${total} sec` : "0 min";
    const hours = Math.floor(total / 3600);
    const minutes = Math.round((total % 3600) / 60);
    if (!hours) return `${minutes} min`;
    return `${hours} hr${hours === 1 ? "" : "s"}${minutes ? ` ${minutes} min` : ""}`;
  }

  function attemptQuestionCount(item) {
    if (Number.isFinite(Number(item?.total))) return clamp(item.total, 0, 500);
    if (Number.isFinite(Number(item?.items))) return clamp(item.items, 0, 500);
    if (Array.isArray(item?.details)) return clamp(item.details.length, 0, 500);
    return 0;
  }

  function attemptCorrectCount(item, questions) {
    if (Number.isFinite(Number(item?.correct))) return clamp(item.correct, 0, questions);
    if (Number.isFinite(Number(item?.score))) return clamp(item.score, 0, questions);
    if (Array.isArray(item?.details)) return clamp(item.details.filter(detail => detail?.correct === true).length, 0, questions);
    return 0;
  }

  function attemptSubjectRows(item, questions, correct) {
    const rows = [];
    const breakdown = item?.categoryBreakdown;
    if (breakdown && typeof breakdown === "object" && !Array.isArray(breakdown)) {
      Object.entries(breakdown).forEach(([subject, stats]) => {
        const total = clamp(stats?.total, 0, 500);
        rows.push({ subject, questions: total, correct: clamp(stats?.correct, 0, total) });
      });
      if (rows.length) return rows;
    }

    if (Array.isArray(item?.details) && item.details.length) {
      const grouped = new Map();
      item.details.forEach(detail => {
        const subject = String(detail?.category || "Other").trim() || "Other";
        const row = grouped.get(subject) || { subject, questions: 0, correct: 0 };
        row.questions += 1;
        if (detail?.correct === true) row.correct += 1;
        grouped.set(subject, row);
      });
      return [...grouped.values()];
    }

    const subject = String(item?.category || "Other").trim() || "Other";
    return [{ subject, questions, correct }];
  }

  function periodStats(attempts) {
    const questions = attempts.reduce((sum, item) => sum + item.questions, 0);
    const correct = attempts.reduce((sum, item) => sum + item.correct, 0);
    const activeDays = new Set(attempts.filter(item => item.questions > 0).map(item => item.date)).size;
    const studySeconds = attempts.reduce((sum, item) => sum + item.elapsedSeconds, 0);
    return {
      attempts: attempts.length,
      questions,
      correct,
      accuracy: questions ? Math.round((correct / questions) * 1000) / 10 : 0,
      activeDays,
      studySeconds
    };
  }

  function calculateStreaks(dailyTotals, todayKey) {
    const qualifying = [...dailyTotals.entries()]
      .filter(([, questions]) => questions >= 10)
      .map(([date]) => date)
      .sort();
    if (!qualifying.length) return { current: 0, longest: 0 };

    let longest = 1;
    let run = 1;
    for (let index = 1; index < qualifying.length; index += 1) {
      if (qualifying[index] === addDays(qualifying[index - 1], 1)) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 1;
      }
    }

    const latest = qualifying[qualifying.length - 1];
    if (latest < addDays(todayKey, -1)) return { current: 0, longest };
    let current = 1;
    for (let index = qualifying.length - 1; index > 0; index -= 1) {
      if (qualifying[index - 1] === addDays(qualifying[index], -1)) current += 1;
      else break;
    }
    return { current, longest };
  }

  function buildLocalSummary(history) {
    const today = manilaDateKey();
    const weekStart = startOfWeekKey(today);
    const weekEnd = addDays(weekStart, 6);
    const previousWeekStart = addDays(weekStart, -7);
    const previousWeekEnd = addDays(weekStart, -1);

    const attempts = (Array.isArray(history) ? history : []).map(item => {
      const questions = attemptQuestionCount(item);
      const correct = attemptCorrectCount(item, questions);
      return {
        source: item,
        date: manilaDateKey(item?.completedAt || item?.completed_at || new Date()),
        questions,
        correct,
        elapsedSeconds: clamp(item?.elapsedSeconds, 0, 28800),
        subjects: attemptSubjectRows(item, questions, correct)
      };
    });

    const currentAttempts = attempts.filter(item => item.date >= weekStart && item.date <= weekEnd);
    const previousAttempts = attempts.filter(item => item.date >= previousWeekStart && item.date <= previousWeekEnd);
    const currentWeek = periodStats(currentAttempts);
    const previousWeek = periodStats(previousAttempts);
    const allTime = periodStats(attempts);

    const dailyTotals = new Map();
    attempts.forEach(item => dailyTotals.set(item.date, (dailyTotals.get(item.date) || 0) + item.questions));
    const streaks = calculateStreaks(dailyTotals, today);

    const subjectNames = new Set(SUBJECTS);
    attempts.forEach(item => item.subjects.forEach(row => subjectNames.add(row.subject)));
    const subjects = [...subjectNames]
      .sort((a, b) => {
        const aIndex = SUBJECTS.indexOf(a);
        const bIndex = SUBJECTS.indexOf(b);
        if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
        return a.localeCompare(b);
      })
      .map(subject => {
        const aggregate = rows => rows.reduce((total, attempt) => {
          attempt.subjects.filter(row => row.subject === subject).forEach(row => {
            total.questions += row.questions;
            total.correct += row.correct;
          });
          return total;
        }, { questions: 0, correct: 0 });
        const current = aggregate(currentAttempts);
        const previous = aggregate(previousAttempts);
        const total = aggregate(attempts);
        const accuracy = stats => stats.questions ? Math.round((stats.correct / stats.questions) * 1000) / 10 : 0;
        return {
          subject,
          currentQuestions: current.questions,
          currentCorrect: current.correct,
          currentAccuracy: accuracy(current),
          previousQuestions: previous.questions,
          previousCorrect: previous.correct,
          previousAccuracy: accuracy(previous),
          accuracyChange: Math.round((accuracy(current) - accuracy(previous)) * 10) / 10,
          totalQuestions: total.questions,
          totalCorrect: total.correct,
          totalAccuracy: accuracy(total)
        };
      });

    const dailyActivity = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      const rows = attempts.filter(item => item.date === date);
      return { date, ...periodStats(rows) };
    });

    return {
      timezone: TIME_ZONE,
      weekStart,
      weekEnd,
      previousWeekStart,
      previousWeekEnd,
      currentWeek,
      previousWeek,
      comparison: {
        attempts: currentWeek.attempts - previousWeek.attempts,
        questions: currentWeek.questions - previousWeek.questions,
        accuracyPoints: Math.round((currentWeek.accuracy - previousWeek.accuracy) * 10) / 10,
        activeDays: currentWeek.activeDays - previousWeek.activeDays,
        studySeconds: currentWeek.studySeconds - previousWeek.studySeconds
      },
      allTime,
      subjects,
      dailyActivity,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      streakDailyQuestionGoal: 10,
      lastActivityDate: attempts.map(item => item.date).sort().pop() || null,
      summaryScope: "local-device"
    };
  }

  function normalizeSummary(summary, fallback) {
    if (!summary || typeof summary !== "object") return fallback;
    const normalizePeriod = period => ({
      attempts: number(period?.attempts),
      questions: number(period?.questions),
      correct: number(period?.correct),
      accuracy: number(period?.accuracy),
      activeDays: number(period?.activeDays),
      studySeconds: number(period?.studySeconds)
    });
    return {
      ...fallback,
      ...summary,
      currentWeek: normalizePeriod(summary.currentWeek),
      previousWeek: normalizePeriod(summary.previousWeek),
      allTime: normalizePeriod(summary.allTime),
      comparison: {
        attempts: number(summary.comparison?.attempts),
        questions: number(summary.comparison?.questions),
        accuracyPoints: number(summary.comparison?.accuracyPoints),
        activeDays: number(summary.comparison?.activeDays),
        studySeconds: number(summary.comparison?.studySeconds)
      },
      subjects: Array.isArray(summary.subjects) ? summary.subjects.map(row => ({
        subject: String(row?.subject || "Other"),
        currentQuestions: number(row?.currentQuestions),
        currentCorrect: number(row?.currentCorrect),
        currentAccuracy: number(row?.currentAccuracy),
        previousQuestions: number(row?.previousQuestions),
        previousCorrect: number(row?.previousCorrect),
        previousAccuracy: number(row?.previousAccuracy),
        accuracyChange: number(row?.accuracyChange),
        totalQuestions: number(row?.totalQuestions),
        totalCorrect: number(row?.totalCorrect),
        totalAccuracy: number(row?.totalAccuracy)
      })) : fallback.subjects,
      dailyActivity: Array.isArray(summary.dailyActivity) ? summary.dailyActivity.map(row => ({
        date: String(row?.date || ""),
        attempts: number(row?.attempts),
        questions: number(row?.questions),
        correct: number(row?.correct),
        accuracy: number(row?.accuracy),
        studySeconds: number(row?.studySeconds)
      })) : fallback.dailyActivity,
      currentStreak: number(summary.currentStreak),
      longestStreak: number(summary.longestStreak),
      streakDailyQuestionGoal: number(summary.streakDailyQuestionGoal) || 10
    };
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function setDelta(selector, value, options = {}) {
    const element = document.querySelector(selector);
    if (!element) return;
    const delta = Math.round(number(value) * 10) / 10;
    const unit = options.unit || "";
    let text;
    if (options.noBaseline) text = "No previous-week data";
    else if (delta > 0) text = `+${delta}${unit} vs last week`;
    else if (delta < 0) text = `${delta}${unit} vs last week`;
    else text = "No change from last week";
    element.textContent = text;
    element.className = `progress-delta ${options.noBaseline || delta === 0 ? "neutral" : delta > 0 ? "positive" : "negative"}`;
  }

  function renderSummary(summary) {
    const current = summary.currentWeek;
    const previous = summary.previousWeek;
    const noPreviousAccuracy = previous.questions === 0;

    setText("#progress-week-label", displayDateRange(summary.weekStart, summary.weekEnd));
    setText("#progress-week-detail", `${current.activeDays} active study day${current.activeDays === 1 ? "" : "s"} · ${formatDuration(current.studySeconds)} reviewed`);
    setText("#comparison-period-label", displayDateRange(summary.previousWeekStart, summary.previousWeekEnd));

    setText("#dash-week-questions", current.questions.toLocaleString("en-PH"));
    setText("#dash-week-questions-note", `${current.correct.toLocaleString("en-PH")} correct answer${current.correct === 1 ? "" : "s"}`);
    setText("#dash-week-accuracy", formatPercent(current.accuracy, current.questions > 0));
    const accuracyRing = document.querySelector("#accuracy-ring");
    if (accuracyRing) {
      const accuracyValue = current.questions > 0 ? clamp(current.accuracy, 0, 100) : 0;
      accuracyRing.style.setProperty("--ring-value", `${accuracyValue}%`);
    }
    setText("#dash-week-accuracy-note", current.questions ? `${current.correct} of ${current.questions} answered correctly` : "No completed questions yet");
    setText("#dash-week-sessions", current.attempts.toLocaleString("en-PH"));
    setText("#dash-week-sessions-note", `${current.activeDays} active study day${current.activeDays === 1 ? "" : "s"}`);
    setText("#dash-current-streak", `${summary.currentStreak} day${summary.currentStreak === 1 ? "" : "s"}`);
    setText("#dash-streak-note", `Review ${summary.streakDailyQuestionGoal} questions in a day`);

    setText("#compare-questions-value", current.questions.toLocaleString("en-PH"));
    setText("#compare-accuracy-value", formatPercent(current.accuracy, current.questions > 0));
    setText("#compare-sessions-value", current.attempts.toLocaleString("en-PH"));
    setText("#compare-days-value", current.activeDays.toLocaleString("en-PH"));
    setDelta("#compare-questions-delta", summary.comparison.questions);
    setDelta("#compare-accuracy-delta", summary.comparison.accuracyPoints, { unit: " pts", noBaseline: noPreviousAccuracy });
    setDelta("#compare-sessions-delta", summary.comparison.attempts);
    setDelta("#compare-days-delta", summary.comparison.activeDays);

    setText("#streak-ring-value", summary.currentStreak);
    setText("#streak-daily-goal", summary.streakDailyQuestionGoal);
    setText("#dash-longest-streak", `${summary.longestStreak} day${summary.longestStreak === 1 ? "" : "s"}`);
    setText("#dash-last-activity", summary.lastActivityDate ? displayDate(summary.lastActivityDate, { month: "short", day: "numeric", year: "numeric" }) : "No activity yet");
    setText("#streak-message", summary.currentStreak > 1
      ? `You have studied consistently for ${summary.currentStreak} days.`
      : summary.currentStreak === 1
        ? "Your streak started today. Keep it going tomorrow."
        : "Start your streak by reviewing today.");

    const ring = document.querySelector("#streak-ring");
    if (ring) ring.style.setProperty("--ring-value", `${Math.min(100, summary.currentStreak * 14)}%`);

    setText("#all-time-questions", summary.allTime.questions.toLocaleString("en-PH"));
    setText("#all-time-accuracy", formatPercent(summary.allTime.accuracy, summary.allTime.questions > 0));
    setText("#all-time-attempts", summary.allTime.attempts.toLocaleString("en-PH"));
    setText("#all-time-active-days", summary.allTime.activeDays.toLocaleString("en-PH"));
    setText("#all-time-study-time", formatDuration(summary.allTime.studySeconds));

    renderDailyActivity(summary.dailyActivity);
    renderSubjects(summary.subjects);
  }

  function renderDailyActivity(rows) {
    const container = document.querySelector("#daily-activity-chart");
    if (!container) return;
    const activity = Array.isArray(rows) ? rows : [];
    const maximum = Math.max(1, ...activity.map(row => number(row.questions)));
    const total = activity.reduce((sum, row) => sum + number(row.questions), 0);
    setText("#daily-total-label", `${total.toLocaleString("en-PH")} question${total === 1 ? "" : "s"}`);
    container.innerHTML = activity.map(row => {
      const questions = number(row.questions);
      const height = questions ? Math.max(10, Math.round((questions / maximum) * 100)) : 3;
      const day = displayDate(row.date, { weekday: "short" });
      const date = displayDate(row.date, { month: "short", day: "numeric" });
      return `<div class="daily-activity-column" title="${escapeHtml(date)}: ${questions} questions">
        <span class="daily-activity-value">${questions}</span>
        <div class="daily-activity-track"><i style="height:${height}%"></i></div>
        <b>${escapeHtml(day)}</b>
        <small>${escapeHtml(date)}</small>
      </div>`;
    }).join("");
  }

  function renderSubjects(rows) {
    const container = document.querySelector("#subject-performance");
    if (!container) return;
    const subjects = Array.isArray(rows) ? rows : [];
    container.innerHTML = subjects.map(row => {
      const hasCurrent = row.currentQuestions > 0;
      const hasPrevious = row.previousQuestions > 0;
      const accuracy = hasCurrent ? clamp(row.currentAccuracy, 0, 100) : 0;
      const delta = number(row.accuracyChange);
      let deltaText = "No previous-week comparison";
      let deltaClass = "neutral";
      if (hasCurrent && hasPrevious) {
        deltaText = delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "No accuracy change";
        deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
      } else if (!hasCurrent && row.totalQuestions > 0) {
        deltaText = `${formatPercent(row.totalAccuracy, true)} all-time accuracy`;
      } else if (hasCurrent) {
        deltaText = "First data for this comparison";
      }
      return `<article class="subject-progress-row">
        <div class="subject-progress-heading">
          <div><b>${escapeHtml(row.subject)}</b><small>${row.currentQuestions} question${row.currentQuestions === 1 ? "" : "s"} this week · ${row.totalQuestions} all time</small></div>
          <div class="subject-progress-score"><b>${formatPercent(row.currentAccuracy, hasCurrent)}</b><small class="progress-delta ${deltaClass}">${escapeHtml(deltaText)}</small></div>
        </div>
        <div class="performance-bar" aria-label="${escapeHtml(row.subject)} current-week accuracy ${hasCurrent ? accuracy : 0} percent"><i style="width:${accuracy}%"></i></div>
      </article>`;
    }).join("") || `<div class="empty-state">Complete a practice or mock set to see subject progress.</div>`;
  }

  function percentileOrdinal(value) {
    const n = Math.max(1, Math.min(99, Math.round(number(value))));
    const mod100 = n % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
    return `${n}${suffix}`;
  }

  function normalizePercentiles(payload) {
    if (!payload || typeof payload !== "object") return null;
    const comparison = row => ({
      id: String(row?.id || "comparison"), label: String(row?.label || "Comparison"), eligible: Boolean(row?.eligible),
      percentile: row?.percentile == null ? null : clamp(row.percentile, 1, 99), cohortSize: Math.max(0, Math.round(number(row?.cohortSize))),
      minimumCohortSize: Math.max(1, Math.round(number(row?.minimumCohortSize) || number(payload.minimumCohortSize) || 20)),
      minimumQuestions: Math.max(0, Math.round(number(row?.minimumQuestions))), currentQuestions: Math.max(0, Math.round(number(row?.currentQuestions))),
      questionsNeeded: Math.max(0, Math.round(number(row?.questionsNeeded))), valueLabel: String(row?.valueLabel || "No value yet"),
      description: String(row?.description || "")
    });
    return {
      trackLabel: String(payload.trackLabel || "Your preparation track"), minimumCohortSize: Math.max(1, Math.round(number(payload.minimumCohortSize) || 20)),
      cards: Array.isArray(payload.cards) ? payload.cards.map(comparison) : [],
      subjects: Array.isArray(payload.subjects) ? payload.subjects.map(row => ({
        subject: String(row?.subject || "Other"), questions: Math.max(0, Math.round(number(row?.questions))), accuracy: clamp(row?.accuracy, 0, 100),
        eligible: Boolean(row?.eligible), percentile: row?.percentile == null ? null : clamp(row.percentile, 1, 99), cohortSize: Math.max(0, Math.round(number(row?.cohortSize))),
        minimumCohortSize: Math.max(1, Math.round(number(row?.minimumCohortSize) || number(payload.minimumCohortSize) || 20)),
        minimumQuestions: Math.max(0, Math.round(number(row?.minimumQuestions))), questionsNeeded: Math.max(0, Math.round(number(row?.questionsNeeded)))
      })) : [], methodology: payload.methodology || {}, privacyNote: String(payload.privacyNote || "Anonymous aggregate values only are used.")
    };
  }

  function eligibilityText(row) {
    if (row.eligible && row.percentile != null) return `${row.cohortSize.toLocaleString("en-PH")} eligible learners in this comparison`;
    if (row.questionsNeeded > 0) return `Review ${row.questionsNeeded.toLocaleString("en-PH")} more question${row.questionsNeeded === 1 ? "" : "s"} to meet the activity minimum.`;
    const needed = Math.max(0, row.minimumCohortSize - row.cohortSize);
    return needed ? `Waiting for ${needed.toLocaleString("en-PH")} more eligible learner${needed === 1 ? "" : "s"}.` : "More eligible comparison data is needed.";
  }

  function percentileStatus(title, description, kind = "info") {
    const box = document.querySelector("#percentile-status"); if (!box) return;
    box.hidden = false; box.className = `percentile-status ${kind}`;
    box.innerHTML = `<span aria-hidden="true">${kind === "warning" ? "!" : kind === "locked" ? "🔒" : "◌"}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></div>`;
  }

  function clearPercentiles() {
    const cards = document.querySelector("#percentile-cards"); if (cards) cards.innerHTML = "";
    const subjects = document.querySelector("#subject-percentile-section"); if (subjects) subjects.hidden = true;
    const method = document.querySelector("#percentile-methodology"); if (method) method.hidden = true;
  }

  function renderPercentileLocked() {
    clearPercentiles(); setText("#percentile-track-label", "Account required");
    percentileStatus("Log in to unlock private comparisons", "Percentiles require synchronized account data and cannot be calculated from one browser alone.", "locked");
  }

  function renderPercentileUnavailable(title, description) {
    clearPercentiles(); setText("#percentile-track-label", "Comparison unavailable"); percentileStatus(title, description, "warning");
  }

  function renderPercentiles(payload) {
    const data = normalizePercentiles(payload); if (!data) return renderPercentileUnavailable("Comparison data could not be read", "Your weekly progress remains available above.");
    setText("#percentile-track-label", data.trackLabel);
    const status = document.querySelector("#percentile-status"); if (status) status.hidden = true;
    const cards = document.querySelector("#percentile-cards");
    if (cards) cards.innerHTML = data.cards.map(row => {
      const pct = row.eligible && row.percentile != null ? Math.round(row.percentile) : 0;
      const progress = row.minimumQuestions ? Math.min(100, Math.round(row.currentQuestions / row.minimumQuestions * 100)) : 0;
      const title = row.eligible ? `${percentileOrdinal(row.percentile)} percentile` : row.questionsNeeded ? `${progress}% eligible` : "Cohort building";
      return `<article class="percentile-card ${row.eligible ? "eligible" : "building"}">
        <div class="percentile-ring" style="--percentile-value:${pct}%;--eligibility-value:${progress}%"><span>${row.eligible ? percentileOrdinal(row.percentile) : `${progress}%`}</span><small>${row.eligible ? "percentile" : "eligibility"}</small></div>
        <div class="percentile-card-copy"><span class="percentile-card-label">${escapeHtml(row.label)}</span><b>${escapeHtml(title)}</b><p>${escapeHtml(row.valueLabel)}</p><small>${escapeHtml(eligibilityText(row))}</small></div>
        <p class="percentile-card-description">${escapeHtml(row.description)}</p></article>`;
    }).join("") || `<div class="empty-state">No comparison categories are available yet.</div>`;

    const section = document.querySelector("#subject-percentile-section"), list = document.querySelector("#subject-percentile-list");
    if (section) section.hidden = data.subjects.length === 0;
    if (list) list.innerHTML = data.subjects.map(row => {
      const pct = row.eligible && row.percentile != null ? Math.round(row.percentile) : 0;
      const progress = row.minimumQuestions ? Math.min(100, Math.round(row.questions / row.minimumQuestions * 100)) : 0;
      const result = row.eligible ? `${percentileOrdinal(row.percentile)} percentile` : eligibilityText({...row,currentQuestions:row.questions});
      return `<article class="subject-percentile-row ${row.eligible ? "eligible" : "building"}"><div class="subject-percentile-copy"><b>${escapeHtml(row.subject)}</b><small>${row.questions} questions · ${formatPercent(row.accuracy,row.questions>0)} accuracy</small></div><div class="subject-percentile-result"><b>${row.eligible ? percentileOrdinal(row.percentile) : `${progress}%`}</b><small>${row.eligible ? `of ${row.cohortSize} eligible learners` : escapeHtml(result)}</small></div><div class="subject-percentile-bar"><i style="width:${row.eligible ? pct : progress}%"></i></div></article>`;
    }).join("");

    const method = document.querySelector("#percentile-methodology");
    if (method) { method.hidden = false; method.innerHTML = `<b>How this comparison works</b><p>${escapeHtml(data.methodology.note || "Percentiles are private relative indicators.")} A result appears only after you meet its activity minimum and at least ${data.minimumCohortSize} learners qualify. ${escapeHtml(data.privacyNote)}</p>`; }
  }

  async function loadCloudPercentiles() {
    const client = window.TutoSupabase?.client; if (!client) throw new Error("Supabase client is unavailable.");
    const {data,error} = await client.rpc("get_my_student_percentiles"); if (error) throw error; return data;
  }

  const leaderboardState = { weekOffset: 0, subject: "All subjects", loaded: false };

  function normalizeLeaderboard(payload) {
    if (!payload || typeof payload !== "object") return null;
    const me = payload.me && typeof payload.me === "object" ? payload.me : {};
    return {
      weekOffset: Math.max(0, Math.min(1, Math.round(number(payload.weekOffset)))),
      weekStart: String(payload.weekStart || ""), weekEnd: String(payload.weekEnd || ""),
      track: String(payload.track || "general-academic"), trackLabel: String(payload.trackLabel || "Your preparation track"),
      subject: String(payload.subject || "All subjects"),
      subjectOptions: Array.isArray(payload.subjectOptions) && payload.subjectOptions.length ? payload.subjectOptions.map(String) : ["All subjects"],
      minimumQuestions: Math.max(1, Math.round(number(payload.minimumQuestions || 20))),
      minimumParticipants: Math.max(1, Math.round(number(payload.minimumParticipants || 3))),
      participantCount: Math.max(0, Math.round(number(payload.participantCount))),
      leaderboardVisible: Boolean(payload.leaderboardVisible),
      topTen: Array.isArray(payload.topTen) ? payload.topTen.map(row => ({
        rank: Math.max(1, Math.round(number(row?.rank))), displayName: String(row?.displayName || "Study Owl"),
        points: Math.max(0, Math.round(number(row?.points))), questions: Math.max(0, Math.round(number(row?.questions))),
        accuracy: clamp(row?.accuracy,0,100), activeDays: Math.max(0,Math.round(number(row?.activeDays))),
        attempts: Math.max(0,Math.round(number(row?.attempts))), isMe: Boolean(row?.isMe)
      })) : [],
      me: {
        optIn: Boolean(me.optIn), displayName: String(me.displayName || "Study Owl"), customName: String(me.customName || ""),
        eligible: Boolean(me.eligible), rank: me.rank == null ? null : Math.max(1,Math.round(number(me.rank))),
        points: Math.max(0,Math.round(number(me.points))), questions: Math.max(0,Math.round(number(me.questions))),
        rawQuestions: Math.max(0,Math.round(number(me.rawQuestions))), accuracy: clamp(me.accuracy,0,100),
        activeDays: Math.max(0,Math.round(number(me.activeDays))), attempts: Math.max(0,Math.round(number(me.attempts))),
        questionsNeeded: Math.max(0,Math.round(number(me.questionsNeeded)))
      },
      scoring: payload.scoring && typeof payload.scoring === "object" ? payload.scoring : {},
      privacyNote: String(payload.privacyNote || "Only opted-in learner aliases and weekly summaries are returned.")
    };
  }

  function leaderboardStatus(title, description, kind = "info") {
    const box = document.querySelector("#leaderboard-status"); if (!box) return;
    box.hidden = false; box.className = `leaderboard-status ${kind}`;
    box.innerHTML = `<span aria-hidden="true">${kind === "warning" ? "!" : kind === "locked" ? "🔒" : "◌"}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></div>`;
  }

  function renderLeaderboardLocked() {
    const content = document.querySelector("#leaderboard-content"); if (content) content.hidden = true;
    const method = document.querySelector("#leaderboard-methodology"); if (method) method.hidden = true;
    setText("#leaderboard-track-label", "Account required");
    leaderboardStatus("Log in to view or join weekly leaderboards", "Leaderboard participation is optional. Your local progress remains private and usable without joining.", "locked");
  }

  function renderLeaderboardUnavailable(title, description) {
    const content = document.querySelector("#leaderboard-content"); if (content) content.hidden = true;
    const method = document.querySelector("#leaderboard-methodology"); if (method) method.hidden = true;
    setText("#leaderboard-track-label", "Leaderboard unavailable");
    leaderboardStatus(title, description, "warning");
  }

  
  
  function leaderboardPlaceMeta(rank) {
    if (rank === 1) return { emoji: "🏆", crown: "👑", label: "Champion", short: "#1", tier: "Gold" };
    if (rank === 2) return { emoji: "🥈", crown: "", label: "Second place", short: "#2", tier: "Silver" };
    if (rank === 3) return { emoji: "🥉", crown: "", label: "Third place", short: "#3", tier: "Bronze" };
    return { emoji: "🎓", crown: "", label: `Rank #${rank}`, short: `#${rank}`, tier: "Ranked" };
  }

  function leaderboardInitials(name) {
    const safe = String(name || "Study Owl").trim().replace(/\s+/g, " ");
    const parts = safe.split(" ").filter(Boolean).slice(0, 2);
    const initials = parts.map(part => part.charAt(0).toUpperCase()).join("");
    return initials || "SO";
  }

  function renderLeaderboard(payload) {
    const data = normalizeLeaderboard(payload);
    if (!data) return renderLeaderboardUnavailable("Leaderboard data could not be loaded.", "Please try refreshing this page again.");

    leaderboardState.weekOffset = data.weekOffset;
    leaderboardState.subject = data.subject;
    leaderboardState.loaded = true;

    setText("#leaderboard-track-label", `${data.trackLabel} · ${data.subject}`);
    const status = document.querySelector("#leaderboard-status");
    if (status) status.hidden = true;
    const content = document.querySelector("#leaderboard-content");
    if (content) content.hidden = false;

    const weekSelect = document.querySelector("#leaderboard-week-select");
    if (weekSelect) weekSelect.value = String(data.weekOffset);

    const subjectSelect = document.querySelector("#leaderboard-subject-select");
    if (subjectSelect) {
      subjectSelect.innerHTML = data.subjectOptions.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
      if (![...subjectSelect.options].some(option => option.value === data.subject)) {
        subjectSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(data.subject)}">${escapeHtml(data.subject)}</option>`);
      }
      subjectSelect.value = data.subject;
    }

    const optIn = document.querySelector("#leaderboard-opt-in");
    if (optIn) optIn.checked = data.me.optIn;

    const nameInput = document.querySelector("#leaderboard-display-name");
    if (nameInput && document.activeElement !== nameInput) nameInput.value = data.me.customName;

    const range = data.weekStart && data.weekEnd
      ? displayDateRange(data.weekStart, data.weekEnd)
      : (data.weekOffset ? "Last week" : "This week");
    setText("#leaderboard-list-title", `${range} · ${data.subject}`);
    setText("#leaderboard-participant-count", `${data.participantCount.toLocaleString("en-PH")} eligible`);

    const myRank = document.querySelector("#leaderboard-my-rank");
    if (myRank) {
      let headline = "Leaderboard is off";
      let copy = `Turn on participation if you want the alias ${data.me.displayName} to be eligible for public ranking.`;

      if (data.me.optIn && !data.me.eligible) {
        headline = "Keep reviewing to qualify";
        copy = `${data.me.questionsNeeded.toLocaleString("en-PH")} more question${data.me.questionsNeeded === 1 ? "" : "s"} needed this week.`;
      } else if (data.me.optIn && data.me.eligible && data.me.rank) {
        headline = `You are ranked #${data.me.rank}`;
        copy = `${data.me.points.toLocaleString("en-PH")} points · ${data.me.questions.toLocaleString("en-PH")} counted questions · ${formatPercent(data.me.accuracy, data.me.questions > 0)} accuracy`;
      } else if (data.me.optIn && data.me.eligible && !data.leaderboardVisible) {
        headline = "You're eligible";
        copy = `${data.me.points.toLocaleString("en-PH")} points so far. Your public rank will appear once enough learners qualify.`;
      }

      myRank.innerHTML = `<span>${escapeHtml(data.me.displayName)}</span><b>${escapeHtml(headline)}</b><small>${escapeHtml(copy)}</small>`;
    }

    const podium = document.querySelector("#leaderboard-podium");
    if (podium) {
      if (data.leaderboardVisible && data.topTen.length) {
        podium.hidden = false;

        const podiumRows = data.topTen
          .filter(row => row.rank <= 3)
          .sort((a, b) => {
            const order = {2: 1, 1: 2, 3: 3};
            return (order[a.rank] || 99) - (order[b.rank] || 99);
          });

        podium.innerHTML = podiumRows.map(row => {
          const meta = leaderboardPlaceMeta(row.rank);
          const stars = row.rank === 1 ? "★★★" : row.rank === 2 ? "★★" : "★";
          return `<article class="leaderboard-podium-card place-${row.rank}${row.isMe ? ' is-me' : ''}">
            ${meta.crown ? `<div class="leaderboard-podium-crown" aria-hidden="true">${meta.crown}</div>` : ``}
            <div class="leaderboard-podium-rank">${escapeHtml(meta.short)}</div>
            <div class="leaderboard-podium-avatar">${escapeHtml(leaderboardInitials(row.displayName))}</div>
            <div class="leaderboard-podium-medal" aria-hidden="true">${meta.emoji}</div>
            <div class="leaderboard-podium-title">${escapeHtml(meta.label)}</div>
            <div class="leaderboard-podium-name">${escapeHtml(row.displayName)}${row.isMe ? ` <small>(You)</small>` : ``}</div>
            <div class="leaderboard-podium-stars" aria-hidden="true">${stars}</div>
            <div class="leaderboard-podium-score">
              <b>${row.points.toLocaleString("en-PH")}</b>
              <span>study points</span>
            </div>
            <div class="leaderboard-podium-meta">${row.questions.toLocaleString("en-PH")} questions · ${formatPercent(row.accuracy, row.questions > 0)} accuracy · ${row.activeDays} active day${row.activeDays === 1 ? "" : "s"}</div>
            <div class="leaderboard-podium-stage">
              <b>${escapeHtml(meta.tier)} podium</b>
              <small>${row.attempts} attempt${row.attempts === 1 ? "" : "s"} this week</small>
            </div>
          </article>`;
        }).join("");
      } else {
        podium.hidden = true;
        podium.innerHTML = "";
      }
    }

    const list = document.querySelector("#leaderboard-list");
    if (list) {
      if (!data.leaderboardVisible) {
        const needed = Math.max(0, data.minimumParticipants - data.participantCount);
        list.innerHTML = `<div class="leaderboard-cohort-building"><div><b>Public leaderboard is warming up</b><small>${needed > 0 ? `${needed} more eligible opted-in learner${needed === 1 ? "" : "s"} needed for the podium and rankings.` : "More eligible opt-in activity is needed."}</small></div></div>`;
      } else {
        list.innerHTML = data.topTen.map(row => {
          const meta = leaderboardPlaceMeta(row.rank);
          const badge = row.rank <= 3
            ? `<span class="leaderboard-rank-badge top-${row.rank}">${meta.emoji} ${escapeHtml(meta.short)}</span>`
            : `<span class="leaderboard-rank-badge">${escapeHtml(meta.short)}</span>`;
          return `<article class="leaderboard-row ${row.isMe ? 'is-me' : ''} ${row.rank <= 3 ? 'is-top-three' : ''}">
            <div class="leaderboard-rank">${badge}</div>
            <div class="leaderboard-learner">
              <b>${escapeHtml(row.displayName)}${row.isMe ? ` <small>(You)</small>` : ``}</b>
              <small>${row.questions.toLocaleString("en-PH")} questions · ${formatPercent(row.accuracy, row.questions > 0)} accuracy · ${row.activeDays} active day${row.activeDays === 1 ? "" : "s"}</small>
            </div>
            <div class="leaderboard-points">
              <b>${row.points.toLocaleString("en-PH")} pts</b>
              <small>${row.attempts} attempt${row.attempts === 1 ? "" : "s"}</small>
            </div>
          </article>`;
        }).join("") || `<div class="empty-state">No eligible learners yet.</div>`;
      }
    }

    const method = document.querySelector("#leaderboard-methodology");
    if (method) {
      method.hidden = false;
      const scoring = data.scoring || {};
      method.innerHTML = `<b>How weekly study points work</b><p>${escapeHtml(scoring.description || "Points reward capped review activity, consistency, and a small accuracy bonus.")} Up to ${Math.max(1, Math.round(number(scoring.dailyQuestionCap || 75))).toLocaleString("en-PH")} questions per day and ${Math.max(1, Math.round(number(scoring.weeklyQuestionCap || 350))).toLocaleString("en-PH")} per week count toward points. A consistency day needs at least ${Math.max(1, Math.round(number(scoring.consistencyDayMinimum || 10))).toLocaleString("en-PH")} questions. ${escapeHtml(data.privacyNote)}</p>`;
    }
  }


  async function loadCloudLeaderboard() {
    const client = window.TutoSupabase?.client; if (!client) throw new Error("Supabase client is unavailable.");
    const {data,error} = await client.rpc("get_weekly_learning_leaderboard", { p_week_offset: leaderboardState.weekOffset, p_subject: leaderboardState.subject });
    if (error) throw error; return data;
  }

  async function refreshLeaderboard() {
    leaderboardStatus("Refreshing weekly leaderboard…", "Only privacy-safe summary rows are requested.", "info");
    try { renderLeaderboard(await loadCloudLeaderboard()); }
    catch (error) {
      console.error("Weekly leaderboard could not be loaded:", error);
      const missing = /get_weekly_learning_leaderboard|learner_weekly_leaderboard_snapshots|does not exist|schema cache|could not find the function/i.test(String(error?.message || error || ""));
      renderLeaderboardUnavailable(missing ? "Phase 4C database setup is not installed yet" : "Weekly leaderboard could not be refreshed", missing ? "Run the private Phase 4C SQL in Supabase. Phase 4A progress and Phase 4B percentiles remain usable." : "The leaderboard service is temporarily unavailable. No private learner records were exposed.");
    }
  }

  function setupLeaderboardControls(account) {
    const week = document.querySelector("#leaderboard-week-select");
    const subject = document.querySelector("#leaderboard-subject-select");
    const save = document.querySelector("#save-leaderboard-preferences");
    week?.addEventListener("change", async () => { leaderboardState.weekOffset = Number(week.value) === 1 ? 1 : 0; await refreshLeaderboard(); });
    subject?.addEventListener("change", async () => { leaderboardState.subject = subject.value || "All subjects"; await refreshLeaderboard(); });
    save?.addEventListener("click", async () => {
      if (!account?.configured || !account?.user) return renderLeaderboardLocked();
      const optIn = Boolean(document.querySelector("#leaderboard-opt-in")?.checked);
      const displayName = String(document.querySelector("#leaderboard-display-name")?.value || "").trim();
      save.disabled = true; save.textContent = "Saving…";
      try {
        const client = window.TutoSupabase?.client; if (!client) throw new Error("Supabase client is unavailable.");
        const {error} = await client.rpc("set_my_leaderboard_preferences", { p_opt_in: optIn, p_display_name: displayName });
        if (error) throw error;
        window.Tuto.toast(optIn ? "Leaderboard settings saved." : "Leaderboard participation turned off.");
        await refreshLeaderboard();
      } catch (error) {
        console.error(error);
        window.Tuto.toast(error?.message || "Leaderboard settings could not be saved.");
      } finally { save.disabled = false; save.textContent = "Save leaderboard settings"; }
    });
  }

  function renderHistory() {
    const historyBox = document.querySelector("#attempt-history");
    if (!historyBox) return;
    const items = window.Tuto.storage.get("tutodemyHistory", []);
    historyBox.innerHTML = items.length ? items.slice(0, 12).map(item => {
      const total = attemptQuestionCount(item);
      const correct = attemptCorrectCount(item, total);
      const accuracy = total ? Math.round((correct / total) * 100) : 0;
      const completed = item.completedAt || item.completed_at;
      return `<div class="history-item">
        <div><b>${escapeHtml(item.category || "Practice set")}</b><small>${escapeHtml(item.modeLabel || item.mode || "Review")} · ${total} items · ${completed ? new Date(completed).toLocaleString("en-PH") : "Date unavailable"}</small></div>
        <span>${correct}/${total}</span>
        <span>${accuracy}%</span>
        <a href="practice.html">New set</a>
      </div>`;
    }).join("") : `<div class="empty-state">No completed attempts yet.</div>`;
  }

  function renderSavedReviewers() {
    const saved = window.Tuto.getSavedReviewers();
    const catalog = Array.isArray(window.TUTODEMY_REVIEWERS) ? window.TUTODEMY_REVIEWERS : [];
    const savedItems = catalog.filter(reviewer => saved.includes(reviewer.id));
    const container = document.querySelector("#saved-reviewers");
    if (!container) return;
    container.innerHTML = savedItems.length ? savedItems.slice(0, 6).map(reviewer => `<a href="reviewer.html?id=${encodeURIComponent(reviewer.id)}">
      <span>${escapeHtml(reviewer.domain || "R")}</span>
      <div><b>${escapeHtml(reviewer.title)}</b><small>${escapeHtml(reviewer.category)}</small></div>
    </a>`).join("") : `<div class="empty-state">No saved reviewers yet.</div>`;
  }

  function renderAccountState() {
    const accountTitle = document.querySelector("#dashboard-account-title");
    const accountDescription = document.querySelector("#dashboard-account-description");
    const accountLink = document.querySelector("#dashboard-account-link");
    const configured = window.TutoAuth?.isConfigured?.();
    const user = window.TutoAuth?.getUser?.();

    if (!configured) {
      accountTitle.textContent = "Account sync is temporarily unavailable";
      accountDescription.textContent = "Your learning summary is calculated from progress stored on this device.";
      accountLink.href = "auth.html";
      accountLink.textContent = "Account";
    } else if (user) {
      accountTitle.textContent = "This progress summary is private to your account";
      accountDescription.textContent = window.TutoCloud?.getStatus?.().lastError
        ? "A local copy is available, but cloud synchronization needs attention."
        : "Completed attempts synchronize with your account and are summarized securely in Supabase.";
      accountLink.href = "profile.html";
      accountLink.textContent = "My profile";
    } else {
      accountTitle.textContent = "Log in to keep this progress across devices";
      accountDescription.textContent = "The summary below uses only progress stored in this browser until you connect an account.";
      accountLink.href = "auth.html";
      accountLink.textContent = "Log in";
    }
    return { configured, user };
  }

  function showSourceNote(message, kind = "info") {
    const note = document.querySelector("#progress-source-note");
    if (!note) return;
    note.hidden = !message;
    note.className = `progress-source-note ${kind}`;
    note.textContent = message || "";
  }

  async function loadCloudSummary() {
    const client = window.TutoSupabase?.client;
    if (!client) throw new Error("Supabase client is unavailable.");
    const { data, error } = await client.rpc("get_my_student_progress_summary");
    if (error) throw error;
    return data;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await window.TutoCloud?.ready;

    const account = renderAccountState();
    const history = window.Tuto.storage.get("tutodemyHistory", []);
    const localSummary = buildLocalSummary(history);
    let summary = localSummary;
    const percentilePromise = account.configured && account.user ? loadCloudPercentiles() : null;

    if (account.configured && account.user) {
      try {
        summary = normalizeSummary(await loadCloudSummary(), localSummary);
        showSourceNote("");
      } catch (error) {
        console.error("Student progress summary could not be loaded:", error);
        const missingFunction = /get_my_student_progress_summary|does not exist|schema cache/i.test(String(error?.message || error));
        showSourceNote(
          missingFunction
            ? "Phase 4A database setup has not been installed yet. Showing synchronized progress available on this device."
            : "The cloud summary could not be refreshed. Showing the latest progress available on this device.",
          "warning"
        );
      }
    } else if (!account.user) {
      showSourceNote("Device-only summary: log in to synchronize completed attempts and use this progress on another device.", "info");
    }

    renderSummary(summary);
    renderHistory();
    renderSavedReviewers();

    if (!percentilePromise) renderPercentileLocked();
    else try { renderPercentiles(await percentilePromise); }
    catch (error) {
      console.error("Student percentiles could not be loaded:", error);
      const missing = /get_my_student_percentiles|learner_comparison_snapshots|does not exist|schema cache|could not find the function/i.test(String(error?.message || error || ""));
      renderPercentileUnavailable(missing ? "Phase 4B database setup is not installed yet" : "Private comparisons could not be refreshed", missing ? "Run the private Phase 4B SQL in Supabase. The Phase 4A progress summary remains usable." : "The comparison service is temporarily unavailable. No other learner data was exposed.");
    }

    setupLeaderboardControls(account);
    if (account.configured && account.user) await refreshLeaderboard();
    else renderLeaderboardLocked();

    document.querySelector("#clear-history")?.addEventListener("click", async () => {
      if (!confirm("Clear all attempt history from this browser and, when logged in, from the learner account?")) return;
      window.Tuto.storage.remove("tutodemyHistory");
      try {
        await window.TutoCloud?.clearAttemptHistory?.();
      } catch (error) {
        console.error(error);
        window.Tuto.toast("Local history cleared, but cloud deletion needs attention.");
      }
      location.reload();
    });
  });
})();
