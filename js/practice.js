
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
  let submissionInProgress=false;

  categoryEl.innerHTML=`<option value="Mixed">Mixed — all four banks</option>`+categories.map(c=>`<option value="${c}">${c}</option>`).join("");

  const params=new URLSearchParams(location.search);
  const requestedCategory=params.get("category");
  const requestedDomainParam=params.get("domain");
  const requestedFocus=(params.get("focus")||"").trim();
  const requestedTopicValues=(params.get("topics")||"")
    .split("|")
    .map(value=>value.trim())
    .filter(Boolean);

  if(requestedCategory&&[...categories,"Mixed"].includes(requestedCategory)){
    categoryEl.value=requestedCategory;
  }

  function updateDomains(){
    const category=categoryEl.value;
    domainEl.innerHTML=`<option value="all">All domains</option>`;
    if(category!=="Mixed"){
      (window.TUTODEMY_TAXONOMY[category]||[]).forEach(d=>domainEl.insertAdjacentHTML("beforeend",`<option value="${d.id}">${d.id} — ${d.title}</option>`));
    }
    if(
      requestedDomainParam &&
      [...domainEl.options].some(o=>o.value===requestedDomainParam)
    ){
      domainEl.value=requestedDomainParam;
    }
    updateAvailability();
  }

  function requestedCount(){
    return countEl.value==="custom"?Math.max(1,Math.min(220,Number(customCount.value)||20)):Number(countEl.value);
  }

  function topicFocusApplies(config){
    return Boolean(
      requestedTopicValues.length &&
      requestedCategory &&
      requestedDomainParam &&
      config.category===requestedCategory &&
      config.domain===requestedDomainParam
    );
  }

  function poolFor(config){
    const focused=topicFocusApplies(config);

    return questions.filter(q=>{
      const categoryMatch=
        config.category==="Mixed"||
        q.category===config.category;

      const domainMatch=
        config.category==="Mixed"||
        config.domain==="all"||
        q.domain===config.domain;

      const difficultyMatch=
        config.difficulty==="all"||
        q.difficulty===config.difficulty;

      const topicMatch=
        !focused||
        requestedTopicValues.includes(q.topic);

      return (
        categoryMatch &&
        domainMatch &&
        difficultyMatch &&
        topicMatch
      );
    });
  }

  function updateAvailability(){
    customLabel.hidden=countEl.value!=="custom";
    const config={category:categoryEl.value,domain:domainEl.value,difficulty:difficultyEl.value};
    const available=poolFor(config).length;
    const request=requestedCount();
    const focused=topicFocusApplies(config);

    let message=focused
      ? `${requestedFocus||"Selected topic"} · ${available} questions available.`
      : `${available} questions are available for the current filters.`;

    if(request>available){
      message+=` The generated set will be capped at ${available}.`;
    }

    availability.textContent=message;
  }

  [categoryEl,countEl,customCount,difficultyEl].forEach(el=>el.addEventListener("change",updateAvailability));
  customCount.addEventListener("input",updateAvailability);
  categoryEl.addEventListener("change",updateDomains);
  window.addEventListener("tutodemy-plan-change",updateAvailability);
  updateDomains();

  function getActive(){
    const active=window.Tuto.storage.get(
      "tutodemyActiveSession",
      null
    );

    // Older builds could re-save an already completed attempt
    // during beforeunload. Remove that stale lock automatically.
    if(active?.submitted){
      try{
        window.Tuto.storage.remove(
          "tutodemyActiveSession"
        );
      }catch(error){
        console.error(
          "Stale active-session cleanup failed:",
          error
        );
      }

      window.TutoCloud
        ?.clearActiveSession?.()
        .catch(error=>
          console.error(
            "Cloud stale-session cleanup failed:",
            error
          )
        );

      return null;
    }

    return active;
  }

  function saveActive(){
    // Never recreate a completed attempt as an active session.
    if(!session||session.submitted) return;

    session.updatedAt=
      new Date().toISOString();

    try{
      window.Tuto.storage.set(
        "tutodemyActiveSession",
        session
      );
    }catch(error){
      console.error(
        "Active-session local save failed:",
        error
      );
    }

    window.TutoCloud
      ?.saveActiveSession?.(session)
      .catch(error=>
        console.error(
          "Active-session sync failed:",
          error
        )
      );
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
      topicFocus:topicFocusApplies(config)
        ? (requestedFocus||null)
        : null,
      topicValues:topicFocusApplies(config)
        ? [...requestedTopicValues]
        : [],
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
    document.querySelector("#exam-title").textContent=
      `${session.category}`+
      `${session.domain!=="all"?" · "+session.domain:""}`+
      `${session.topicFocus?" · "+session.topicFocus:""}`+
      ` · ${session.items.length} items`;
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
    document.querySelector("#question-difficulty").textContent=q.difficulty;
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
    if(!session?.items?.length){
      throw new Error(
        "This attempt has no questions. Start a new practice set."
      );
    }

    const missingIds=[];
    const details=[];

    session.items.forEach(item=>{
      const q=byId[item?.id];

      if(!q){
        missingIds.push(item?.id||"unknown");
        return;
      }

      const chosen=
        session.answers?.[q.id]||null;

      details.push({
        id:q.id,
        category:q.category,
        domain:q.domain,
        topic:q.topic,
        difficulty:q.difficulty,
        chosen,
        correctChoice:q.correct_choice,
        correct:chosen===q.correct_choice
      });
    });

    if(missingIds.length){
      throw new Error(
        "Some questions in this attempt are no longer available. " +
        "Your answers are still saved. Refresh the page or start a new set."
      );
    }

    const correct=
      details.filter(x=>x.correct).length;
    const total=details.length;

    if(!total){
      throw new Error(
        "The result could not be calculated. Your answers are still saved."
      );
    }

    const elapsed=session.timeLimitSeconds
      ? Math.max(
          0,
          Number(session.timeLimitSeconds)-
          Number(session.remainingSeconds||0)
        )
      : Math.max(
          0,
          Math.floor(
            (
              Date.now()-
              Number(session.startedAt||Date.now())
            )/1000
          )
        );

    const domains={};
    const categoryBreakdown={};

    details.forEach(d=>{
      domains[d.domain]??={
        correct:0,
        total:0,
        category:d.category
      };

      domains[d.domain].total++;
      if(d.correct){
        domains[d.domain].correct++;
      }

      categoryBreakdown[d.category]??={
        correct:0,
        total:0
      };

      categoryBreakdown[d.category].total++;
      if(d.correct){
        categoryBreakdown[d.category].correct++;
      }
    });

    return {
      attemptId:session.id,
      category:session.category,
      domain:session.domain,
      mode:session.mode,
      modeLabel:session.modeLabel,
      correct,
      total,
      accuracy:Math.round(correct/total*100),
      elapsedSeconds:elapsed,
      averageSeconds:Math.round(elapsed/total),
      flagged:Array.isArray(session.flagged)
        ? session.flagged.length
        : 0,
      completedAt:new Date().toISOString(),
      details,
      domains,
      categoryBreakdown
    };
  }


  function setSubmitBusy(busy){
    const toolbarButton=
      document.querySelector("#exam-submit");
    const nextButton=
      document.querySelector("#check-or-next");

    if(toolbarButton){
      toolbarButton.disabled=busy;
      toolbarButton.textContent=
        busy ? "Finishing…" : "Submit";
    }

    if(nextButton){
      nextButton.disabled=busy;

      if(
        !busy &&
        session &&
        !examView.hidden
      ){
        // Restore Check / Next / Finish label after a retry.
        renderQuestion();
      }
    }
  }

  function persistCompletedResult(result){
    let localHistorySaved=true;

    try{
      const history=
        window.Tuto.storage.get(
          "tutodemyHistory",
          []
        );

      const safeHistory=
        Array.isArray(history)
          ? history
          : [];

      safeHistory.unshift({
        ...result,
        details:undefined,
        domains:result.domains
      });

      window.Tuto.storage.set(
        "tutodemyHistory",
        safeHistory.slice(0,100)
      );
    }catch(error){
      localHistorySaved=false;
      console.error(
        "Attempt history save failed:",
        error
      );
    }

    // Cloud sync is best-effort and must never block Results.
    window.TutoCloud
      ?.saveAttempt?.(result)
      .catch(error=>
        console.error(
          "Attempt sync failed:",
          error
        )
      );

    return localHistorySaved;
  }

  function clearCompletedActiveSession(){
    try{
      window.Tuto.storage.remove(
        "tutodemyActiveSession"
      );
    }catch(error){
      console.error(
        "Active-session cleanup failed:",
        error
      );
    }

    window.TutoCloud
      ?.clearActiveSession?.()
      .catch(error=>
        console.error(
          "Cloud active-session deletion failed:",
          error
        )
      );
  }

  function submitSession(auto=false){
    if(!session||submissionInProgress){
      return;
    }

    // Recover attempts locked by the older submit bug.
    if(session.submitted&&!examView.hidden){
      session.submitted=false;
    }

    if(session.submitted){
      return;
    }

    submissionInProgress=true;
    setSubmitBusy(true);

    const timerWasRunning=
      Boolean(timerId);

    clearInterval(timerId);

    try{
      // Calculate + render BEFORE committing the submitted flag.
      const result=calculateResult();

      lastResult=result;
      renderResults(auto);

      examView.hidden=true;
      builderView.hidden=true;
      resultsView.hidden=false;

      // Commit only after the result is successfully usable.
      session.submitted=true;

      const historySaved=
        persistCompletedResult(result);

      clearCompletedActiveSession();

      if(!historySaved){
        window.Tuto.toast(
          "Attempt finished. Local history could not be saved on this device."
        );
      }

      window.scrollTo({
        top:0,
        behavior:"smooth"
      });
    }catch(error){
      console.error(
        "Attempt submission failed:",
        error
      );

      // Never leave a failed submit permanently locked.
      session.submitted=false;
      lastResult=null;

      try{
        saveActive();
      }catch(saveError){
        console.error(
          "Attempt recovery save failed:",
          saveError
        );
      }

      examView.hidden=false;
      resultsView.hidden=true;

      window.Tuto.toast(
        error?.message||
        "The attempt could not be finished. Your answers are still saved."
      );

      if(
        auto &&
        session.timeLimitSeconds &&
        session.remainingSeconds<=0
      ){
        // Keep the attempt open for a manual retry instead of
        // immediately auto-submitting in a loop.
        session.remainingSeconds=1;
        updateTimerDisplay();
      }else if(timerWasRunning){
        startTimer();
      }
    }finally{
      submissionInProgress=false;
      setSubmitBusy(false);
    }
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

  window.addEventListener("beforeunload",()=>{
    if(session&&!session.submitted){
      saveActive();
    }
  });
});
