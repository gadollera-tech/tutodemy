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
    if (ring) ring.style.setProperty("--streak-progress", `${Math.min(100, summary.currentStreak * 14)}%`);

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
