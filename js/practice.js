
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const bank=window.TUTODEMY_BANK;
  const questions=bank.questions;
  const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
  const passages=Object.fromEntries((bank.passages||[]).map(p=>[p.id,p]));
  const categories=["Mathematics","Language & Reading","Science","Reasoning"];
  const modeLabels={practice:"Practice Mode",timed:"Timed Practice",mock:"Mock Exam"};

  const builderView=document.querySelector("#builder-view");
  const examView=document.querySelector("#exam-view");
  const resultsView=document.querySelector("#results-view");
  const form=document.querySelector("#builder-form");
  const categoryEl=document.querySelector("#build-category");
  const domainEl=document.querySelector("#build-domain");
  const modeEl=document.querySelector("#build-mode");
  const countEl=document.querySelector("#build-count");
  const customLabel=document.querySelector("#custom-count-label");
  const customCount=document.querySelector("#build-custom-count");
  const difficultyEl=document.querySelector("#build-difficulty");
  const timeEl=document.querySelector("#build-time");
  const shuffleEl=document.querySelector("#shuffle-choices");
  const availability=document.querySelector("#availability-note");
  const resumeCard=document.querySelector("#resume-card");

  let session=null;
  let timerId=null;
  let lastTimerSave=0;
  let lastResult=null;

  categoryEl.innerHTML=`<option value="Mixed">Mixed — all four banks</option>`+categories.map(c=>`<option value="${c}">${c}</option>`).join("");

  const params=new URLSearchParams(location.search);
  const requestedCategory=params.get("category");
  if(requestedCategory&&[...categories,"Mixed"].includes(requestedCategory)) categoryEl.value=requestedCategory;

  function updateDomains(){
    const category=categoryEl.value;
    domainEl.innerHTML=`<option value="all">All domains</option>`;
    if(category!=="Mixed"){
      (window.TUTODEMY_TAXONOMY[category]||[]).forEach(d=>domainEl.insertAdjacentHTML("beforeend",`<option value="${d.id}">${d.id} — ${d.title}</option>`));
    }
    const requestedDomain=params.get("domain");
    if(requestedDomain&&[...domainEl.options].some(o=>o.value===requestedDomain)) domainEl.value=requestedDomain;
    updateAvailability();
  }

  function requestedCount(){
    return countEl.value==="custom"?Math.max(1,Math.min(220,Number(customCount.value)||20)):Number(countEl.value);
  }

  function poolFor(config, ignorePlan=false){
    const plan=window.Tuto.getPlan();
    return questions.filter(q=>{
      const categoryMatch=config.category==="Mixed"||q.category===config.category;
      const domainMatch=config.category==="Mixed"||config.domain==="all"||q.domain===config.domain;
      const difficultyMatch=config.difficulty==="all"||q.difficulty===config.difficulty;
      const accessMatch=ignorePlan||plan==="pro"||q.access==="Free";
      return categoryMatch&&domainMatch&&difficultyMatch&&accessMatch;
    });
  }

  function updateAvailability(){
    customLabel.hidden=countEl.value!=="custom";
    const config={category:categoryEl.value,domain:domainEl.value,difficulty:difficultyEl.value};
    const available=poolFor(config).length;
    const plan=window.Tuto.getPlan();
    const request=requestedCount();
    let message=`${available} questions are available for the current filters on the ${plan==="pro"?"Pro preview":"Free"} plan.`;
    if(plan!=="pro"&&request>50) message+=` Free preview sets are limited to 50 items; activate Pro preview for 100- and 200-item sets.`;
    else if(request>available) message+=` The generated set will be capped at ${available}.`;
    availability.textContent=message;
  }

  [categoryEl,countEl,customCount,difficultyEl].forEach(el=>el.addEventListener("change",updateAvailability));
  customCount.addEventListener("input",updateAvailability);
  categoryEl.addEventListener("change",updateDomains);
  window.addEventListener("tutodemy-plan-change",updateAvailability);
  updateDomains();

  function getActive(){ return window.Tuto.storage.get("tutodemyActiveSession",null); }
  function saveActive(){
    if(!session) return;
    session.updatedAt=new Date().toISOString();
    window.Tuto.storage.set("tutodemyActiveSession",session);
    window.TutoCloud?.saveActiveSession?.(session).catch(error=>console.error("Active-session sync failed:",error));
  }
  function updateResume(){
    const active=getActive();
    resumeCard.hidden=!active;
    if(active){
      document.querySelector("#resume-description").textContent=`${active.modeLabel} · ${active.category} · ${active.items.length} items · question ${active.current+1}`;
    }
  }
  updateResume();

  document.querySelector("#resume-session").addEventListener("click",()=>{
    session=getActive();
    if(!session) return;
    showExam();
    startTimer();
  });
  document.querySelector("#discard-session").addEventListener("click",()=>{
    window.Tuto.storage.remove("tutodemyActiveSession");
    window.TutoCloud?.clearActiveSession?.().catch(error=>console.error("Cloud active-session deletion failed:",error));
    updateResume();window.Tuto.toast("Unfinished attempt discarded.");
  });

  function sampleBalanced(pool,count,category){
    if(category!=="Mixed") return window.Tuto.shuffle(pool).slice(0,count);
    const per=Math.floor(count/categories.length),remainder=count%categories.length;
    let selected=[];
    categories.forEach((cat,index)=>{
      const n=per+(index<remainder?1:0);
      selected.push(...window.Tuto.shuffle(pool.filter(q=>q.category===cat)).slice(0,n));
    });
    if(selected.length<count){
      const used=new Set(selected.map(q=>q.id));
      selected.push(...window.Tuto.shuffle(pool.filter(q=>!used.has(q.id))).slice(0,count-selected.length));
    }
    return window.Tuto.shuffle(selected);
  }

  function automaticMinutes(count,mode){
    if(mode==="practice") return 0;
    const secondsPer=mode==="mock"?54:60;
    return Math.min(180,Math.max(10,Math.ceil(count*secondsPer/60)));
  }

  function createSession(config, fixedIds=null){
    const plan=window.Tuto.getPlan();
    if(plan!=="pro"&&config.count>50){
      window.Tuto.toast("Activate the Pro preview for sets above 50 items.");
      location.href="pricing.html";
      return null;
    }
    let pool=fixedIds?fixedIds.map(id=>byId[id]).filter(Boolean):poolFor(config);
    if(!pool.length){ window.Tuto.toast("No questions match those filters."); return null; }
    const actual=Math.min(config.count,pool.length);
    const selected=fixedIds?pool.slice(0,actual):sampleBalanced(pool,actual,config.category);
    const timeMinutes=config.time==="auto"?automaticMinutes(actual,config.mode):Number(config.time);
    const now=Date.now();
    return {
      id:`attempt-${now}`,
      createdAt:new Date(now).toISOString(),
      category:config.category,
      domain:config.domain,
      difficulty:config.difficulty,
      mode:config.mode,
      modeLabel:modeLabels[config.mode],
      requestedCount:config.count,
      items:selected.map(q=>({
        id:q.id,
        choiceOrder:config.shuffle?window.Tuto.shuffle(q.choices.map(c=>c.id)):q.choices.map(c=>c.id)
      })),
      answers:{},
      flagged:[],
      checked:[],
      current:0,
      startedAt:now,
      timeLimitSeconds:timeMinutes*60,
      remainingSeconds:timeMinutes*60,
      elapsedSeconds:0,
      submitted:false
    };
  }

  form.addEventListener("submit",e=>{
    e.preventDefault();
    const config={
      category:categoryEl.value,domain:domainEl.value,mode:modeEl.value,
      count:requestedCount(),difficulty:difficultyEl.value,time:timeEl.value,
      shuffle:shuffleEl.checked
    };
    session=createSession(config);
    if(!session) return;
    saveActive();showExam();startTimer();
  });

  function showExam(){
    builderView.hidden=true;resultsView.hidden=true;examView.hidden=false;
    document.querySelector("#exam-mode-label").textContent=session.modeLabel;
    document.querySelector("#exam-title").textContent=`${session.category}${session.domain!=="all"?" · "+session.domain:""} · ${session.items.length} items`;
    buildNavigator();renderQuestion();updateTimerDisplay();
  }

  function currentQuestion(){
    return byId[session.items[session.current].id];
  }

  function buildNavigator(){
    const nav=document.querySelector("#navigator-grid");
    nav.innerHTML=session.items.map((item,i)=>`<button type="button" data-index="${i}">${i+1}</button>`).join("");
    nav.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      session.current=Number(btn.dataset.index);saveActive();renderQuestion();
    }));
    refreshNavigator();
  }

  function refreshNavigator(){
    document.querySelectorAll("#navigator-grid button").forEach((btn,i)=>{
      const qid=session.items[i].id;
      btn.className="";
      if(i===session.current) btn.classList.add("current");
      if(session.answers[qid]) btn.classList.add("answered");
      if(session.flagged.includes(qid)) btn.classList.add("flagged");
    });
    const answeredCount=Object.keys(session.answers).length;
    document.querySelector("#exam-progress-label").textContent=`Question ${session.current+1} of ${session.items.length}`;
    document.querySelector("#answered-label").textContent=`${answeredCount} answered · ${session.flagged.length} flagged`;
  }

  function renderQuestion(){
    const q=currentQuestion(),item=session.items[session.current];
    document.querySelector("#question-domain").textContent=`${q.category} · ${q.domain} · ${q.topic}`;
    document.querySelector("#question-difficulty").textContent=`${q.difficulty} · ${q.access}`;
    document.querySelector("#question-stem").textContent=q.stem;

    const passageBox=document.querySelector("#passage-box");
    if(q.passage_id&&passages[q.passage_id]){
      const p=passages[q.passage_id];
      passageBox.hidden=false;
      passageBox.innerHTML=`<h3>${window.Tuto.escape(p.title)}</h3><div>${window.Tuto.escape(p.text)}</div>`;
    } else { passageBox.hidden=true;passageBox.innerHTML=""; }

    const stimulusBox=document.querySelector("#stimulus-box");
    if(q.stimulus){ stimulusBox.hidden=false;stimulusBox.innerHTML=q.stimulus; }
    else { stimulusBox.hidden=true;stimulusBox.innerHTML=""; }

    const choiceMap=Object.fromEntries(q.choices.map(c=>[c.id,c]));
    const selected=session.answers[q.id];
    document.querySelector("#answer-list").innerHTML=item.choiceOrder.map((cid,index)=>{
      const c=choiceMap[cid],visual=c.html?`<div class="visual-choice">${c.html}</div>`:`<span>${window.Tuto.escape(c.text)}</span>`;
      const displayLabel=String.fromCharCode(65+index);
      return `<label class="answer-option ${selected===cid?"selected":""}" data-choice="${cid}"><input type="radio" name="answer" value="${cid}" ${selected===cid?"checked":""}><i>${displayLabel}</i>${visual}</label>`;
    }).join("");
    document.querySelectorAll(".answer-option").forEach(label=>label.addEventListener("click",()=>{
      if(session.mode==="practice"&&session.checked.includes(q.id)) return;
      session.answers[q.id]=label.dataset.choice;
      document.querySelectorAll(".answer-option").forEach(x=>x.classList.toggle("selected",x.dataset.choice===label.dataset.choice));
      saveActive();refreshNavigator();
    }));

    const feedback=document.querySelector("#feedback-box");
    const checked=session.checked.includes(q.id);
    if(session.mode==="practice"&&checked) renderFeedback(q);
    else { feedback.hidden=true;feedback.className="feedback-box";feedback.innerHTML=""; }

    document.querySelector("#previous-question").disabled=session.current===0;
    const flag=document.querySelector("#flag-question");
    flag.textContent=session.flagged.includes(q.id)?"★ Flagged for review":"☆ Flag for review";
    const action=document.querySelector("#check-or-next");
    if(session.mode==="practice"){
      action.textContent=checked?(session.current===session.items.length-1?"Finish attempt":"Next question"):"Check answer";
    } else {
      action.textContent=session.current===session.items.length-1?"Finish attempt":"Next question";
    }
    refreshNavigator();
  }

  function renderFeedback(q){
    const box=document.querySelector("#feedback-box"),answer=session.answers[q.id];
    const correct=answer===q.correct_choice;
    box.hidden=false;box.className=`feedback-box ${correct?"correct":"incorrect"}`;
    const item=session.items[session.current];
    const correctLabel=String.fromCharCode(65+item.choiceOrder.indexOf(q.correct_choice));
    const steps=q.steps?.length?`<ol>${q.steps.map(s=>`<li>${window.Tuto.escape(s)}</li>`).join("")}</ol>`:"";
    box.innerHTML=`<b>${correct?"Correct.":`Not quite. Correct answer: ${correctLabel}`}</b>${steps}<p>${window.Tuto.escape(q.rationale)}</p>${q.takeaway?`<small><b>Takeaway:</b> ${window.Tuto.escape(q.takeaway)}</small>`:""}`;
  }

  document.querySelector("#previous-question").addEventListener("click",()=>{
    if(session.current>0){session.current--;saveActive();renderQuestion();}
  });
  document.querySelector("#flag-question").addEventListener("click",()=>{
    const id=currentQuestion().id;
    session.flagged=session.flagged.includes(id)?session.flagged.filter(x=>x!==id):[...session.flagged,id];
    saveActive();renderQuestion();
  });
  document.querySelector("#check-or-next").addEventListener("click",()=>{
    const q=currentQuestion();
    if(session.mode==="practice"&&!session.checked.includes(q.id)){
      if(!session.answers[q.id]){window.Tuto.toast("Choose an answer first.");return;}
      session.checked.push(q.id);saveActive();renderQuestion();return;
    }
    if(session.current===session.items.length-1){submitSession();return;}
    session.current++;saveActive();renderQuestion();
  });
  document.querySelector("#exam-submit").addEventListener("click",()=>{
    if(confirm(`Submit this attempt? ${session.items.length-Object.keys(session.answers).length} questions are unanswered.`)) submitSession();
  });
  document.querySelector("#exam-exit").addEventListener("click",()=>{
    saveActive();
    if(confirm("Exit to the Practice Hub? Your active attempt will remain saved.")) location.href="exams.html";
  });

  function startTimer(){
    clearInterval(timerId);
    if(!session.timeLimitSeconds){updateTimerDisplay();return;}
    let last=Date.now();
    timerId=setInterval(()=>{
      const now=Date.now(),delta=Math.floor((now-last)/1000);
      if(delta<1) return;
      last+=delta*1000;
      session.remainingSeconds=Math.max(0,session.remainingSeconds-delta);
      session.elapsedSeconds+=delta;
      updateTimerDisplay();
      if([1800,600,300,60].includes(session.remainingSeconds)){
        window.Tuto.toast(`${window.Tuto.formatTime(session.remainingSeconds)} remaining.`);
      }
      if(now-lastTimerSave>5000){saveActive();lastTimerSave=now;}
      if(session.remainingSeconds<=0){clearInterval(timerId);window.Tuto.toast("Time is up. The attempt was submitted.");submitSession(true);}
    },500);
  }

  function updateTimerDisplay(){
    const el=document.querySelector("#timer");
    if(!session?.timeLimitSeconds){el.textContent="No timer";el.className="timer";return;}
    el.textContent=window.Tuto.formatTime(session.remainingSeconds);
    el.className="timer";
    if(session.remainingSeconds<=60) el.classList.add("critical");
    else if(session.remainingSeconds<=600) el.classList.add("warning");
  }

  function calculateResult(){
    const details=session.items.map(item=>{
      const q=byId[item.id],chosen=session.answers[q.id]||null;
      return {id:q.id,category:q.category,domain:q.domain,topic:q.topic,difficulty:q.difficulty,chosen,correctChoice:q.correct_choice,correct:chosen===q.correct_choice};
    });
    const correct=details.filter(x=>x.correct).length,total=details.length;
    const elapsed=session.timeLimitSeconds?session.timeLimitSeconds-session.remainingSeconds:Math.floor((Date.now()-session.startedAt)/1000);
    const domains={};
    const categoryBreakdown={};
    details.forEach(d=>{
      domains[d.domain]??={correct:0,total:0,category:d.category};
      domains[d.domain].total++; if(d.correct) domains[d.domain].correct++;
      categoryBreakdown[d.category]??={correct:0,total:0};
      categoryBreakdown[d.category].total++; if(d.correct) categoryBreakdown[d.category].correct++;
    });
    return {
      attemptId:session.id,category:session.category,domain:session.domain,mode:session.mode,modeLabel:session.modeLabel,
      correct,total,accuracy:Math.round(correct/total*100),elapsedSeconds:elapsed,averageSeconds:Math.round(elapsed/total),
      flagged:session.flagged.length,completedAt:new Date().toISOString(),details,domains,categoryBreakdown
    };
  }

  function submitSession(auto=false){
    if(!session||session.submitted) return;
    clearInterval(timerId);session.submitted=true;
    lastResult=calculateResult();
    const history=window.Tuto.storage.get("tutodemyHistory",[]);
    history.unshift({...lastResult,details:undefined,domains:lastResult.domains});
    window.Tuto.storage.set("tutodemyHistory",history.slice(0,100));
    window.TutoCloud?.saveAttempt?.(lastResult).catch(error=>console.error("Attempt sync failed:",error));
    window.Tuto.storage.remove("tutodemyActiveSession");
    window.TutoCloud?.clearActiveSession?.().catch(error=>console.error("Cloud active-session deletion failed:",error));
    examView.hidden=true;builderView.hidden=true;resultsView.hidden=false;
    renderResults(auto);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderResults(auto){
    const r=lastResult;
    document.querySelector("#result-score").textContent=`${r.correct} / ${r.total}`;
    document.querySelector("#result-summary").textContent=`${auto?"Automatically submitted when time expired. ":""}You answered ${r.accuracy}% correctly in ${window.Tuto.formatTime(r.elapsedSeconds)}.`;
    document.querySelector("#result-accuracy").textContent=`${r.accuracy}%`;
    document.querySelector("#result-time").textContent=window.Tuto.formatTime(r.elapsedSeconds);
    document.querySelector("#result-average-time").textContent=`${r.averageSeconds} s`;
    document.querySelector("#result-flagged").textContent=r.flagged;
    document.querySelector("#result-domains").innerHTML=Object.entries(r.domains).sort((a,b)=>a[0].localeCompare(b[0])).map(([domain,s])=>{
      const pct=Math.round(s.correct/s.total*100);
      return `<div class="performance-row"><b>${domain} · ${s.category}</b><span>${s.correct}/${s.total} · ${pct}%</span><div class="performance-bar"><i style="width:${pct}%"></i></div></div>`;
    }).join("");
    const weak=Object.entries(r.domains).map(([domain,s])=>({domain,...s,pct:Math.round(s.correct/s.total*100)})).sort((a,b)=>a.pct-b.pct).slice(0,4);
    document.querySelector("#remediation-list").innerHTML=weak.map(w=>`<a href="reviewers.html"><b>${w.category} · ${w.domain}</b><span>${w.pct}% accuracy — review this domain, then generate another set.</span></a>`).join("");
    document.querySelector("#review-list").hidden=true;
    document.querySelector("#review-list").innerHTML="";
    document.querySelector("#retry-incorrect").disabled=!r.details.some(d=>!d.correct);
  }

  function buildReview(){
    const container=document.querySelector("#review-list");
    container.hidden=false;
    container.innerHTML=lastResult.details.map((d,index)=>{
      const q=byId[d.id],item=session.items.find(x=>x.id===q.id);
      const order=item?.choiceOrder||q.choices.map(c=>c.id);
      const choices=Object.fromEntries(q.choices.map(c=>[c.id,c]));
      return `<article class="review-card ${d.correct?"correct":"incorrect"}">
        <small>${index+1}. ${q.category} · ${q.domain} · ${q.topic}</small><h3>${window.Tuto.escape(q.stem)}</h3>
        ${q.stimulus?`<div class="stimulus-box">${q.stimulus}</div>`:""}
        ${order.map((cid,index)=>{const c=choices[cid],label=String.fromCharCode(65+index);return `<div class="review-answer ${d.chosen===cid?"chosen":""} ${q.correct_choice===cid?"right":""}"><b>${label}.</b> ${c.html||window.Tuto.escape(c.text)}</div>`}).join("")}
        <p><b>${d.correct?"Correct.":`Correct answer: ${String.fromCharCode(65+order.indexOf(q.correct_choice))}`}</b> ${window.Tuto.escape(q.rationale)}</p>
        ${q.takeaway?`<small><b>Takeaway:</b> ${window.Tuto.escape(q.takeaway)}</small>`:""}
      </article>`;
    }).join("");
    container.scrollIntoView({behavior:"smooth"});
  }

  document.querySelector("#review-results").addEventListener("click",buildReview);
  document.querySelector("#retry-incorrect").addEventListener("click",()=>{
    const ids=lastResult.details.filter(d=>!d.correct).map(d=>d.id);
    if(!ids.length) return;
    const first=byId[ids[0]];
    session=createSession({category:first.category,domain:"all",difficulty:"all",mode:"practice",count:ids.length,time:"0",shuffle:true},ids);
    if(session){saveActive();resultsView.hidden=true;showExam();}
  });
  document.querySelector("#new-attempt").addEventListener("click",()=>{
    session=null;lastResult=null;resultsView.hidden=true;builderView.hidden=false;updateResume();window.scrollTo({top:0,behavior:"smooth"});
  });

  window.addEventListener("beforeunload",saveActive);
});
