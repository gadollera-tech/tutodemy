
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const id=new URLSearchParams(location.search).get("id")||"math-m1";
  const r=window.TUTODEMY_REVIEWERS.find(x=>x.id===id)||window.TUTODEMY_REVIEWERS[0];
  document.title=`${r.title} | TutoDemy Learning PH`;
  document.querySelector("#reader-meta").textContent=r.category;
  document.querySelector("#reader-title").textContent=r.title;
  document.querySelector("#reader-summary").textContent=r.summary;
  document.querySelector("#reader-badge").textContent=r.domain;
  document.querySelector("#reader-points").innerHTML=r.points.map((p,i)=>`<div class="reader-point"><span>${i+1}</span><p>${p}</p></div>`).join("");
  const practice=document.querySelector("#practice-reviewer");
  practice.href=`practice.html?category=${encodeURIComponent(r.category)}&domain=${encodeURIComponent(r.domain)}`;

  const guideSection=document.querySelector("#high-yield-guide");
  const guideNav=document.querySelector("#high-yield-guide-nav");
  const guideIntro=document.querySelector("#high-yield-intro");
  const guideConcepts=document.querySelector("#high-yield-concepts");
  const quickRecall=document.querySelector("#module-quick-recall");
  const moduleChecklist=document.querySelector("#module-checklist");

  const guide=r.studyGuide;

  if(guide?.highYield?.length){
    guideSection.hidden=false;
    guideNav.hidden=false;
    guideIntro.textContent=guide.intro||"";

    guideConcepts.innerHTML=guide.highYield.map((concept,index)=>{
      const points=(concept.points||[])
        .map(point=>`<li>${window.Tuto.escape(point)}</li>`)
        .join("");

      const steps=(concept.example?.steps||[])
        .map((step,stepIndex)=>`
          <li>
            <span>${stepIndex+1}</span>
            <p>${window.Tuto.escape(step)}</p>
          </li>`)
        .join("");

      return `<article class="high-yield-concept">
        <header class="high-yield-concept-head">
          <span>${index+1}</span>
          <h3>${window.Tuto.escape(concept.title)}</h3>
        </header>

        <ul class="high-yield-point-list">${points}</ul>

        ${concept.formula?`
          <div class="formula-strip">
            <small>KEY RULE / FORMULA</small>
            <b>${window.Tuto.escape(concept.formula)}</b>
          </div>`:""}

        ${concept.example?`
          <div class="worked-example">
            <span class="eyebrow">WORKED EXAMPLE</span>
            <p class="worked-example-question">
              ${window.Tuto.escape(concept.example.question||"")}
            </p>
            <ol>${steps}</ol>
            <p class="worked-example-answer">
              <b>Answer:</b>
              ${window.Tuto.escape(concept.example.answer||"")}
            </p>
          </div>`:""}

        ${concept.trap?`
          <div class="common-trap">
            <span aria-hidden="true">!</span>
            <p><b>Common trap</b>${window.Tuto.escape(concept.trap)}</p>
          </div>`:""}
      </article>`;
    }).join("");

    quickRecall.innerHTML=(guide.quickRecall||[])
      .map(question=>`<li>${window.Tuto.escape(question)}</li>`)
      .join("");

    moduleChecklist.innerHTML=(guide.checklist||[])
      .map(item=>`
        <li>
          <span class="check-box" aria-hidden="true"></span>
          <span>${window.Tuto.escape(item)}</span>
        </li>`)
      .join("");
  }else{
    guideSection.hidden=true;
    guideNav.hidden=true;
  }

  const videoSection=document.querySelector("#video-lessons");
  const videoNav=document.querySelector("#video-lessons-nav");
  const topicGrid=document.querySelector("#reviewer-topic-grid");

  function topicPracticeUrl(topic){
    const params=new URLSearchParams({
      category:r.category,
      domain:r.domain,
      focus:topic.title,
      topics:topic.questionTopics.join("|")
    });

    return `practice.html?${params.toString()}`;
  }

  if(Array.isArray(r.topics)&&r.topics.length){
    videoSection.hidden=false;
    videoNav.hidden=false;

    topicGrid.innerHTML=r.topics.map((topic,index)=>{
      const video=topic.video||{};
      const questionLabel=
        `${topic.questionCount||0} practice question${
          Number(topic.questionCount)===1?"":"s"
        }`;

      return `<article class="reviewer-topic-card">
        <header class="reviewer-topic-card-head">
          <span class="reviewer-topic-number">${index+1}</span>
          <div>
            <h3>${window.Tuto.escape(topic.title)}</h3>
            <small>${window.Tuto.escape(questionLabel)}</small>
          </div>
        </header>

        <p>${window.Tuto.escape(topic.summary||"")}</p>

        <a
          class="reviewer-video-card"
          href="${window.Tuto.escape(video.url||"#")}"
          target="_blank"
          rel="noopener noreferrer external"
          aria-label="Watch ${window.Tuto.escape(video.title||topic.title)} on YouTube">
          <span class="reviewer-video-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 7.5v9l7-4.5z"></path>
            </svg>
          </span>
          <span class="reviewer-video-copy">
            <small>Recommended video</small>
            <b>${window.Tuto.escape(video.title||topic.title)}</b>
            <span>${window.Tuto.escape(video.channel||"YouTube")} · YouTube</span>
          </span>
          <span class="reviewer-video-open" aria-hidden="true">↗</span>
        </a>

        <a
          class="button button-outline reviewer-topic-practice"
          href="${topicPracticeUrl(topic)}">
          Practice this topic
        </a>
      </article>`;
    }).join("");
  }else{
    videoSection.hidden=true;
    videoNav.hidden=true;
  }
  const save=document.querySelector("#save-reviewer");
  const refresh=()=>save.textContent=window.Tuto.getSavedReviewers().includes(r.id)?"★ Saved reviewer":"☆ Save reviewer";
  save.addEventListener("click",()=>{const s=window.Tuto.toggleReviewer(r.id);window.Tuto.toast(s?"Reviewer saved.":"Reviewer removed.");refresh();});
  refresh();
});
