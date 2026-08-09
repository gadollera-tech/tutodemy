document.addEventListener("DOMContentLoaded", () => {
  window.TutoLocationMap?.mount({
    svg: "#tutor-demand-map",
    summary: "#tutor-demand-summary",
    list: "#tutor-demand-list",
    layer: "learners"
  });
});
