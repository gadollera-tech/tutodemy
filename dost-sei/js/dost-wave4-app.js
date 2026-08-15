
(() => {
"use strict";

const QUESTIONS = window.DOST_CUMULATIVE_QUESTIONS || [];
const STIMULI = window.DOST_CUMULATIVE_STIMULI || {};
const SESSION_KEY = "tutodemy_dost_wave4_active_session";
const HISTORY_KEY = "tutodemy_dost_wave4_history";
const LETTERS = ["A","B","C","D"];
const $ = selector => document.querySelector(selector);
const byId = new Map(QUESTIONS.map(q => [q.id, q]));

let state = null;
let timerHandle = null;

const MOCK_SPECS = [
  {name:"Verbal Reasoning", minutes:20, quotas:{"Verbal Reasoning":20}},
  {name:"Non-Verbal Reasoning", minutes:35, quotas:{"Non-Verbal Reasoning":30}},
  {name:"English", minutes:35, quotas:{"English":30}},
  {name:"Science", minutes:60, quotas:{"Biology":12,"Chemistry":11,"Physics":12,"Earth Science":10}},
  {name:"Mathematics", minutes:60, quotas:{"Mathematics":45}},
  {name:"Mechanical-Technical", minutes:30, quotas:{"Mechanical-Technical":30}}
];

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}

function subjectOf(q){ return q.subsubject || q.section; }

function waveOf(q){
  if(q.wave) return Number(q.wave);
  if(String(q.id).includes("W4")) return 4;
  if(String(q.id).includes("W3")) return 3;
  if(String(q.id).includes("W2")) return 2;
  return 1;
}

function getSelectedBank(){
  return $("#bank").value === "wave4"
    ? QUESTIONS.filter(q => waveOf(q) === 4)
    : QUESTIONS;
}

function hashSeed(text){
  let h = 2166136261 >>> 0;
  for(let i=0;i<text.length;i++){
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFactory(seed){
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng){
  const copy = [...array];
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(rng() * (i+1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function saveState(){
  if(state) localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function loadState(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

function formatTime(seconds){
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h
    ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function currentItem(){ return state.items[state.current]; }
function currentQuestion(){ return byId.get(currentItem().qid); }

function choiceDisplayLetter(item, originalChoiceId){
  return String.fromCharCode(65 + item.choiceOrder.indexOf(originalChoiceId));
}

function buildItems(selected, rng){
  return selected.map(q => ({
    qid: q.id,
    choiceOrder: q.fixed_choice_order
      ? q.choices.map(c => c.id)
      : shuffle(q.choices.map(c => c.id), rng)
  }));
}

function ensureVisualZoom(){
  let dialog = document.querySelector("#dostVisualZoom");
  if(dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "dostVisualZoom";
  dialog.className = "dost-vr-modal";
  dialog.innerHTML = `
    <div class="dost-vr-modal-head">
      <b>Visual reasoning figure</b>
      <button type="button" class="dost-vr-modal-close" aria-label="Close enlarged figure">×</button>
    </div>
    <div class="dost-vr-modal-stage"><img alt="Enlarged visual reasoning figure"></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector(".dost-vr-modal-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if(event.target === dialog) dialog.close();
  });
  return dialog;
}

function bindVisualZoom(){
  document.querySelectorAll(".dost-vr-zoom-trigger").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      const dialog = ensureVisualZoom();
      const image = dialog.querySelector("img");
      image.src = button.dataset.src || button.querySelector("img")?.src || "";
      if(typeof dialog.showModal === "function") dialog.showModal();
      else window.open(image.src, "_blank", "noopener");
    });
  });
}

function balancedDraw(pool, count, rng){
  const buckets = {};
  pool.forEach(q => {
    const key = subjectOf(q);
    (buckets[key] ??= []).push(q);
  });
  Object.keys(buckets).forEach(key => buckets[key] = shuffle(buckets[key], rng));
  const keys = shuffle(Object.keys(buckets), rng);
  const selected = [];
  while(selected.length < count){
    let added = false;
    for(const key of keys){
      if(selected.length >= count) break;
      if(buckets[key]?.length){
        selected.push(buckets[key].pop());
        added = true;
      }
    }
    if(!added) break;
  }
  return selected;
}

function availablePool(){
  const selectedBank = getSelectedBank();
  const subject = $("#subject").value;
  const difficulty = $("#difficulty").value;
  const access = "All";
  return selectedBank.filter(q =>
    (subject === "All" || subjectOf(q) === subject) &&
    (difficulty === "All" || q.difficulty === difficulty) &&
    (access === "All" || q.access === access)
  );
}

function updateAvailability(){
  const mode = $("#mode").value;
  const bankCount = getSelectedBank().length;
  if(mode === "mock"){
    $("#availability").innerHTML = `<b>Strict Mock:</b> 200 unique questions in six separately timed sections. The selected bank must contain every required quota.`;
  }else{
    const pool = availablePool();
    $("#availability").innerHTML = `<b>${pool.length} questions available</b> for the selected filters from a ${bankCount}-question bank. New attempts use a different seeded selection.`;
  }
}

function toggleBuilderFields(){
  const mock = $("#mode").value === "mock";
  ["subject","count","customCount","difficulty","minutes"].forEach(id => {
    $("#" + id).disabled = mock;
  });
  updateAvailability();
}

function createMock(bank, rng){
  const selected = [];
  const sections = [];
  for(const spec of MOCK_SPECS){
    const start = selected.length;
    for(const [subject, count] of Object.entries(spec.quotas)){
      const pool = shuffle(bank.filter(q => subjectOf(q) === subject), rng);
      if(pool.length < count){
        throw new Error(`The selected bank has only ${pool.length} ${subject} items, but the strict mock needs ${count}.`);
      }
      selected.push(...pool.slice(0, count));
    }
    const sectionItems = shuffle(selected.slice(start), rng);
    selected.splice(start, sectionItems.length, ...sectionItems);
    sections.push({
      name: spec.name,
      start,
      end: selected.length - 1,
      seconds: spec.minutes * 60,
      remaining: spec.minutes * 60,
      submitted: false
    });
  }
  return {selected, sections};
}

function startNewAttempt(){
  const mode = $("#mode").value;
  const bank = getSelectedBank();
  const seed = hashSeed(`${Date.now()}-${Math.random()}-${$("#bank").value}`);
  const rng = rngFactory(seed);

  let selected = [];
  let sections = [];

  try{
    if(mode === "mock"){
      const mock = createMock(bank, rng);
      selected = mock.selected;
      sections = mock.sections;
    }else{
      const count = $("#count").value === "custom"
        ? Math.max(5, Number($("#customCount").value) || 20)
        : Number($("#count").value);
      const pool = availablePool();
      if(!pool.length){
        alert("No questions match the current filters.");
        return;
      }
      const actual = Math.min(count, pool.length);
      selected = $("#subject").value === "All"
        ? balancedDraw(pool, actual, rng)
        : shuffle(pool, rng).slice(0, actual);
    }
  }catch(error){
    alert(error.message);
    return;
  }

  state = {
    version: 4,
    bank: $("#bank").value,
    mode,
    seed,
    items: buildItems(selected, rng),
    current: 0,
    answers: {},
    flags: {},
    feedbackShown: {},
    startedAt: Date.now(),
    secondsRemaining: mode === "timed"
      ? Math.max(60, Number($("#minutes").value || 30) * 60)
      : null,
    sections,
    currentSection: 0,
    completed: false
  };

  saveState();
  showExam();
  startTimer();
}

function activeBounds(){
  if(state.mode !== "mock") return [0, state.items.length - 1];
  const section = state.sections[state.currentSection];
  return [section.start, section.end];
}

function showExam(){
  $("#builder").classList.add("hidden");
  $("#results").classList.add("hidden");
  $("#exam").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion(){
  if(!state || state.completed) return;

  const item = currentItem();
  const q = currentQuestion();
  const [start, end] = activeBounds();

  $("#examMode").textContent =
    state.mode === "practice" ? "Practice Mode" :
    state.mode === "timed" ? "Timed Practice" :
    "Strict Mock";

  $("#examTitle").textContent = state.mode === "mock"
    ? `Section ${state.currentSection + 1}: ${state.sections[state.currentSection].name}`
    : `${state.items.length}-Item ${state.bank === "wave4" ? "Wave 4" : "Cumulative"} Set`;

  $("#lockNote").textContent = state.mode === "mock"
    ? "After submitting this section, you cannot return to it."
    : "";

  $("#qmeta").innerHTML = [
    q.id,
    `Wave ${waveOf(q)}`,
    subjectOf(q),
    q.domain,
    q.difficulty
  ].map(value => `<span>${esc(value)}</span>`).join("");

  $("#qstem").textContent = q.stem;

  const stimulus = q.stimulus_id ? STIMULI[q.stimulus_id] : null;
  if(stimulus){
    $("#stimulus").classList.remove("hidden");
    $("#stimulus").innerHTML = stimulus.html
      ? stimulus.html
      : `<h4>${esc(stimulus.title || "")}</h4><p>${esc(stimulus.content || "")}</p>`;
  }else{
    $("#stimulus").classList.add("hidden");
    $("#stimulus").innerHTML = "";
  }
  bindVisualZoom();

  const choiceMap = Object.fromEntries(q.choices.map(c => [c.id, c]));
  const selected = state.answers[q.id];

  $("#answers").innerHTML = item.choiceOrder.map((choiceId, index) => {
    const choice = choiceMap[choiceId];
    const body = choice.html
      ? `<span class="visual-choice">${choice.html}</span>`
      : esc(choice.text);
    return `<label class="answer ${selected === choiceId ? "selected" : ""}" data-choice="${choiceId}">
      <input type="radio" name="answer" value="${choiceId}" ${selected === choiceId ? "checked" : ""}>
      <span class="letter">${String.fromCharCode(65 + index)}</span>
      <span>${body}</span>
    </label>`;
  }).join("");

  document.querySelectorAll(".answer").forEach(label => {
    label.addEventListener("click", () => selectAnswer(label.dataset.choice));
  });

  renderFeedback();
  renderNavigator();
  renderButtons();
  renderTimer();

  $("#prevBtn").disabled = state.current <= start;
  $("#nextBtn").disabled = state.current >= end;
}

function selectAnswer(choiceId){
  const q = currentQuestion();
  if(state.mode === "practice" && state.feedbackShown[q.id]) return;
  state.answers[q.id] = choiceId;
  if(state.mode === "practice") state.feedbackShown[q.id] = true;
  saveState();
  renderQuestion();
}

function renderFeedback(){
  const box = $("#feedback");
  const q = currentQuestion();
  const item = currentItem();
  const chosen = state.answers[q.id];

  if(state.mode !== "practice" || !chosen || !state.feedbackShown[q.id]){
    box.classList.add("hidden");
    return;
  }

  const correct = chosen === q.correct_choice;
  const correctDisplay = choiceDisplayLetter(item, q.correct_choice);
  const steps = q.solution_steps?.length
    ? `<ol>${q.solution_steps.map(step => `<li>${esc(step)}</li>`).join("")}</ol>`
    : "";

  box.className = `feedback ${correct ? "correct" : "incorrect"}`;
  box.innerHTML = `
    <b>${correct ? "Correct." : `Not quite. Correct answer: ${correctDisplay}.`}</b>
    ${steps}
    <p>${esc(q.rationale)}</p>
    ${q.high_yield_takeaway ? `<small><b>Takeaway:</b> ${esc(q.high_yield_takeaway)}</small>` : ""}
  `;
}

function renderNavigator(){
  const [start, end] = activeBounds();
  const nav = $("#navigator");
  nav.innerHTML = "";

  for(let index=start; index<=end; index++){
    const item = state.items[index];
    const q = byId.get(item.qid);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "navbtn";
    if(index === state.current) button.classList.add("current");
    if(state.answers[q.id]) button.classList.add("answered");
    if(state.flags[q.id]) button.classList.add("flagged");
    button.textContent = String(index - start + 1);
    button.addEventListener("click", () => {
      state.current = index;
      saveState();
      renderQuestion();
    });
    nav.appendChild(button);
  }

  const sectionItems = state.items.slice(start, end + 1);
  const answered = sectionItems.filter(item => state.answers[item.qid]).length;
  const total = sectionItems.length;
  $("#progressFill").style.width = `${total ? answered / total * 100 : 0}%`;
  $("#progressText").textContent = `${answered} of ${total} answered in this section`;

  const pills = [];
  if(state.mode === "mock"){
    pills.push(`<span class="pill">Section ${state.currentSection + 1}/${state.sections.length}</span>`);
  }
  pills.push(`<span class="pill">${Object.keys(state.answers).length}/${state.items.length} total answered</span>`);
  $("#sectionStatus").innerHTML = pills.join("");
}

function renderButtons(){
  const [start, end] = activeBounds();
  $("#prevBtn").disabled = state.current <= start;
  $("#nextBtn").disabled = state.current >= end;
  $("#flagBtn").textContent = state.flags[currentQuestion().id] ? "Unflag" : "Flag";
  $("#submitSectionBtn").classList.toggle("hidden", state.mode !== "mock");
  $("#submitBtn").classList.toggle("hidden", state.mode === "mock");
}

function move(delta){
  const [start, end] = activeBounds();
  state.current = Math.max(start, Math.min(end, state.current + delta));
  saveState();
  renderQuestion();
}

function toggleFlag(){
  const id = currentQuestion().id;
  state.flags[id] = !state.flags[id];
  saveState();
  renderQuestion();
}

function renderTimer(){
  const timer = $("#timer");
  if(state.mode === "practice"){
    timer.textContent = "Untimed";
    timer.className = "timer";
    return;
  }

  const remaining = state.mode === "mock"
    ? state.sections[state.currentSection].remaining
    : state.secondsRemaining;

  timer.textContent = formatTime(remaining);
  timer.className = "timer";
  if(remaining <= 300) timer.classList.add("warn");
  if(remaining <= 60) timer.classList.add("urgent");
}

function startTimer(){
  clearInterval(timerHandle);
  if(!state || state.mode === "practice" || state.completed) return;

  timerHandle = setInterval(() => {
    if(state.mode === "mock"){
      const section = state.sections[state.currentSection];
      section.remaining = Math.max(0, section.remaining - 1);
      if(section.remaining === 0){
        saveState();
        submitSection(true);
        return;
      }
    }else{
      state.secondsRemaining = Math.max(0, state.secondsRemaining - 1);
      if(state.secondsRemaining === 0){
        saveState();
        finishAttempt(true);
        return;
      }
    }
    saveState();
    renderTimer();
  }, 1000);
}

function submitSection(auto=false){
  if(state.mode !== "mock") return;
  const section = state.sections[state.currentSection];
  const answered = state.items
    .slice(section.start, section.end + 1)
    .filter(item => state.answers[item.qid]).length;

  if(!auto && !confirm(
    `Submit ${section.name}? ${answered} of ${section.end - section.start + 1} answered. You cannot return to this section.`
  )) return;

  section.submitted = true;

  if(state.currentSection === state.sections.length - 1){
    finishAttempt(auto);
    return;
  }

  state.currentSection += 1;
  state.current = state.sections[state.currentSection].start;
  saveState();
  renderQuestion();
  startTimer();
}

function finishAttempt(auto=false){
  if(!state || state.completed) return;
  if(!auto && state.mode !== "mock" && !confirm("Submit this attempt now?")) return;

  clearInterval(timerHandle);
  state.completed = true;
  state.completedAt = Date.now();

  const details = state.items.map(item => {
    const q = byId.get(item.qid);
    const chosen = state.answers[q.id] || null;
    return {
      qid: q.id,
      subject: subjectOf(q),
      domain: q.domain,
      wave: waveOf(q),
      chosen,
      correct: chosen === q.correct_choice
    };
  });

  state.details = details;
  state.score = details.filter(detail => detail.correct).length;
  state.elapsedSeconds = Math.max(0, Math.floor((state.completedAt - state.startedAt) / 1000));

  saveHistory();
  saveState();
  showResults();
}

function saveHistory(){
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift({
    date: new Date().toISOString(),
    bank: state.bank,
    mode: state.mode,
    items: state.items.length,
    score: state.score,
    percent: Math.round(state.score / state.items.length * 100)
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
}

function showResults(){
  $("#exam").classList.add("hidden");
  $("#builder").classList.add("hidden");
  const results = $("#results");
  results.classList.remove("hidden");

  const details = state.details || [];
  const accuracy = Math.round(state.score / state.items.length * 100);
  const unanswered = details.filter(detail => !detail.chosen).length;

  const breakdown = {};
  details.forEach(detail => {
    breakdown[detail.subject] ??= {correct:0,total:0};
    breakdown[detail.subject].total += 1;
    if(detail.correct) breakdown[detail.subject].correct += 1;
  });

  const rows = Object.entries(breakdown)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([subject, values]) => `
      <tr><td>${esc(subject)}</td><td>${values.correct}/${values.total}</td><td>${Math.round(values.correct / values.total * 100)}%</td></tr>
    `).join("");

  results.innerHTML = `
    <div class="eyebrow">Attempt complete</div>
    <h3>Results</h3>
    <div class="scoregrid">
      <div class="scorebox"><b>${state.score}/${state.items.length}</b><span>correct</span></div>
      <div class="scorebox"><b>${accuracy}%</b><span>accuracy</span></div>
      <div class="scorebox"><b>${unanswered}</b><span>unanswered</span></div>
      <div class="scorebox"><b>${formatTime(state.elapsedSeconds)}</b><span>elapsed time</span></div>
    </div>
    <table class="breakdown"><thead><tr><th>Section</th><th>Score</th><th>Accuracy</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="buttons">
      <button class="btn" id="reviewBtn">Review Answers</button>
      <button class="btn secondary" id="retryBtn">Retry Incorrect</button>
      <button class="btn gold" id="newBtn">Build New Attempt</button>
    </div>
    <div id="reviewList"></div>
  `;

  $("#reviewBtn").addEventListener("click", renderReview);
  $("#retryBtn").addEventListener("click", retryIncorrect);
  $("#newBtn").addEventListener("click", resetToBuilder);
  renderHistory();
}

function renderReview(){
  const list = $("#reviewList");
  list.innerHTML = state.items.map(item => {
    const q = byId.get(item.qid);
    const chosen = state.answers[q.id] || null;
    const correct = chosen === q.correct_choice;
    const choiceMap = Object.fromEntries(q.choices.map(c => [c.id, c]));

    const choices = item.choiceOrder.map((choiceId, index) => {
      const choice = choiceMap[choiceId];
      const body = choice.html ? choice.html : esc(choice.text);
      return `<div class="review-answer ${chosen === choiceId ? "chosen" : ""} ${q.correct_choice === choiceId ? "right" : ""}">
        <b>${String.fromCharCode(65 + index)}.</b> ${body}
      </div>`;
    }).join("");

    return `<article class="review-item ${correct ? "correct" : "incorrect"}">
      <div class="qmeta"><span>${esc(q.id)}</span><span>Wave ${waveOf(q)}</span><span>${esc(subjectOf(q))}</span></div>
      <p><b>${esc(q.stem)}</b></p>
      ${choices}
      <p><b>${correct ? "Correct." : `Correct answer: ${choiceDisplayLetter(item, q.correct_choice)}.`}</b> ${esc(q.rationale)}</p>
      ${q.high_yield_takeaway ? `<small><b>Takeaway:</b> ${esc(q.high_yield_takeaway)}</small>` : ""}
    </article>`;
  }).join("");
}

function retryIncorrect(){
  const incorrectIds = (state.details || [])
    .filter(detail => !detail.correct)
    .map(detail => detail.qid);

  if(!incorrectIds.length){
    alert("No incorrect questions to retry.");
    return;
  }

  const seed = hashSeed(`${Date.now()}-retry`);
  const rng = rngFactory(seed);

  state = {
    version:2,
    bank:state.bank,
    mode:"practice",
    seed,
    items:buildItems(incorrectIds.map(id => byId.get(id)), rng),
    current:0,
    answers:{},
    flags:{},
    feedbackShown:{},
    startedAt:Date.now(),
    secondsRemaining:null,
    sections:[],
    currentSection:0,
    completed:false
  };

  saveState();
  showExam();
}

function resetToBuilder(){
  clearInterval(timerHandle);
  localStorage.removeItem(SESSION_KEY);
  state = null;
  $("#results").classList.add("hidden");
  $("#exam").classList.add("hidden");
  $("#builder").classList.remove("hidden");
  updateAvailability();
  window.scrollTo({top:0, behavior:"smooth"});
}

function resumeAttempt(){
  const saved = loadState();
  if(!saved){
    alert("No saved attempt found.");
    return;
  }
  state = saved;
  if(state.completed) showResults();
  else{
    showExam();
    startTimer();
  }
}

function renderHistory(){
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  $("#history").innerHTML = history.length
    ? history.map(item => `
      <div class="history-row">
        <b>${new Date(item.date).toLocaleString()}</b>
        <span>${item.bank === "wave4" ? "Wave 4" : "Cumulative"}</span>
        <span>${esc(item.mode)}</span>
        <span>${item.score}/${item.items}</span>
        <span>${item.percent}%</span>
      </div>
    `).join("")
    : "<p>No attempts yet.</p>";
}

$("#startBtn").addEventListener("click", startNewAttempt);
$("#resumeBtn").addEventListener("click", resumeAttempt);
$("#clearBtn").addEventListener("click", () => {
  if(confirm("Clear the saved active attempt?")){
    localStorage.removeItem(SESSION_KEY);
    state = null;
    alert("Saved attempt cleared.");
  }
});
$("#prevBtn").addEventListener("click", () => move(-1));
$("#nextBtn").addEventListener("click", () => move(1));
$("#flagBtn").addEventListener("click", toggleFlag);
$("#submitBtn").addEventListener("click", () => finishAttempt(false));
$("#submitSectionBtn").addEventListener("click", () => submitSection(false));

["bank","subject","difficulty"].forEach(id => {
  $("#" + id).addEventListener("change", updateAvailability);
});
$("#mode").addEventListener("change", toggleBuilderFields);
$("#count").addEventListener("change", updateAvailability);
$("#customCount").addEventListener("input", updateAvailability);

toggleBuilderFields();
renderHistory();
if(loadState()) $("#resumeBtn").textContent = "Resume Saved Attempt";
})();
